"""Seed the demo marketplace (apps/demo/data.py): `python manage.py seed_demo [--reset]`.

Idempotent with --reset, which removes only demo records (known emails, organization names, slugs)
before recreating them. No email is sent: notifications are written as in-app records directly.
"""

from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.carts.models import Cart, CartLine
from apps.catalog import contracts
from apps.catalog.models import Category, CategoryContract, Product, Variant
from apps.demo import catalogue, data, products
from apps.media.models import FileAsset
from apps.media.services import store
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import ensure_preferences
from apps.orders.models import Order, OrderLine
from apps.organizations.models import Address, Membership, Organization
from apps.sellers.models import SellerDocument, SellerProfile, SellerStatusChange
from core.richtext import sanitize

AVATARS = Path(__file__).resolve().parents[2] / "avatars"


def demo_pdf(title: str) -> bytes:
    """A one-page PDF that says plainly it is demo material."""
    text = f"SokoMesh demo document: {title}. Invented for the demo; not a real certificate."
    text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = f"BT /F1 13 Tf 64 760 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = b"%PDF-1.4\n", []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{o:010d} 00000 n \n".encode() for o in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return out


class Command(BaseCommand):
    help = (
        "Seed the demo marketplace: organizations, people, documents, category contracts, products and "
        "variants, a cart, order history and notifications."
    )

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--reset", action="store_true", help="Remove existing demo records first.")

    def handle(self, *args: Any, reset: bool = False, **options: Any) -> None:
        emails = [a["email"] for a in data.ACCOUNTS]
        if User.objects.filter(email__in=emails).exists():
            if not reset:
                raise CommandError("Demo data is already there. Run with --reset to rebuild it.")
            self.remove()
        with transaction.atomic():
            self.build()
        self.stdout.write(
            self.style.SUCCESS(f"Seeded {len(data.ACCOUNTS)} demo accounts. Password: {data.DEMO_PASSWORD}")
        )

    def remove(self) -> None:
        names = [o["name"] for o in data.ORGANIZATIONS]
        orgs = Organization.objects.filter(name__in=names)
        users = User.objects.filter(memberships__organization__in=orgs) | User.objects.filter(
            email__in=[a["email"] for a in data.ACCOUNTS]
        )
        Order.objects.filter(buyer_organization__in=orgs).delete()
        Cart.objects.filter(buyer_organization__in=orgs).delete()
        Product.objects.filter(seller__in=orgs).delete()
        demo_categories = Category.objects.filter(slug__in=[c[0] for c in data.CATEGORIES])
        CategoryContract.objects.filter(category__in=demo_categories).update(predecessor=None)
        CategoryContract.objects.filter(category__in=demo_categories).delete()
        demo_categories.delete()
        SellerDocument.objects.filter(seller_organization__in=orgs).delete()
        assets = FileAsset.objects.filter(organization__in=orgs) | FileAsset.objects.filter(uploaded_by__in=users)
        for asset in assets.distinct():
            asset.file.delete(save=False)
        assets.delete()
        users.distinct().delete()
        orgs.delete()

    def build(self) -> None:
        now = timezone.now()
        orgs: dict[str, Organization] = {}
        for o in data.ORGANIZATIONS:
            orgs[o["key"]] = Organization.objects.create(
                name=o["name"],
                organization_type=o["type"],
                approval_state=o["approval"],
                legal_name=o.get("legal", ""),
                tax_identifier=o.get("pin", ""),
            )
        for key, rows in data.ADDRESSES.items():
            for row in rows:
                Address.objects.create(organization=orgs[key], **row)

        people: dict[str, User] = {}
        for a in data.ACCOUNTS:
            user = User.objects.create_user(a["email"], data.DEMO_PASSWORD, display_name=a["name"], phone=a["phone"])
            user.email_verified_at = now - timedelta(days=30)
            self.attach_avatar(user, a["avatar"])
            user.save()
            Membership.objects.create(organization=orgs[a["org"]], user=user, role_key=a["role"])
            ensure_preferences(user)
            people[a["email"]] = user
        amina, faith, joseph = (
            people["amina@sokomesh-demo.co.ke"],
            people["faith@mwangaza-demo.co.ke"],
            people["joseph@lakeside-demo.co.ke"],
        )
        NotificationPreference.objects.filter(
            user=people["brian@wanjiru-demo.co.ke"], channel="email", event_key="account"
        ).update(enabled=False)

        for key, s in data.SELLERS.items():
            org = orgs[key]
            status = next(o["seller"] for o in data.ORGANIZATIONS if o["key"] == key)
            rich = sanitize(s["description"])
            profile = SellerProfile.objects.create(
                organization=org,
                public_name=s["public_name"],
                description=rich.html,
                description_text=rich.text,
                support_email=s["support_email"],
                support_phone=s["support_phone"],
                activation_status="draft",
            )
            owner = joseph if key == "lakeside" else (faith if key == "mwangaza" else None)
            self.documents(org, key, owner or amina)
            submitted = now - timedelta(days=40 if status == "active" else 1)
            SellerStatusChange.objects.create(
                profile=profile, from_status="draft", to_status="under_review", actor=owner
            )
            profile.submitted_at = submitted
            if status == "active":
                SellerStatusChange.objects.create(
                    profile=profile, from_status="under_review", to_status="active", actor=amina
                )
                profile.reviewed_by, profile.reviewed_at = amina, submitted + timedelta(days=1)
            profile.activation_status = status
            profile.save()

        categories = {
            slug: Category.objects.create(slug=slug, name=name, description=desc, position=i)
            for i, (slug, name, desc) in enumerate(data.CATEGORIES)
        }
        published = self.contracts(categories, amina, now)
        items = [{**item, **catalogue.COMMERCE[item["slug"]]} for item in products.PRODUCTS] + catalogue.MORE_PRODUCTS
        for i, item in enumerate(items):
            seller, name = item["seller"], item["name"]
            rich = sanitize(item["description"])
            approved = orgs[seller].approval_state == "approved"
            status = item.get("status") or ("published" if approved else "draft")
            short = item["short"]
            product = Product(
                seller=orgs[seller],
                category_contract=published[item["category"]],
                category=categories[item["category"]],
                name=name,
                slug=item["slug"],
                brand=item["brand"],
                short_description=short,
                attributes=item["attributes"],
                primary_image=data.image(item["image"]),
                gallery=[products.photo(key) for key in item["gallery"]],
                description=rich.html,
                description_text=rich.text,
                seo_description=f"{short} From {data.SELLERS[seller]['public_name']}, priced in KES."[:160],
                status=status,
                published_at=(now - timedelta(days=40 - i, hours=i)) if status == "published" else None,
            )
            product.full_clean()
            product.save()
            for spec in item["variants"]:
                variant = Variant(
                    product=product,
                    seller=product.seller,
                    sku=spec["sku"],
                    packaging_unit=spec["unit"],
                    units_per_pack=spec["per"],
                    minimum_order_quantity=spec["moq"],
                    unit_price=spec["price"],
                    stock_on_hand=spec["stock"],
                    attributes=spec["attributes"],
                )
                variant.full_clean()
                variant.save()

        self.cart(people, orgs)
        self.orders(people, orgs, now)
        self.notifications(people, orgs, now)

    def contracts(self, categories: dict[str, Category], admin: User, now: Any) -> dict[str, CategoryContract]:
        """Each category's contract versions, oldest first; returns the published version per category."""
        published: dict[str, CategoryContract] = {}
        for slug, versions in catalogue.CONTRACTS.items():
            seller_html, buyer_html = catalogue.GUIDANCE[slug]
            seller_rich, buyer_rich = sanitize(seller_html), sanitize(buyer_html)
            previous = None
            for n, (definition, status) in enumerate(versions, 1):
                contract = CategoryContract(
                    category=categories[slug],
                    name=categories[slug].name,
                    status=status,
                    predecessor=previous,
                    seller_guidance=seller_rich.html,
                    seller_guidance_text=seller_rich.text,
                    buyer_guidance=buyer_rich.html,
                    buyer_guidance_text=buyer_rich.text,
                    published_by=admin if status != "draft" else None,
                    published_at=now - timedelta(days=90 - 30 * n) if status != "draft" else None,
                    **definition,
                )
                contract.full_clean()
                contract.save()
                if status == "published":
                    published[slug] = contract
                previous = contract
        return published

    def cart(self, people: dict[str, User], orgs: dict[str, Organization]) -> None:
        """Brian's open cart. Its first line was added before Mwangaza raised the price (explicit repricing)."""
        user = people[catalogue.CART["email"]]
        cart = Cart.objects.create(buyer_organization=orgs["wanjiru"], created_by=user)
        for sku, quantity, quoted in catalogue.CART["lines"]:
            variant = Variant.objects.select_related("product__search").get(sku=sku)
            line = CartLine(cart=cart, variant=variant, quantity=quantity, quoted_unit_price=quoted)
            line.full_clean()
            line.save()

    def orders(self, people: dict[str, User], orgs: dict[str, Organization], now: Any) -> None:
        """Wanjiru's order history: snapshots of what was ordered, at the prices of the day."""
        address = Address.objects.filter(organization=orgs["wanjiru"]).order_by("created_at").first()
        for spec in catalogue.ORDERS:
            lines = []
            for sku, quantity, price in spec["lines"]:
                variant = Variant.objects.select_related("product__category_contract").get(sku=sku)
                p = variant.product
                lines.append(
                    OrderLine(
                        variant=variant,
                        product_name_snapshot=p.name,
                        sku_snapshot=sku,
                        pack_label_snapshot=contracts.pack_label(p.category_contract, p.attributes, variant),
                        quantity_ordered=quantity,
                        unit=variant.packaging_unit,
                        unit_price=price,
                        line_total=Decimal(price) * quantity,
                    )
                )
            subtotal = sum((line.line_total for line in lines), Decimal("0"))
            order = Order.objects.create(
                order_number=spec["number"],
                buyer_organization=orgs["wanjiru"],
                seller_organization=orgs[spec["seller"]],
                submitted_by=people[spec["email"]],
                delivery_address=address,
                subtotal=subtotal,
                total=subtotal,
                status=spec["status"],
                special_instructions=spec["notes"],
                submitted_at=now - timedelta(days=spec["days_ago"]),
            )
            for line in lines:
                line.order = order
                line.save()

    def attach_avatar(self, user: User, key: str) -> None:
        for variant, attr in (("light", "avatar"), ("dark", "avatar_dark")):
            path = AVATARS / f"{key}.{variant}.webp"
            if path.exists():
                upload = SimpleUploadedFile(path.name, path.read_bytes(), "image/webp")
                setattr(user, attr, store(upload, FileAsset.Kind.AVATAR, user=None))

    def documents(self, org: Organization, key: str, uploader: User) -> None:
        names = dict(SellerDocument.Kind.choices)
        for kind, status, expires, notes in data.DOCUMENTS.get(key, []):
            upload = SimpleUploadedFile(f"{kind}-{key}.pdf", demo_pdf(f"{names[kind]}, {org.name}"), "application/pdf")
            asset = store(upload, FileAsset.Kind.DOCUMENT, user=uploader, organization=org)
            SellerDocument.objects.create(
                seller_organization=org,
                document_type=kind,
                file_asset=asset,
                verification_status=status,
                expires_at=date.fromisoformat(expires) if expires else None,
                review_notes=notes,
            )

    def notifications(self, people: dict[str, User], orgs: dict[str, Organization], now: Any) -> None:
        rows = [
            (
                "amina@sokomesh-demo.co.ke",
                "approval",
                "Lakeside Supplies applied to sell",
                "Lakeside Supplies sent its seller application with 3 documents for review.",
                f"/admin/sellers/{orgs['lakeside'].pk}",
                2,
                False,
            ),
            (
                "amina@sokomesh-demo.co.ke",
                "approval",
                "Baraka Mini-Mart is waiting for approval",
                "Baraka Mini-Mart registered as a buyer in Kericho and is waiting for review.",
                "/admin/organizations",
                5,
                False,
            ),
            (
                "faith@mwangaza-demo.co.ke",
                "approval",
                "Mwangaza Wholesalers is approved to sell",
                "You can now publish products and receive orders.",
                "/sell",
                39 * 24 * 60,
                True,
            ),
            (
                "faith@mwangaza-demo.co.ke",
                "account",
                "Peter Kamau joined Mwangaza Wholesalers Ltd",
                "Peter Kamau accepted the invitation and is now a Warehouse operator.",
                "/organization?tab=members",
                30 * 24 * 60,
                True,
            ),
            (
                "joseph@lakeside-demo.co.ke",
                "approval",
                "Your application is with the marketplace",
                "Reviews take up to 2 working days once all documents are in.",
                "/sell",
                60,
                False,
            ),
            (
                "grace@wanjiru-demo.co.ke",
                "approval",
                "Wanjiru General Stores is approved",
                "The marketplace approved Wanjiru General Stores. You can order from every approved seller.",
                "/organization",
                25 * 24 * 60,
                True,
            ),
            (
                "grace@wanjiru-demo.co.ke",
                "account",
                "Brian Otieno joined Wanjiru General Stores",
                "Brian Otieno accepted the invitation and is now a Buyer purchaser.",
                "/organization?tab=members",
                20 * 24 * 60,
                False,
            ),
            (
                "brian@wanjiru-demo.co.ke",
                "account",
                "Welcome to Wanjiru General Stores",
                "Grace Wanjiru added you as a Buyer purchaser. You can search the catalogue and build carts.",
                "/catalogue",
                20 * 24 * 60,
                True,
            ),
        ]
        for email, event, title, body, link, minutes_ago, read in rows:
            user = people[email]
            at = now - timedelta(minutes=minutes_ago)
            n = Notification.objects.create(
                recipient=user,
                event_id=f"seed:{title}",
                event_key=event,
                dedupe_key=f"{user.pk}:in_app:seed:{title}"[:200],
                channel="in_app",
                title=title,
                body_text=body,
                deep_link=link,
                status="read" if read else "sent",
                sent_at=at,
                read_at=at if read else None,
            )
            Notification.objects.filter(pk=n.pk).update(created_at=at)
