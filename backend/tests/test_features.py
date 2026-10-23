"""SM-F-01, SM-F-02, SM-F-21 and SM-F-22 through the HTTP API, as the web client uses them."""

import json
import re
from typing import Any

import pytest
from django.conf import settings
from django.core import mail
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client

from apps.accounts.models import User
from apps.catalog.models import Category, CategoryContract, Product, Variant
from apps.demo.management.commands.seed_demo import demo_pdf
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import notify
from apps.organizations.models import Membership, Organization
from apps.sellers.models import SellerDocument, SellerProfile
from core.contract.build import build_contract

API = "/api/v1/"
PASSWORD = "Market-Day-2026!"
pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def commit_now(monkeypatch):
    """Emails go out on commit; the test transaction never commits, so run those callbacks at once."""
    monkeypatch.setattr("django.db.transaction.on_commit", lambda fn, using=None, robust=False: fn())


def call(client: Client, method: str, path: str, data=None) -> tuple[int, Any]:
    kwargs = {"content_type": "application/json", "data": json.dumps(data)} if data is not None else {}
    response = getattr(client, method)(f"{API}{path}", **kwargs)
    return response.status_code, (
        response.json() if response.get("Content-Type", "").startswith("application/json") else None
    )


def person(email: str, org: Organization, role: str, *, verified: bool = True) -> User:
    user = User.objects.create_user(email, PASSWORD, display_name=email.split("@")[0].title())
    if verified:
        from django.utils import timezone

        user.email_verified_at = timezone.now()
        user.save()
    Membership.objects.create(organization=org, user=user, role_key=role)
    return user


def signed_in(user: User) -> Client:
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def world():
    admin_org = Organization.objects.create(
        name="SokoMesh Marketplace", organization_type="marketplace_admin", approval_state="approved"
    )
    seller = Organization.objects.create(
        name="Mwangaza Wholesalers Ltd", organization_type="seller", tax_identifier="P051234567X"
    )
    buyer = Organization.objects.create(
        name="Wanjiru General Stores",
        organization_type="buyer",
        approval_state="approved",
        tax_identifier="A009876543Z",
    )
    SellerProfile.objects.create(organization=seller, public_name="Mwangaza Wholesalers")
    return {
        "admin": person("amina@example.com", admin_org, "marketplace_admin"),
        "manager": person("faith@example.com", seller, "seller_manager"),
        "operator": person("peter@example.com", seller, "warehouse_operator"),
        "owner": person("grace@example.com", buyer, "buyer_owner"),
        "purchaser": person("brian@example.com", buyer, "buyer_purchaser"),
        "seller": seller,
        "buyer": buyer,
    }


# --- SM-F-01: registration, verification, sign-in ---------------------------------------------


def code_from(message) -> str:
    found = re.search(r"\b(\d{6})\b", str(message.body))
    assert found
    return found.group(1)


def test_registration_sends_a_code_and_verifies_the_address():
    client = Client()
    status, body = call(
        client,
        "post",
        "auth/register",
        {
            "display_name": "Joseph Mutua",
            "email": "Joseph@Example.com",
            "password": PASSWORD,
            "organization_name": "Lakeside Supplies",
            "organization_type": "seller",
        },
    )
    assert status == 201 and body["user"]["email"] == "joseph@example.com" and body["user"]["email_verified"] is False
    assert body["memberships"][0]["role_key"] == "seller_manager"
    assert SellerProfile.objects.filter(organization__name="Lakeside Supplies", activation_status="draft").exists()
    assert len(mail.outbox) == 1 and "verification code" in mail.outbox[0].subject
    code = code_from(mail.outbox[0])
    assert code not in json.dumps(body)  # the code only travels by email

    # Until the address is confirmed, nothing else answers.
    assert call(client, "get", "organizations")[0] == 403
    wrong = "000000" if code != "000000" else "111111"
    status, err = call(client, "post", "auth/verify", {"code": wrong})
    assert status == 422 and "4 tries left" in err["fields"]["code"][0]
    status, body = call(client, "post", "auth/verify", {"code": code})
    assert status == 200 and body["user"]["email_verified"] is True
    assert call(client, "get", "organizations")[0] == 200
    assert NotificationPreference.objects.filter(user__email="joseph@example.com").count() == 12


def test_registration_refuses_duplicates_and_weak_passwords(world):
    status, err = call(
        Client(),
        "post",
        "auth/register",
        {
            "display_name": "Faith",
            "email": "faith@example.com",
            "password": "12345678",
            "organization_name": "Copy",
            "organization_type": "buyer",
        },
    )
    assert status == 422 and {"email", "password"} <= set(err["fields"])


def test_sign_in_and_out(world):
    client = Client()
    status, err = call(client, "post", "auth/login", {"email": "faith@example.com", "password": "nope"})
    assert status == 422 and "password" in err["fields"]
    status, body = call(client, "post", "auth/login", {"email": "FAITH@example.com", "password": PASSWORD})
    assert (
        status == 200
        and body["user"]["display_name"] == "Faith"
        and body["active_organization"] == str(world["seller"].pk)
    )
    assert call(client, "post", "auth/logout", {})[1]["user"] is None


def test_profile_and_password(world):
    client = signed_in(world["owner"])
    status, body = call(
        client, "patch", "account/profile", {"display_name": "Grace Wanjiru", "phone": "+254 712 345 678"}
    )
    assert status == 200 and body["user"]["display_name"] == "Grace Wanjiru"
    assert body["user"]["phone"] == "+254712345678"  # stored in one form whatever was typed
    # A landline cannot receive an M-Pesa prompt.
    status, err = call(client, "patch", "account/profile", {"phone": "020 222 3333"})
    assert status == 422 and "07 or 01" in err["fields"]["phone"][0]
    assert call(client, "patch", "account/profile", {"display_name": ""})[0] == 422
    assert call(client, "patch", "account/profile", {"email": "x@example.com"})[0] == 422
    assert (
        call(client, "post", "account/password", {"current_password": "wrong", "new_password": "Another-Day-2026!"})[0]
        == 422
    )
    assert (
        call(client, "post", "account/password", {"current_password": PASSWORD, "new_password": "Another-Day-2026!"})[0]
        == 200
    )
    world["owner"].refresh_from_db()
    assert world["owner"].check_password("Another-Day-2026!")


def test_avatar_upload_checks_the_bytes(world):
    client = signed_in(world["owner"])
    fake = SimpleUploadedFile("me.png", b"<svg onload=alert(1)>", "image/png")
    assert client.post(f"{API}account/avatar", {"file": fake}).status_code == 422
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    response = client.post(f"{API}account/avatar", {"file": SimpleUploadedFile("me.png", png, "image/png")})
    assert response.status_code == 200 and response.json()["user"]["avatar"]["url"].startswith(API + "files")
    assert Client().get(response.json()["user"]["avatar"]["url"]).status_code == 200  # avatars are public


# --- SM-F-01: organizations, members, addresses -----------------------------------------------


def test_organizations_are_scoped_and_the_tax_pin_restricted(world):
    status, body = call(signed_in(world["purchaser"]), "get", "organizations")
    assert status == 200 and [o["name"] for o in body["results"]] == ["Wanjiru General Stores"]
    assert body["results"][0]["tax_identifier"].endswith("43Z") and body["results"][0]["tax_identifier"].startswith("•")
    assert call(signed_in(world["owner"]), "get", "organizations")[1]["results"][0]["tax_identifier"] == "A009876543Z"
    assert call(signed_in(world["purchaser"]), "get", f"organizations/{world['seller'].pk}")[0] == 404
    assert call(signed_in(world["purchaser"]), "patch", f"organizations/{world['buyer'].pk}", {"name": "X"})[0] == 403
    status, body = call(
        signed_in(world["owner"]),
        "patch",
        f"organizations/{world['buyer'].pk}",
        {"legal_name": "Wanjiru General Stores Ltd"},
    )
    assert status == 200 and body["legal_name"] == "Wanjiru General Stores Ltd" and "update" in body["_can"]
    assert (
        call(signed_in(world["owner"]), "patch", f"organizations/{world['buyer'].pk}", {"approval_state": "approved"})[
            0
        ]
        == 422
    )


def test_invitations_roles_and_owner_guards(world):
    owner = signed_in(world["owner"])
    assert (
        call(owner, "post", "memberships", {"email": "new@example.com", "role_key": "warehouse_operator"})[0] == 422
    )  # not a buyer role
    status, invited = call(owner, "post", "memberships", {"email": "new@example.com", "role_key": "buyer_purchaser"})
    assert status == 201 and invited["status"] == "invited"
    found = re.search(r"/invitations/(\S+)", str(mail.outbox[-1].body))
    assert found
    link = found.group(1)

    guest = Client()
    status, info = call(guest, "get", f"invitations/{link}")
    assert status == 200 and info["organization"] == "Wanjiru General Stores" and info["needs_password"] is True
    status, session = call(
        guest, "post", f"invitations/{link}", {"display_name": "Wairimu Njoroge", "password": PASSWORD}
    )
    assert status == 200 and session["user"]["email_verified"] is True
    assert call(guest, "post", f"invitations/{link}", {"password": PASSWORD})[0] == 409  # one use
    assert Notification.objects.filter(recipient=world["owner"], event_key="account").exists()

    me = Membership.objects.get(user=world["owner"])
    assert call(owner, "post", f"memberships/{me.pk}/remove", {})[0] == 409  # never yourself
    assert call(owner, "get", f"memberships/{me.pk}")[1]["_can"] == []  # so nothing is offered on your own row
    status, members = call(owner, "get", "memberships?q=wairimu")
    assert status == 200 and [m["name"] for m in members["results"]] == ["Wairimu Njoroge"]
    joined = members["results"][0]
    assert "change_role" in joined["_can"]
    assert call(owner, "post", f"memberships/{joined['id']}/change_role", {"role_key": "seller_manager"})[0] == 422
    status, joined = call(owner, "post", f"memberships/{joined['id']}/change_role", {"role_key": "buyer_owner"})
    assert status == 200 and joined["role_key"] == "buyer_owner"
    assert call(owner, "post", f"memberships/{me.pk}/change_role", {"role_key": "buyer_purchaser"})[0] == 409
    assert (
        call(
            signed_in(world["purchaser"]),
            "post",
            "memberships",
            {"email": "x@example.com", "role_key": "buyer_purchaser"},
        )[0]
        == 403
    )


def test_addresses_belong_to_the_active_organization(world):
    owner = signed_in(world["owner"])
    status, a = call(
        owner,
        "post",
        "addresses",
        {"label": "Shop", "line1": "Moi Avenue", "city": "Naivasha", "location_point": {"lat": -0.71, "lng": 36.43}},
    )
    assert status == 201 and a["country_code"] == "KE"
    assert (
        call(
            owner,
            "post",
            "addresses",
            {"label": "Bad", "line1": "x", "city": "y", "location_point": {"lat": 200, "lng": 0}},
        )[0]
        == 422
    )
    assert call(signed_in(world["manager"]), "get", f"addresses/{a['id']}")[0] == 404
    assert call(signed_in(world["purchaser"]), "post", f"addresses/{a['id']}/delete", {})[0] == 403
    assert call(owner, "post", f"addresses/{a['id']}/delete", {})[1] == {"deleted": True}


# --- SM-F-02: seller onboarding ---------------------------------------------------------------


def upload_document(client: Client, kind: str) -> Any:
    pdf = SimpleUploadedFile(f"{kind}.pdf", demo_pdf(kind), "application/pdf")
    asset = client.post(f"{API}files", {"file": pdf, "kind": "document"}).json()
    status, doc = call(client, "post", "seller-documents", {"document_type": kind, "file_asset": asset["id"]})
    assert status == 201
    return doc


def test_seller_application_review_and_activation(world):
    manager, admin = signed_in(world["manager"]), signed_in(world["admin"])
    profile_id = str(world["seller"].pk)
    status, err = call(manager, "post", f"seller-profiles/{profile_id}/submit", {})
    assert status == 422 and {"documents", "description"} <= set(err["fields"])

    status, profile = call(
        manager,
        "patch",
        f"seller-profiles/{profile_id}",
        {
            "description": {
                "html": '<p>Flour <strong>by the bale</strong></p><script>alert(1)</script><a href="javascript:x">x</a>'
            },
            "support_phone": "+254 722 418 330",
        },
    )
    assert (
        status == 200
        and "<script" not in profile["description"]["html"]
        and "javascript:" not in profile["description"]["html"]
    )
    assert profile["description"]["text"].startswith("Flour by the bale")
    documents = [upload_document(manager, "registration"), upload_document(manager, "tax")]

    assert call(manager, "post", f"seller-profiles/{profile_id}/activate", {})[0] == 403  # only administrators decide
    status, profile = call(manager, "post", f"seller-profiles/{profile_id}/submit", {})
    assert status == 200 and profile["activation_status"] == "under_review"
    assert Notification.objects.filter(recipient=world["admin"], event_key="approval", channel="in_app").count() == 1
    assert call(manager, "patch", f"seller-profiles/{profile_id}", {"public_name": "X"})[0] == 409  # locked in review

    assert call(admin, "post", f"seller-profiles/{profile_id}/reject", {})[0] == 422  # a reason is required
    status, err = call(admin, "post", f"seller-profiles/{profile_id}/activate", {})
    assert status == 422 and len(err["fields"]["documents"]) == 2  # documents are checked before activation
    assert len(call(admin, "get", f"seller-profiles/{profile_id}")[1]["activation_blockers"]) == 2
    for doc in documents:
        assert call(admin, "post", f"seller-documents/{doc['id']}/verify", {})[0] == 200
    status, profile = call(admin, "post", f"seller-profiles/{profile_id}/activate", {})
    assert status == 200 and profile["activation_status"] == "active"
    assert [h["to_status"] for h in profile["history"]] == ["active", "under_review"]
    world["seller"].refresh_from_db()
    assert world["seller"].approval_state == "approved"
    assert Notification.objects.filter(recipient=world["manager"], title__contains="approved to sell").exists()


def test_documents_are_private_to_their_organization(world):
    doc = upload_document(signed_in(world["manager"]), "registration")
    url = doc["file_asset"]["url"]
    assert signed_in(world["manager"]).get(url).status_code == 200
    assert signed_in(world["admin"]).get(url).status_code == 200
    assert signed_in(world["owner"]).get(url).status_code == 404
    assert Client().get(url).status_code == 404
    fake = SimpleUploadedFile("tax.pdf", b"MZ\x90\x00 not a pdf", "application/pdf")
    assert signed_in(world["manager"]).post(f"{API}files", {"file": fake, "kind": "document"}).status_code == 422
    # Buyers upload return evidence (SM-F-18); their files are private to their organization too.
    mine = signed_in(world["owner"]).post(
        f"{API}files", {"file": SimpleUploadedFile("a.pdf", demo_pdf("x"), "application/pdf")}
    )
    assert mine.status_code == 201
    assert signed_in(world["manager"]).get(mine.json()["url"]).status_code == 404


def test_document_review_by_administrators(world):
    doc = upload_document(signed_in(world["manager"]), "tax")
    admin = signed_in(world["admin"])
    assert call(admin, "post", f"seller-documents/{doc['id']}/reject", {})[0] == 422
    status, doc = call(
        admin, "post", f"seller-documents/{doc['id']}/verify", {"review_notes": "PIN matches KRA records"}
    )
    assert status == 200 and doc["verification_status"] == "verified"
    assert SellerDocument.objects.get(pk=doc["id"]).review_notes == "PIN matches KRA records"


# --- SM-F-22: public product pages ------------------------------------------------------------

# A category contract (SM-F-03) for the product fixtures: a choice, a measured size and a yes/no.
FLOUR: dict[str, Any] = {
    "attribute_schema": [
        {
            "key": "grain",
            "label": "Grain",
            "type": "enum",
            "required": True,
            "choices": [{"value": "maize", "label": "Maize"}, {"value": "wheat", "label": "Wheat"}],
        },
        {"key": "unit_size", "label": "Packet size", "type": "decimal", "unit": "kg", "required": True, "min": 0.1},
        {"key": "fortified", "label": "Fortified", "type": "boolean"},
    ],
    "unit_rules": {"sale_units": ["bale", "sack"], "normalise": {"attribute": "unit_size", "per": "kg", "factor": 1}},
    "facet_keys": ["grain", "unit_size", "fortified"],
    "comparison_keys": ["grain", "unit_size", "fortified"],
    "display_recipe": {"card_keys": ["unit_size"], "spec_keys": ["grain", "unit_size", "fortified"]},
}


@pytest.fixture
def catalogue(world):
    profile = world["seller"].seller_profile
    profile.activation_status = "active"
    profile.save()
    world["seller"].approval_state = "approved"
    world["seller"].save()
    flour = Category.objects.create(name="Flour & grains", slug="flour-grains")
    contract = CategoryContract(category=flour, name="Flour & grains", status="published", **FLOUR)
    contract.full_clean()
    contract.save()
    p = Product(
        seller=world["seller"],
        category=flour,
        category_contract=contract,
        name="Mavuno Maize Flour 2 kg",
        slug="mavuno-maize-flour-2kg",
        attributes={"grain": "maize", "unit_size": 2, "fortified": True},
        status="published",
        primary_image={"url": "/images/products/maize-flour.webp", "alt": "Maize flour", "width": 900, "height": 763},
        description="<p>Sifted maize flour</p>",
        description_text="Sifted maize flour",
    )
    p.full_clean()
    p.save()
    v = Variant(
        product=p,
        seller=p.seller,
        sku="MVN-2K-12",
        packaging_unit="bale",
        units_per_pack=12,
        minimum_order_quantity=5,
        unit_price="1740.00",
        stock_on_hand=40,
    )
    v.full_clean()
    v.save()
    return p


def test_published_products_are_public_with_derived_page_data(catalogue):
    status, page = call(Client(), "get", "products?q=mavuno&category__eq=" + str(catalogue.category_id))
    assert status == 200 and page["total"] == 1 and page["results"][0]["seller"]["label"] == "Mwangaza Wholesalers"
    status, product = call(Client(), "get", "products/mavuno-maize-flour-2kg")
    assert status == 200 and product["description"]["html"] == "<p>Sifted maize flour</p>"
    data = product["page"]
    assert data["canonical_url"].endswith("/products/mavuno-maize-flour-2kg")
    assert (
        data["structured_data_json"]["@type"] == "Product"
        and data["structured_data_json"]["offers"]["price"] == "1740.00"
    )
    assert [c["label"] for c in data["breadcrumb_items"]] == ["Catalogue", "Flour & grains", "Mavuno Maize Flour 2 kg"]
    assert call(Client(), "get", "products/nothing-here")[0] == 404
    assert call(Client(), "get", "categories")[1]["results"][0]["product_count"] == 1


def test_product_gallery_is_bounded_and_listed_for_search_engines(catalogue):
    photo = {"url": "https://images.unsplash.com/photo-1?w=1600", "alt": "A bale", "width": 1600, "height": 1067}
    catalogue.primary_image = {
        "url": "/images/products/maize-flour.webp",
        "alt": "Maize flour",
        "width": 900,
        "height": 763,
    }
    catalogue.gallery = [photo] * 9
    with pytest.raises(ValidationError):
        catalogue.full_clean()  # at most GALLERY_LIMIT photographs after the main one
    catalogue.gallery = [photo, {**photo, "url": "https://images.unsplash.com/photo-2?w=1600"}]
    catalogue.save()
    status, product = call(Client(), "get", "products/mavuno-maize-flour-2kg")
    assert status == 200 and len(product["gallery"]) == 2
    images = product["page"]["structured_data_json"]["image"]
    assert images[0].endswith("/images/products/maize-flour.webp") and images[1:] == [
        g["url"] for g in product["gallery"]
    ]


def test_unapproved_sellers_cannot_publish_or_be_seen(catalogue):
    seller = catalogue.seller
    seller.seller_profile.activation_status = "suspended"
    seller.seller_profile.save()
    assert call(Client(), "get", "products/mavuno-maize-flour-2kg")[0] == 404
    draft = Product(
        seller=seller,
        category=catalogue.category,
        category_contract=catalogue.category_contract,
        name="X",
        slug="x",
        attributes={"grain": "maize", "unit_size": 1},
        status="published",
    )
    with pytest.raises(Exception, match="Unapproved sellers"):
        draft.full_clean()


# --- SM-F-21: notifications -------------------------------------------------------------------


def test_notifications_dedupe_respect_preferences_and_read(world):
    user = world["owner"]
    params = {"organization": "Wanjiru General Stores"}
    first = notify(
        user, event_key="approval", event_id="org:1:approved", message="organization.approved", params=params
    )
    again = notify(
        user, event_key="approval", event_id="org:1:approved", message="organization.approved", params=params
    )
    assert {n.channel for n in first} == {"in_app", "email"} and again == []
    assert first[0].title == "Wanjiru General Stores is approved"
    NotificationPreference.objects.filter(user=user, event_key="quote", channel="email").update(enabled=False)
    quoted = notify(user, event_key="quote", event_id="q:1", message="organization.suspended", params=params)
    assert {n.channel for n in quoted} == {"in_app"}

    client = signed_in(user)
    status, summary = call(client, "get", "notifications/summary")
    assert status == 200 and summary["unread"] == 2
    status, page = call(client, "get", "notifications?status__in=sent&event_key__in=approval")
    assert page["total"] == 1
    assert call(client, "post", f"notifications/{page['results'][0]['id']}/read", {})[1]["status"] == "read"
    assert call(client, "post", "notifications/read-all", {})[1] == {"read": 1}
    assert call(signed_in(world["purchaser"]), "get", f"notifications/{page['results'][0]['id']}")[0] == 404


def test_notification_templates_cover_every_language_with_the_same_placeholders():
    import string

    from apps.notifications.messages import CHROME, MESSAGES, ROLES

    codes = {code for code, _ in settings.AC_LOCALES["supported"]}
    fields = lambda text: {name for _, name, _, _ in string.Formatter().parse(text) if name}  # noqa: E731
    for key, by_locale in MESSAGES.items():
        assert set(by_locale) == codes, key
        english = by_locale[settings.AC_LOCALES["default"]]
        for title, body in by_locale.values():
            assert fields(title) == fields(english[0]) and fields(body) == fields(english[1]), key
    assert set(CHROME) == codes and set(ROLES) == codes
    assert all(set(names) == set(ROLES["en-KE"]) for names in ROLES.values())


def test_notifications_are_written_in_the_readers_language(world):
    reader = world["manager"]
    signed = signed_in(reader)
    assert call(signed, "post", "notification-preferences/locale", {"locale": "sw-KE"})[0] == 200
    mail.outbox.clear()
    sent = notify(
        reader,
        event_key="approval",
        event_id="seller:x:active",
        message="seller.active",
        params={"seller": "Mwangaza"},
        deep_link="/sell",
    )
    assert sent[0].title == "Mwangaza imeidhinishwa kuuza"
    assert "Fungua katika SokoMesh" in str(mail.outbox[-1].body) and mail.outbox[-1].subject == sent[0].title


def test_preferences_and_language(world):
    client = signed_in(world["purchaser"])
    status, prefs = call(client, "get", "notification-preferences?page_size=50")
    assert status == 200 and prefs["total"] == 12
    target = next(p for p in prefs["results"] if p["event_key"] == "order" and p["channel"] == "email")
    assert call(client, "patch", f"notification-preferences/{target['id']}", {"enabled": False})[1]["enabled"] is False
    assert call(client, "patch", f"notification-preferences/{target['id']}", {"channel": "in_app"})[0] == 422
    assert call(client, "post", "notification-preferences/locale", {"locale": "sw-KE"})[1] == {"locale": "sw-KE"}
    assert call(client, "post", "notification-preferences/locale", {"locale": "fr-FR"})[0] == 422


# --- contract and demo ------------------------------------------------------------------------


def test_contract_exports_every_resource_with_rich_text_where_the_spec_allows():
    models = build_contract()["models"]
    assert {
        "organization",
        "membership",
        "address",
        "seller_profile",
        "seller_document",
        "product",
        "category",
        "notification",
        "notification_preference",
    } <= set(models)
    rich = {(key, f["name"]) for key, m in models.items() for f in m["fields"] if f["widget"] == "richtext"}
    # Exactly the specification's four rich-text fields (Product.description through both product resources).
    assert rich == {
        ("seller_profile", "description"),
        ("category_contract", "seller_guidance"),
        ("category_contract", "buyer_guidance"),
        ("product", "description"),
        ("catalog_product", "description"),
    }
    plain = {f["name"]: f["widget"] for f in models["seller_profile"]["fields"]}
    assert plain["rejection_reason"] == "textarea"
    assert {f["name"]: f["widget"] for f in models["notification"]["fields"]}["body_text"] == "textarea"


def test_demo_accounts_are_listed_only_when_enabled(world, settings):
    from django.core.management import call_command

    call_command("seed_demo")
    status, body = call(Client(), "get", "demo/accounts")
    assert status == 200 and len(body["accounts"]) == 6 and body["password"]
    status, session = call(
        Client(), "post", "auth/login", {"email": body["accounts"][1]["email"], "password": body["password"]}
    )
    assert status == 200 and session["user"]["email_verified"] is True
    settings.AC_DEMO_ACCOUNTS = False
    assert call(Client(), "get", "demo/accounts")[0] == 404


def test_navigation_is_decided_by_the_server(world):
    def keys(user):
        return [i["key"] for i in call(signed_in(user), "get", "session")[1]["nav"]]

    assert "admin-sellers" in keys(world["admin"]) and "sell" not in keys(world["admin"])
    assert "sell" in keys(world["manager"]) and "admin-sellers" not in keys(world["manager"])
    assert "catalogue" in keys(world["purchaser"]) and "sell" not in keys(world["purchaser"])
    # Everyone with an organization (and every administrator) starts from their home page.
    assert all(keys(world[who])[0] == "home" for who in ("admin", "manager", "purchaser"))
