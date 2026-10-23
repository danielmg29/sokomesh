"""Seed the demo marketplace (apps/demo/data.py): `python manage.py seed_demo [--reset]`.

Idempotent with --reset, which removes only demo records (known emails, organization names, slugs)
before recreating them. No email is sent: notifications are written as in-app records directly. Generated
history uses a fixed random seed, so every reseed gives the same orders.
"""

import random
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
from apps.catalog import contracts, media, pricing
from apps.catalog.models import BuyerGroupMember, Category, CategoryContract, MediaAsset, PriceRule, Product, Variant
from apps.delivery.models import Shipment, ShipmentEvent
from apps.demo import catalogue, data, products
from apps.demo.operations import History, Placed
from apps.media.models import FileAsset
from apps.media.services import store
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import ensure_preferences
from apps.orders.checkout import address_snapshot
from apps.orders.models import ApprovalPolicy, Order, OrderLine, OrderTransition
from apps.organizations.models import Address, Membership, Organization
from apps.quotes.models import Quote, QuoteLine
from apps.sellers.models import SellerDocument, SellerProfile, SellerStatusChange
from core.events.models import AuditEvent, OutboxEvent
from core.richtext import sanitize

AVATARS = Path(__file__).resolve().parents[2] / "avatars"
# The prepared product cut-outs, uploaded as seller photographs (present in a source checkout only).
CUTOUTS = Path(__file__).resolve().parents[5] / "web" / "public" / "images" / "products"


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
        "variants, price books, a cart, quotes, orders with their history and deliveries, photographs, "
        "notifications, the stock ledger and holds, payments, pick lists, return cases, an integration and "
        "the audit trail."
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
        ids = list(orgs.values_list("pk", flat=True))
        AuditEvent.objects.filter(organization_id__in=ids).delete()
        OutboxEvent.objects.filter(organization_id__in=ids).delete()  # with their webhook deliveries
        Order.objects.filter(buyer_organization__in=orgs).delete()
        Quote.objects.filter(buyer_organization__in=orgs).delete()
        Cart.objects.filter(buyer_organization__in=orgs).delete()
        for asset in MediaAsset.objects.filter(seller__in=orgs):
            media.remove(asset)
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
        # Stock is not written on the packs: the ledger opens with it once the orders exist (operations.py).
        opening: dict[str, int] = {}
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
                    attributes=spec["attributes"],
                )
                variant.full_clean()
                variant.save()
                if spec["stock"] is not None:
                    opening[spec["sku"]] = spec["stock"]

        self.price_books(orgs, now)
        self.cart(people, orgs)
        policies = self.approval_policies(orgs)
        quotes = self.quotes(people, orgs, now)
        placed = self.orders(people, orgs, now, quotes, policies)
        self.media()
        self.notifications(people, orgs, now)
        History(people, orgs, placed, now, demo_pdf).build(opening)

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

    def price_books(self, orgs: dict[str, Organization], now: Any) -> None:
        """Quantity tiers, group prices and promotions (SM-F-06), and who is in which group."""
        for sku, label, group, start, price, priority, begins, ends, active in catalogue.PRICE_RULES:
            rule = PriceRule(
                variant=Variant.objects.get(sku=sku),
                label=label,
                buyer_group_key=group,
                minimum_quantity=start,
                unit_price=price,
                priority=priority,
                effective_from=now + timedelta(days=begins),
                effective_until=now + timedelta(days=ends) if ends is not None else None,
                is_active=active,
            )
            rule.full_clean()
            rule.save()
        for seller, buyer, group in catalogue.BUYER_GROUPS:
            BuyerGroupMember.objects.create(seller=orgs[seller], buyer=orgs[buyer], group_key=group)

    def approval_policies(self, orgs: dict[str, Organization]) -> dict[str, ApprovalPolicy]:
        made = {}
        for buyer, name, threshold, roles, minimum in catalogue.APPROVAL_POLICIES:
            policy = ApprovalPolicy(
                buyer_organization=orgs[buyer],
                name=name,
                threshold_amount=threshold,
                approver_role_keys=roles,
                minimum_approvals=minimum,
            )
            policy.full_clean()
            policy.save()
            made[buyer] = policy
        return made

    def quotes(self, people: dict[str, User], orgs: dict[str, Organization], now: Any) -> dict[str, Quote]:
        """Quotes in each state (SM-F-11), numbered in the order they were asked."""
        specs = sorted(catalogue.QUOTES, key=lambda q: -(q.get("days_ago", 0) * 24 + q.get("hours_ago", 0)))
        made: dict[str, Quote] = {}
        for n, spec in enumerate(specs, 1):
            user = people[spec["email"]]
            buyer = user.memberships.get().organization  # pyright: ignore[reportAttributeAccessIssue]
            asked = now - timedelta(days=spec.get("days_ago", 0), hours=spec.get("hours_ago", 0))
            responded = spec["status"] in ("responded", "accepted")
            quote = Quote.objects.create(
                reference=f"QT-{asked.year}-{n:04d}",
                buyer_organization=buyer,
                seller_organization=orgs[spec["seller"]],
                requested_by=user,
                delivery_address=Address.objects.filter(organization=buyer).order_by("created_at").first(),
                buyer_notes=spec["notes"],
                seller_notes=spec["seller_notes"],
                status=spec["status"],
                expires_at=asked + timedelta(days=spec["valid_days"]),
                responded_at=asked + timedelta(hours=5) if responded else None,
                accepted_at=asked + timedelta(hours=20) if spec["status"] == "accepted" else None,
                version=3 if spec["status"] == "accepted" else 2 if responded else 1,
            )
            Quote.objects.filter(pk=quote.pk).update(created_at=asked, updated_at=asked)
            for sku, quantity, offered in spec["lines"]:
                variant = Variant.objects.select_related("product__category_contract").get(sku=sku)
                p = variant.product
                QuoteLine.objects.create(
                    quote=quote,
                    variant=variant,
                    product_name=p.name,
                    sku=sku,
                    pack_label=contracts.pack_label(p.category_contract, p.attributes, variant),
                    quantity=quantity,
                    unit=variant.packaging_unit,
                    list_price=pricing.resolve(variant, buyer, quantity, at=asked).unit_price,
                    offered_price=offered,
                )
            made[spec["key"]] = quote
        return made

    def orders(
        self,
        people: dict[str, User],
        orgs: dict[str, Organization],
        now: Any,
        quotes: dict[str, Quote],
        policies: dict[str, ApprovalPolicy],
    ) -> list[Placed]:
        """Order history with every transition (SM-F-15), shipments (SM-F-17) and approvals (SM-F-12): the
        hand-kept Wanjiru orders plus months of generated Mwangaza sales, numbered in the order placed. Every
        order but the one awaiting approval was paid before it reached its seller (SM-F-14)."""
        placed: list[Placed] = []
        specs = [
            {**s, "buyer": "wanjiru", "at": now - timedelta(days=s.get("days_ago", 0), hours=s.get("hours_ago", 0))}
            for s in catalogue.ORDERS
        ]
        specs += self.history(people, orgs, now)
        emails = {u.email: u for u in people.values()}
        for n, spec in enumerate(sorted(specs, key=lambda s: s["at"]), 101):
            buyer, seller = orgs[spec["buyer"]], orgs[spec["seller"]]
            at, status = spec["at"], spec["status"]
            user = emails.get(spec.get("email") or "")
            lines = []
            for sku, quantity, price in spec["lines"]:
                variant = Variant.objects.select_related("product__category_contract").get(sku=sku)
                p = variant.product
                resolved = pricing.resolve(variant, buyer, quantity, at=at)
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
                        price_explanation="Quoted price" if spec.get("quote") else resolved.explanation,
                    )
                )
            subtotal = sum((line.line_total for line in lines), Decimal("0"))
            address = Address.objects.filter(organization=buyer).order_by("created_at").first()
            policy = policies.get(spec["buyer"]) if status == "pending_approval" else None
            order = Order.objects.create(
                order_number=f"SO-{at.year}-{n:04d}",
                buyer_organization=buyer,
                seller_organization=seller,
                submitted_by=user,
                delivery_address=address,
                delivery_snapshot=address_snapshot(address) if address else {},
                quote=quotes.get(spec.get("quote") or ""),
                subtotal=subtotal,
                total=subtotal,
                status=status,
                special_instructions=spec.get("notes", ""),
                submitted_at=at,
                approval_policy=policy,
                approval_snapshot={
                    "name": policy.name,
                    "threshold": format(policy.threshold_amount, "f"),
                    "currency": policy.currency,
                    "roles": list(policy.approver_role_keys),
                    "minimum": policy.minimum_approvals,
                }
                if policy
                else {},
            )
            for line in lines:
                line.order = order
                line.save()
            moves = self.path(spec, emails)
            first = "pending_approval" if status == "pending_approval" else "awaiting_payment"
            OrderTransition.objects.create(
                order=order,
                from_status="",
                to_status=first,
                actor=user,
                reason="Placed from a quote" if spec.get("quote") else "Placed from the cart",
                occurred_at=at,
            )
            previous = first
            if first == "awaiting_payment":
                OrderTransition.objects.create(
                    order=order,
                    from_status=first,
                    to_status="submitted",
                    actor=None,
                    reason="Paid by M-Pesa",
                    occurred_at=at + timedelta(minutes=2),
                )
                previous = "submitted"
            shipped_at = delivered_at = None
            for to, hours, actor, reason in moves:
                when = at + timedelta(hours=hours)
                OrderTransition.objects.create(
                    order=order, from_status=previous, to_status=to, actor=actor, reason=reason, occurred_at=when
                )
                previous = to
                shipped_at = when if to == "shipped" else shipped_at
                delivered_at = when if to == "delivered" else delivered_at
            if shipped_at:
                self.shipment(order, spec, shipped_at, delivered_at, now)
            placed.append(Placed(order, spec, shipped_at, delivered_at))
        return placed

    def path(self, spec: dict[str, Any], emails: dict[str, User]) -> list[tuple[str, int, User | None, str]]:
        """The moves after submission that bring an order to its status."""
        status = spec["status"]
        if status in ("submitted", "pending_approval"):
            return []
        if status == "cancelled":
            return [("cancelled", 5, None, spec.get("cancel_reason") or "Cancelled by the buyer: plans changed.")]
        steps = catalogue.PATHS["mwangaza" if spec["seller"] == "mwangaza" else "other"]
        out: list[tuple[str, int, User | None, str]] = []
        for to, hours, email, reason in steps:
            if spec.get("short") and to == "shipped":
                out.append(("partially_fulfilled", hours - 2, emails.get(email or ""), spec["short"]))
            out.append((to, hours, emails.get(email or ""), reason))
            if to == status:
                break
        return out

    def shipment(self, order: Order, spec: dict[str, Any], shipped: Any, delivered: Any, now: Any) -> None:
        """A shipment and its events. `delayed` passes its window with a delay event; `stale` stops sending news."""
        carrier, reference, kind = spec.get("shipment") or ("Own van", f"DLV-{order.order_number[-4:]}", "delivered")
        end = shipped + timedelta(hours=48 if kind == "delayed" else 60 if kind == "stale" else 30)
        s = Shipment.objects.create(
            order=order,
            carrier_name=carrier,
            carrier_reference=reference,
            status="delivered" if delivered else "in_transit",
            estimated_start_at=shipped + timedelta(hours=4),
            estimated_end_at=end,
        )
        town = (order.delivery_snapshot or {}).get("city") or "the buyer"
        events: list[tuple[str, Any, str, str]] = [
            ("handed_over", shipped, "Collected from the warehouse", ""),
            ("in_transit", shipped + timedelta(hours=2), "On the road", "Nakuru"),
        ]
        if kind == "delayed":
            events.append(
                (
                    "delayed",
                    shipped + timedelta(hours=30),
                    "Truck held at the weighbridge; a new time follows",
                    "Gilgil",
                )
            )
        if delivered:
            events += [
                ("out_for_delivery", delivered - timedelta(hours=3), "Out for delivery", town),
                ("delivered", delivered, "Delivered and signed for", town),
            ]
        for kind_, at, description, place in events:
            ShipmentEvent.objects.create(
                shipment=s,
                event_type=kind_,
                description=description,
                location_text=place,
                occurred_at=at,
                source="seller",
            )
        Shipment.objects.filter(pk=s.pk).update(last_event_at=max(at for _, at, _, _ in events))

    def history(self, people: dict[str, User], orgs: dict[str, Organization], now: Any) -> list[dict[str, Any]]:
        """Generated past orders from a fixed seed (the same on every reseed), for seller analytics."""
        h = catalogue.HISTORY
        rng = random.Random(2026)
        buyers_of_wanjiru = ["grace@wanjiru-demo.co.ke", "brian@wanjiru-demo.co.ke"]
        out = []
        for k in range(1, h["count"] + 1):
            buyer = rng.choice(h["buyers"])
            at = (now - timedelta(days=rng.randint(*h["days"]))).replace(
                hour=rng.randint(5, 14), minute=rng.randint(0, 59)
            )
            picks = rng.sample(h["skus"], rng.randint(1, 3))
            lines = []
            for sku, low, high in picks:
                quantity = rng.randint(low, high)
                variant = Variant.objects.get(sku=sku)
                price = pricing.resolve(variant, orgs[buyer], quantity, at=at).unit_price
                lines.append((sku, quantity, format(price, "f")))
            cancelled = k % h["cancelled_every"] == 0
            short = not cancelled and k % h["short_every"] == 0
            out.append(
                {
                    "seller": h["seller"],
                    "buyer": buyer,
                    "email": buyers_of_wanjiru[k % 2] if buyer == "wanjiru" else None,
                    "at": at,
                    "status": "cancelled" if cancelled else "delivered",
                    "lines": lines,
                    "short": f"Short by {lines[0][1] // 3 or 1} of the {lines[0][0]} line; the rest went out."
                    if short
                    else "",
                    "cancel_reason": "Cancelled by the seller: stock ran out before picking." if k % 2 else "",
                }
            )
        return out

    def media(self) -> None:
        """Photographs through the real pipeline (SM-F-05): verified, measured, stripped, or refused."""
        for slug, name, alt in catalogue.MEDIA:
            path = CUTOUTS / name
            if not path.exists():  # the web folder is not in the API image
                continue
            product = Product.objects.get(slug=slug)
            asset = media.accept_upload(
                product, SimpleUploadedFile(name, path.read_bytes(), "image/webp"), alt_text=alt
            )
            media.process(asset.pk)

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
