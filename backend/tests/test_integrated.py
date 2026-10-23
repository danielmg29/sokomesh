"""SM-F-05, 06, 11, 12, 15, 17 and 19 through the HTTP API, as the web client uses them."""

import csv
import io
import struct
import zlib
from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.utils import timezone

from apps.catalog import media
from apps.catalog.models import BuyerGroupMember, MediaAsset, PriceRule, Product, Variant
from apps.catalog.pricing import resolve
from apps.delivery.models import Shipment
from apps.orders.models import ApprovalPolicy, Order, OrderTransition
from apps.organizations.models import Address, Organization
from apps.quotes.models import Quote
from apps.sellers.models import SellerProfile
from tests.test_features import call, catalogue, commit_now, signed_in, world  # noqa: F401  (fixtures)

pytestmark = pytest.mark.django_db
API = "/api/v1/"


def png(width: int, height: int, text: bytes = b"") -> bytes:
    """A valid PNG of a flat colour, optionally carrying a tEXt chunk (metadata to strip)."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    rows = b"".join(b"\x00" + b"\x80\x60\x40" * width for _ in range(height))
    body = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    if text:
        body += chunk(b"tEXt", b"GPS\x00" + text)
    return b"\x89PNG\r\n\x1a\n" + body + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b"")


def jpeg_with_exif() -> bytes:
    """Just the container: SOI, an Exif APP1 segment, a frame header (900 x 700), a scan and EOI."""
    exif = b"Exif\x00\x00GPS-LATITUDE-1.2921"
    app1 = b"\xff\xe1" + struct.pack(">H", len(exif) + 2) + exif
    sof = b"\xff\xc0" + struct.pack(">HBHHB", 11, 8, 700, 900, 1) + b"\x01\x11\x00"
    return b"\xff\xd8" + app1 + sof + b"\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00" + b"\x12\x34" + b"\xff\xd9"


def upload(client: Client, product: Product, data: bytes, name: str = "photo.png", mime: str = "image/png"):
    response = client.post(
        f"{API}catalog/products/{product.pk}/media",
        {"file": SimpleUploadedFile(name, data, mime), "alt_text": "A bale"},
    )
    return response.status_code, response.json()


def other_seller() -> Organization:
    rift = Organization.objects.create(
        name="Rift Valley Traders", organization_type="seller", approval_state="approved"
    )
    SellerProfile.objects.create(organization=rift, public_name="Rift Valley Traders", activation_status="active")
    return rift


def sugar_from(rift: Organization, catalogue) -> Variant:  # noqa: F811
    p = Product(
        seller=rift,
        category=catalogue.category,
        category_contract=catalogue.category_contract,
        name="Unga Bora Baking Flour 2 kg",
        slug="unga-bora-baking-flour-2kg",
        attributes={"grain": "wheat", "unit_size": 2},
        status="published",
    )
    p.full_clean()
    p.save()
    v = Variant(
        product=p,
        seller=rift,
        sku="UBF-2K-10",
        packaging_unit="bale",
        units_per_pack=10,
        minimum_order_quantity=5,
        unit_price="1690.00",
        stock_on_hand=60,
    )
    v.full_clean()
    v.save()
    return v


def address_of(org: Organization) -> Address:
    return Address.objects.create(organization=org, label="Shop", line1="Moi Avenue", city="Naivasha", region="Nakuru")


def pay(client: Client, order_id: str, outcome: str = "approve") -> dict:
    """Pay an order through the sandbox: send the prompt, then answer it on the sandbox phone."""
    status, order = call(client, "post", f"orders/{order_id}/pay", {"phone": "0712 345 678"})
    assert status == 200, order
    intent = order["payments"][0]
    assert intent["status"] == "pending" and intent["sandbox"]
    status, answered = call(client, "post", f"payments/{intent['id']}/simulate", {"outcome": outcome})
    assert status == 200, answered
    return call(client, "get", f"orders/{order_id}")[1]


def fill_cart(client: Client, *variants: tuple[Variant, int]) -> dict:
    for v, q in variants:
        assert call(client, "post", "cart-lines", {"variant": str(v.pk), "quantity": q})[0] == 201
    return call(client, "get", "carts?status__in=active")[1]["results"][0]


# --- SM-F-05: media pipeline --------------------------------------------------------------------------


def test_photographs_are_verified_stripped_and_served_by_visibility(world, catalogue):  # noqa: F811
    manager = signed_in(world["manager"])
    assert upload(manager, catalogue, b"%PDF-1.4 not an image", "doc.png")[0] == 422
    status, asset = upload(manager, catalogue, png(900, 700, b"-1.2921,36.8219"))
    assert status == 201 and asset["processing_status"] == "ready" and asset["scan_status"] == "clean"
    assert (asset["width"], asset["height"]) == (900, 700)
    stored = MediaAsset.objects.get(pk=asset["id"])
    with media.default_storage.open(stored.derivatives["display"]["key"], "rb") as f:
        assert b"tEXt" not in f.read()  # metadata stripped from the public copy
    assert stored.derivatives["widths"] == [320, 480, 640]
    assert upload(manager, catalogue, png(900, 700, b"-1.2921,36.8219"))[0] == 422  # the same photograph twice
    status, small = upload(manager, catalogue, png(300, 200))
    assert small["scan_status"] == "rejected" and "too small" in small["rejection_reason"]
    # Public once ready on a published product; the product's own images now come from its media.
    response = Client().get(f"{API}media/{asset['id']}")
    assert response.status_code == 200 and "immutable" in response["Cache-Control"]
    product = call(Client(), "get", f"products/{catalogue.slug}")[1]
    assert product["primary_image"]["url"].endswith(f"media/{asset['id']}") and product["primary_image"]["widths"] == [
        320,
        480,
        640,
    ]
    # The original only through a signed link.
    original = asset["original_url"].removeprefix(API)
    assert Client().get(f"{API}{original}").status_code == 200
    assert Client().get(f"{API}media/{asset['id']}/original?t=forged").status_code == 404
    # A draft product's photographs stay private.
    catalogue.status, catalogue.published_at = "draft", None
    catalogue.save()
    assert Client().get(f"{API}media/{asset['id']}").status_code == 404


def test_jpeg_metadata_is_stripped_without_decoding():
    data = jpeg_with_exif()
    assert media.dimensions(data, "image/jpeg") == (900, 700)
    clean = media.strip_metadata(data, "image/jpeg")
    assert b"GPS-LATITUDE" not in clean and clean.startswith(b"\xff\xd8") and clean.endswith(b"\xff\xd9")


# --- SM-F-06: price books ---------------------------------------------------------------------------------


def test_price_rules_resolve_deterministically_and_explain(world, catalogue):  # noqa: F811
    v = Variant.objects.get(sku="MVN-2K-12")
    buyer = world["buyer"]
    assert resolve(v, buyer, 5).explanation == "List price"
    manager = signed_in(world["manager"])
    status, tier = call(
        manager, "post", "catalog/price-rules", {"variant": str(v.pk), "minimum_quantity": 10, "unit_price": "1690.00"}
    )
    assert status == 201 and tier["state"] == "active"
    call(
        manager,
        "post",
        "catalog/price-rules",
        {"variant": str(v.pk), "buyer_group_key": "key_accounts", "minimum_quantity": 5, "unit_price": "1700.00"},
    )
    later = timezone.now() + timedelta(days=10)
    call(
        manager,
        "post",
        "catalog/price-rules",
        {
            "variant": str(v.pk),
            "label": "Promotion",
            "minimum_quantity": 5,
            "unit_price": "1500.00",
            "effective_from": later.isoformat(),
        },
    )
    assert resolve(v, buyer, 5).unit_price == Decimal(
        "1740.00"
    )  # the group rule needs membership; the promotion is later
    assert resolve(v, buyer, 12).explanation == "Quantity price from 10 bales"
    BuyerGroupMember.objects.create(seller=catalogue.seller, buyer=buyer, group_key="key_accounts")
    assert resolve(v, buyer, 5).unit_price == Decimal("1700.00")
    # Equal priority: the group rule beats the everyone tier; a higher priority beats both.
    assert resolve(v, buyer, 12).unit_price == Decimal("1700.00")
    PriceRule.objects.filter(minimum_quantity=10).update(priority=5)
    assert resolve(v, buyer, 12).unit_price == Decimal("1690.00")
    # The buyer asks for their own price; the public sees list and public tiers only.
    purchaser = signed_in(world["purchaser"])
    mine = call(purchaser, "get", f"prices?variant={v.pk}&quantity=5")[1]
    assert mine["unit_price"] == "1700.00" and mine["personal"] and mine["explanation"] == "Key accounts price"
    public = call(Client(), "get", f"prices?variant={v.pk}&quantity=5")[1]
    assert public["unit_price"] == "1740.00" and not public["personal"]
    assert [t["unit_price"] for t in public["tiers"]] == ["1740.00", "1690.00"]
    # Cart lines quote the resolved price and requote when the buyer changes the quantity.
    cart = fill_cart(purchaser, (v, 5))
    line = cart["groups"][0]["lines"][0]
    assert line["quoted_unit_price"] == "1700.00" and line["price_explanation"] == "Key accounts price"
    assert call(purchaser, "patch", f"cart-lines/{line['id']}", {"quantity": 12})[1]["quoted_unit_price"] == "1690.00"


def test_overlapping_rules_are_flagged(world, catalogue):  # noqa: F811
    v = Variant.objects.get(sku="MVN-2K-12")
    manager = signed_in(world["manager"])
    call(
        manager,
        "post",
        "catalog/price-rules",
        {"variant": str(v.pk), "label": "A", "minimum_quantity": 10, "unit_price": "1690.00"},
    )
    _, second = call(
        manager,
        "post",
        "catalog/price-rules",
        {"variant": str(v.pk), "label": "B", "minimum_quantity": 10, "unit_price": "1680.00"},
    )
    assert second["state"] == "conflict" and "higher priority" in second["conflict_note"]


# --- SM-F-15 and SM-F-17: checkout, the lifecycle and delivery ------------------------------------------


def test_checkout_places_one_order_per_seller_and_fulfilment_moves_through_guards(world, catalogue):  # noqa: F811
    rift = other_seller()
    flour = sugar_from(rift, catalogue)
    buyer, grace = world["buyer"], signed_in(world["owner"])
    address = address_of(buyer)
    cart = fill_cart(grace, (Variant.objects.get(sku="MVN-2K-12"), 5), (flour, 5))
    Variant.objects.filter(sku="UBF-2K-10").update(unit_price=Decimal("1700.00"))  # a price rise after quoting
    status, body = call(grace, "post", f"carts/{cart['id']}/checkout", {"delivery_address": str(address.pk)})
    assert status == 409 and "Accept the new prices" in body["detail"]
    call(grace, "post", f"carts/{cart['id']}/accept_prices", {})
    status, placed = call(
        grace,
        "post",
        f"carts/{cart['id']}/checkout",
        {"delivery_address": str(address.pk), "special_instructions": "Back gate"},
    )
    assert (
        status == 200 and len(placed["orders"]) == 2 and {o["status"] for o in placed["orders"]} == {"awaiting_payment"}
    )
    for o in placed["orders"]:
        assert pay(grace, o["id"])["status"] == "submitted"
    again = call(grace, "post", f"carts/{cart['id']}/checkout", {"delivery_address": str(address.pk)})
    assert again[0] in (404, 409) and Order.objects.count() == 2  # a repeated submit places nothing
    order = Order.objects.get(seller_organization=catalogue.seller)
    assert order.delivery_snapshot["city"] == "Naivasha" and order.lines.get().unit_price == Decimal("1740.00")  # pyright: ignore[reportAttributeAccessIssue]
    manager = signed_in(world["manager"])
    # The buyer cannot fulfil; the seller can, step by step, and cannot skip.
    assert call(grace, "post", f"orders/{order.pk}/confirm", {})[0] == 403
    assert call(manager, "post", f"orders/{order.pk}/mark_delivered", {})[0] == 409
    view = call(manager, "post", f"orders/{order.pk}/confirm", {})[1]
    assert view["status"] == "confirmed" and "start_picking" in view["_can"] and "confirm" not in view["_can"]
    assert (
        call(grace, "post", f"orders/{order.pk}/cancel", {"reason": "Changed my mind"})[0] == 409
    )  # too late for the buyer
    call(manager, "post", f"orders/{order.pk}/start_picking", {})
    assert call(manager, "post", f"orders/{order.pk}/mark_partial", {})[0] == 422  # a reason is required
    end = (timezone.now() + timedelta(days=1)).isoformat()
    status, shipped = call(
        manager,
        "post",
        f"orders/{order.pk}/ship",
        {"carrier_name": "G4S Logistics", "carrier_reference": "G4S-778", "estimated_end_at": end},
    )
    assert status == 200 and shipped["status"] == "shipped"
    shipment = Shipment.objects.get(order=order)
    status, _ = call(
        manager,
        "post",
        f"shipments/{shipment.pk}/add_event",
        {"event_type": "delayed", "description": "Rain on the Nakuru road"},
    )
    assert status == 200
    detail = call(grace, "get", f"orders/{order.pk}")[1]
    assert detail["shipments"][0]["delayed"] and [t["to"] for t in detail["transitions"]] == [
        "awaiting_payment",
        "submitted",
        "confirmed",
        "picking",
        "shipped",
    ]
    assert call(grace, "post", f"shipments/{shipment.pk}/add_event", {"event_type": "note"})[0] == 403
    peter = signed_in(world["operator"])
    note = peter.post(
        f"{API}files", {"file": SimpleUploadedFile("pod.png", png(40, 40), "image/png"), "kind": "document"}
    )
    assert note.status_code == 201
    proof = note.json()["id"]
    status, _ = call(
        peter,
        "post",
        f"shipments/{shipment.pk}/confirm_delivery",
        {"description": "Signed by Grace", "proof_file": proof},
    )
    assert status == 200 and grace.get(f"{API}files/{proof}").status_code == 200
    order.refresh_from_db()
    last = OrderTransition.objects.filter(order=order).order_by("occurred_at").last()
    assert order.status == "delivered" and last and last.reason == "Delivery confirmed with proof of delivery"
    assert call(grace, "post", f"orders/{order.pk}/dispute", {})[0] == 422
    assert call(grace, "post", f"orders/{order.pk}/dispute", {"reason": "Two bales torn"})[1]["status"] == "disputed"


def test_stale_shipments_say_so(world, catalogue):  # noqa: F811
    from apps.delivery.services import shipment_view, start

    order = Order.objects.create(
        order_number="SO-1",
        buyer_organization=world["buyer"],
        seller_organization=catalogue.seller,
        subtotal=1,
        total=1,
        status="shipped",
        submitted_at=timezone.now(),
    )
    s = start(order, carrier_name="Own van", carrier_reference="", start_at=None, end_at=None)
    later = timezone.now() + timedelta(hours=30)
    assert shipment_view(s, now=later)["stale"] and not shipment_view(s)["stale"]


# --- SM-F-12: purchase approval ------------------------------------------------------------------------------


def test_orders_over_the_threshold_wait_for_another_approver(world, catalogue):  # noqa: F811
    buyer = world["buyer"]
    address = address_of(buyer)
    ApprovalPolicy.objects.create(
        buyer_organization=buyer,
        name="Large orders",
        threshold_amount=Decimal("5000"),
        approver_role_keys=["buyer_owner"],
        minimum_approvals=1,
    )
    brian, grace = signed_in(world["purchaser"]), signed_in(world["owner"])
    cart = fill_cart(brian, (Variant.objects.get(sku="MVN-2K-12"), 5))
    placed = call(brian, "post", f"carts/{cart['id']}/checkout", {"delivery_address": str(address.pk)})[1]["orders"][0]
    assert placed["status"] == "pending_approval"
    manager = signed_in(world["manager"])
    assert call(manager, "get", f"orders/{placed['id']}")[0] == 404  # not the seller's until approved
    assert "approve" not in call(brian, "get", f"orders/{placed['id']}")[1]["_can"]  # not your own order
    assert call(brian, "post", f"orders/{placed['id']}/approve", {})[0] == 403
    view = call(grace, "get", f"orders/{placed['id']}")[1]
    assert view["approval"]["can_decide"] and view["approval"]["policy"] == "Large orders"
    status, approved = call(grace, "post", f"orders/{placed['id']}/approve", {"comment": "Fine for this week"})
    assert status == 200 and approved["status"] == "awaiting_payment"
    assert call(manager, "get", f"orders/{placed['id']}")[0] == 404  # still not the seller's: unpaid
    assert pay(brian, placed["id"])["status"] == "submitted"
    assert call(manager, "get", f"orders/{placed['id']}")[1]["side"] == "seller"
    # Rejection needs a reason and cancels the order.
    cart = fill_cart(brian, (Variant.objects.get(sku="MVN-2K-12"), 5))
    second = call(brian, "post", f"carts/{cart['id']}/checkout", {"delivery_address": str(address.pk)})[1]["orders"][0]
    assert call(grace, "post", f"orders/{second['id']}/reject", {})[0] == 422
    assert call(grace, "post", f"orders/{second['id']}/reject", {"comment": "Over budget"})[1]["status"] == "cancelled"
    # An approver's own order skips the policy by default, and the order says why.
    cart = fill_cart(grace, (Variant.objects.get(sku="MVN-2K-12"), 5))
    own = call(grace, "post", f"carts/{cart['id']}/checkout", {"delivery_address": str(address.pk)})[1]["orders"][0]
    assert own["status"] == "awaiting_payment"
    pay(grace, own["id"])
    approval = call(grace, "get", f"orders/{own['id']}")[1]["approval"]
    assert approval["state"] == "not_required" and approval["placed_as"] == "buyer_owner" and not approval["can_decide"]
    assert call(manager, "get", f"orders/{own['id']}")[1]["side"] == "seller"
    # With the exemption off, the only owner cannot approve their own order: refused rather than stranded.
    policy = ApprovalPolicy.objects.get(buyer_organization=buyer)
    assert call(brian, "patch", f"approval-policies/{policy.pk}", {"exempt_approvers": False})[0] == 403
    assert (
        call(grace, "patch", f"approval-policies/{policy.pk}", {"exempt_approvers": False})[1]["exempt_approvers"]
        is False
    )
    cart = fill_cart(grace, (Variant.objects.get(sku="MVN-2K-12"), 5))
    status, body = call(grace, "post", f"carts/{cart['id']}/checkout", {"delivery_address": str(address.pk)})
    assert status == 409 and "nobody else" in body["detail"]


# --- SM-F-11: quotes ---------------------------------------------------------------------------------------


def test_quotes_move_cart_lines_and_accepted_offers_become_orders(world, catalogue):  # noqa: F811
    buyer = world["buyer"]
    address = address_of(buyer)
    brian, manager = signed_in(world["purchaser"]), signed_in(world["manager"])
    fill_cart(brian, (Variant.objects.get(sku="MVN-2K-12"), 20))
    expires = (timezone.now() + timedelta(days=3)).isoformat()
    status, q = call(
        brian,
        "post",
        "quotes",
        {
            "seller_organization": str(catalogue.seller_id),
            "delivery_address": str(address.pk),
            "expires_at": expires,
            "buyer_notes": "Weekly order",
        },
    )
    assert (
        status == 201
        and q["status"] == "requested"
        and len(q["lines"]) == 1
        and q["lines"][0]["list_price"] == "1740.00"
    )
    assert (
        call(brian, "get", "carts?status__in=active")[1]["results"][0]["line_count"] == 0
    )  # the lines moved to the quote
    assert call(brian, "post", f"quotes/{q['id']}/respond", {"offers": {}})[0] == 403
    line = q["lines"][0]["id"]
    assert call(manager, "post", f"quotes/{q['id']}/respond", {"offers": {line: "-1"}})[0] == 422
    status, responded = call(
        manager, "post", f"quotes/{q['id']}/respond", {"offers": {line: "1650.00"}, "seller_notes": "For 20 bales"}
    )
    assert status == 200 and responded["status"] == "responded" and responded["offered_total"] == "33000.00"
    assert call(manager, "post", f"quotes/{q['id']}/accept", {})[0] == 403
    status, accepted = call(brian, "post", f"quotes/{q['id']}/accept", {})
    assert status == 200 and accepted["status"] == "accepted"
    assert pay(brian, accepted["order"]["id"])["status"] == "submitted"
    order = Order.objects.get(pk=accepted["order"]["id"])
    assert order.quote_id == Quote.objects.get(pk=q["id"]).pk and order.lines.get().unit_price == Decimal("1650.00")  # pyright: ignore[reportAttributeAccessIssue]
    assert call(manager, "post", f"quotes/{q['id']}/respond", {"offers": {line: "1"}})[0] == 409  # frozen once accepted


def test_open_quotes_expire(world, catalogue):  # noqa: F811
    buyer = world["buyer"]
    address = address_of(buyer)
    q = Quote.objects.create(
        reference="QT-1",
        buyer_organization=buyer,
        seller_organization=catalogue.seller,
        requested_by=world["purchaser"],
        delivery_address=address,
        expires_at=timezone.now() - timedelta(minutes=1),
    )
    assert call(signed_in(world["purchaser"]), "get", f"quotes/{q.pk}")[1]["status"] == "expired"


# --- SM-F-19: analytics --------------------------------------------------------------------------------------


def test_metrics_cards_series_and_export_reconcile(world, catalogue):  # noqa: F811
    seller, buyer = catalogue.seller, world["buyer"]
    today = timezone.localdate()
    for i, (total, status) in enumerate(
        [("1000.00", "delivered"), ("3000.00", "shipped"), ("500.00", "cancelled"), ("9000.00", "pending_approval")]
    ):
        o = Order.objects.create(
            order_number=f"SO-9{i}",
            buyer_organization=buyer,
            seller_organization=seller,
            subtotal=total,
            total=total,
            status=status,
            submitted_at=timezone.now() - timedelta(days=i),
        )
        o.lines.create(  # pyright: ignore[reportAttributeAccessIssue]
            product_name_snapshot="Mavuno",
            sku_snapshot="MVN",
            quantity_ordered=2,
            unit="bale",
            unit_price=Decimal(total) / 2,
            line_total=total,
        )  # pyright: ignore[reportAttributeAccessIssue]
    manager = signed_in(world["manager"])
    body = call(manager, "get", f"analytics?date_from={today - timedelta(days=6)}&date_to={today}&dimension=day")[1]
    by_key = {m["key"]: m for m in body["metrics"]}
    assert (
        by_key["revenue"]["value"] == "4000.00"
        and by_key["orders"]["value"] == "2"
        and by_key["average_order_value"]["value"] == "2000.00"
    )
    assert by_key["cancellation_rate"]["value"] == "33.3" and by_key["fill_rate"]["value"] == "100.0"
    assert by_key["cancellation_rate"]["better"] == "lower" and by_key["revenue"]["better"] == "higher"
    assert by_key["stock_risk"]["previous"] is None and by_key["revenue"]["previous"] == "0.00"
    assert len(by_key["revenue"]["series"]) == 7 and sum(
        Decimal(p["value"]) for p in by_key["revenue"]["series"]
    ) == Decimal("4000.00")
    top = call(manager, "get", "analytics?metrics=product_revenue&dimension=product")[1]["metrics"][0]["breakdown"]
    assert top == [{"rank": 1, "label": "Mavuno", "value": "4000.00", "units": 4}]
    week = f"date_from={today - timedelta(days=6)}&date_to={today}&dimension=day"
    rows = list(
        csv.DictReader(io.StringIO(manager.get(f"{API}analytics/export?metrics=revenue&{week}").content.decode()))
    )
    assert rows[-1]["bucket"] == "total" and rows[-1]["value"] == by_key["revenue"]["value"]
    assert call(signed_in(world["owner"]), "get", "analytics")[0] == 403
    assert call(manager, "get", f"analytics?date_from={today - timedelta(days=400)}")[0] == 422


# --- The demo seed tells each Integrated story -----------------------------------------------------------------


def test_demo_seed_covers_the_integrated_features():
    from django.core.management import call_command

    from apps.accounts.models import User

    call_command("seed_demo")
    grace, brian, faith = (
        signed_in(User.objects.get(email=f"{n}-demo.co.ke"))
        for n in ("grace@wanjiru", "brian@wanjiru", "faith@mwangaza")
    )
    waiting = call(grace, "get", "orders?status__in=pending_approval")[1]["results"]
    assert len(waiting) == 1 and Decimal(waiting[0]["total"]) >= Decimal("50000")
    detail = call(grace, "get", f"orders/{waiting[0]['id']}")[1]
    assert detail["approval"]["can_decide"] and "approve" in detail["_can"]
    assert call(faith, "get", f"orders/{waiting[0]['id']}")[0] == 404  # not the seller's until approved
    partners = {r["name"]: r for r in call(faith, "get", "catalog/buyers")[1]["results"]}
    wanjiru = Order.objects.filter(
        buyer_organization__name="Wanjiru General Stores", seller_organization__name="Mwangaza Wholesalers Ltd"
    )
    assert partners["Wanjiru General Stores"]["orders"] == wanjiru.exclude(status="pending_approval").count()
    # Every order the seller can see has its history; shipped orders have shipments, one late and one quiet.
    assert not Order.objects.exclude(status="pending_approval").exclude(transitions__to_status="submitted").exists()
    assert OrderTransition.objects.filter(to_status="partially_fulfilled").exists()
    views = [call(grace, "get", f"shipments/{s.pk}")[1] for s in Shipment.objects.filter(status="in_transit")]
    assert any(v["delayed"] for v in views) and any(v["stale"] and not v["delayed"] for v in views)
    # Brian's cart line moved from the old list price to the key-account price, waiting for him to accept it.
    cart = call(brian, "get", "carts?status__in=active")[1]["results"][0]
    line = next(line for g in cart["groups"] for line in g["lines"] if line["variant"]["sku"] == "MVN-2K-12")
    assert (
        line["state"] == "changed"
        and line["unit_price"] == "1700.00"
        and line["price_explanation"] == "Key accounts price"
    )
    assert {q["status"] for q in call(grace, "get", "quotes")[1]["results"]} == {
        "requested",
        "responded",
        "accepted",
        "expired",
    }
    analytics = {
        m["key"]: m
        for m in call(faith, "get", "analytics?date_from=" + str(timezone.localdate() - timedelta(days=89)))[1][
            "metrics"
        ]
    }
    assert Decimal(analytics["revenue"]["value"]) > 0 and Decimal(analytics["fill_rate"]["value"]) < 100
    assert Decimal(analytics["cancellation_rate"]["value"]) > 0
    states = sorted(
        MediaAsset.objects.filter(product__slug="magharibi-brown-sugar-1kg").values_list("processing_status", flat=True)
    )
    assert states == ["failed", "ready"]
    assert call(Client(), "get", "products/magharibi-brown-sugar-1kg")[1]["primary_image"]["url"].startswith(
        "/api/v1/media/"
    )
    # Reseeding removes and rebuilds all of it, photographs included.
    call_command("seed_demo", reset=True)
    assert Order.objects.filter(status="pending_approval").count() == 1 and Quote.objects.count() == 4
    assert MediaAsset.objects.count() == 2
