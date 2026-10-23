"""SM-F-07, 13, 14, 16, 18, 23 and 24 through the HTTP API and the services the workers run."""

import json
import threading
from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection, transaction
from django.test import Client
from django.utils import timezone

from apps.catalog.models import Variant
from apps.integrations import services as integrations
from apps.integrations.models import WebhookDelivery
from apps.inventory import services as inventory
from apps.inventory.models import Balance, Movement, Reservation
from apps.orders.models import Order
from apps.payments import providers
from apps.payments.models import PaymentEvent, PaymentIntent
from core.api import Problem
from core.events.models import AuditEvent, OutboxEvent
from tests.test_features import API, call, catalogue, commit_now, signed_in, world  # noqa: F401  (fixtures)
from tests.test_integrated import address_of, fill_cart, pay, png

pytestmark = pytest.mark.django_db
SKU = "MVN-2K-12"


def checkout(client: Client, buyer, *lines) -> dict:
    cart = fill_cart(client, *lines)
    status, placed = call(
        client, "post", f"carts/{cart['id']}/checkout", {"delivery_address": str(address_of(buyer).pk)}
    )
    assert status == 200, placed
    return placed["orders"][0]


def balance(sku: str = SKU) -> Balance:
    return Balance.objects.get(variant__sku=sku)


# --- SM-F-07: the ledger ------------------------------------------------------------------------------


def test_the_ledger_records_every_change_and_never_goes_below_what_is_held(world, catalogue):  # noqa: F811
    v = Variant.objects.get(sku=SKU)
    assert v.stock_on_hand == 40 and not inventory.tracked(v)  # reported before the ledger, not yet tracked
    faith, peter = signed_in(world["manager"]), signed_in(world["operator"])
    status, b = call(faith, "post", "inventory/balances", {"variant": str(v.pk), "bin_label": "A-03"})
    assert status == 201 and b["on_hand"] == 0 and b["bin_label"] == "A-03"
    status, b = call(peter, "post", f"inventory/balances/{b['id']}/receive", {"quantity": 60, "note": "DN 4471"})
    assert status == 200 and b["on_hand"] == 60 and b["available"] == 60
    assert Variant.objects.get(pk=v.pk).stock_on_hand == 60  # buyers and search read the ledger's figure
    assert (
        call(peter, "post", f"inventory/balances/{b['id']}/adjust", {"quantity_change": -2, "reason_code": "damage"})[0]
        == 403
    )  # managers adjust
    assert (
        call(faith, "post", f"inventory/balances/{b['id']}/adjust", {"quantity_change": -2, "reason_code": "other"})[0]
        == 422
    )  # "other" needs a note
    status, b = call(
        faith,
        "post",
        f"inventory/balances/{b['id']}/adjust",
        {"quantity_change": -2, "reason_code": "damage", "note": "Torn bales"},
    )
    assert status == 200 and b["on_hand"] == 58
    # Holds and allocations can never be adjusted away; the database refuses it too.
    order = Order.objects.create(
        order_number="SO-X1",
        buyer_organization=world["buyer"],
        seller_organization=catalogue.seller,
        subtotal=1,
        total=1,
        status="awaiting_payment",
        submitted_at=timezone.now(),
    )
    inventory.reserve(order, [(v, 50)], key="t1")
    status, body = call(
        faith, "post", f"inventory/balances/{b['id']}/adjust", {"quantity_change": -10, "reason_code": "count"}
    )
    assert status == 409 and body["fields"]["quantity_change"] == ["Remove at most 8 packs."]
    rows = list(Movement.objects.filter(variant=v).order_by("occurred_at"))
    assert [m.movement_type for m in rows] == ["receipt", "adjustment", "reservation"]
    assert sum(m.on_hand_change for m in rows) == balance().on_hand  # on hand rebuilds from movements
    with pytest.raises(ValueError):
        rows[0].save()  # append-only
    ledger = call(faith, "get", f"inventory/movements?variant__eq={v.pk}")[1]["results"]
    assert [m["movement_type"] for m in ledger] == ["reservation", "adjustment", "receipt"] and ledger[0][
        "quantity"
    ] == -50
    assert call(signed_in(world["owner"]), "get", "inventory/balances")[0] == 403


# --- SM-F-13: reservations --------------------------------------------------------------------------------


@pytest.fixture
def stocked(world, catalogue):  # noqa: F811
    v = Variant.objects.get(sku=SKU)
    inventory.receive(v, 40, actor=world["manager"])
    return v


def test_checkout_holds_stock_and_an_unpaid_order_lapses(world, catalogue, stocked):  # noqa: F811
    grace = signed_in(world["owner"])
    placed = checkout(grace, world["buyer"], (stocked, 10))
    assert placed["status"] == "awaiting_payment"
    b = balance()
    assert (b.reserved, b.available) == (10, 30) and Variant.objects.get(pk=stocked.pk).stock_on_hand == 30
    detail = call(grace, "get", f"orders/{placed['id']}")[1]
    hold = detail["reservations"][0]
    assert hold["status"] == "active" and hold["quantity"] == 10 and detail["hold_seconds"] == 15 * 60
    assert "pay" in detail["_can"] and "reorder" not in detail["_can"]
    # The worker releases holds past their time in batches, and cancels the unpaid order.
    run = inventory.expire_due(now=timezone.now() + timedelta(minutes=16))
    assert (run.claimed, run.expired, run.orders_cancelled) == (1, 1, 1)
    assert balance().available == 40 and Order.objects.get(pk=placed["id"]).status == "cancelled"
    assert inventory.expire_due(now=timezone.now() + timedelta(minutes=16)).claimed == 0  # nothing twice
    status, _ = call(grace, "post", f"orders/{placed['id']}/pay", {"phone": "0712345678"})
    assert status == 409


def test_not_enough_stock_refuses_the_whole_checkout(world, catalogue, stocked):  # noqa: F811
    grace = signed_in(world["owner"])
    cart = fill_cart(grace, (stocked, 30))
    Balance.objects.filter(variant=stocked).update(on_hand=35)  # 5 left after a count, behind the cart's back
    other = Order.objects.create(
        order_number="SO-X2",
        buyer_organization=world["buyer"],
        seller_organization=catalogue.seller,
        subtotal=1,
        total=1,
        status="awaiting_payment",
        submitted_at=timezone.now(),
    )
    inventory.reserve(other, [(stocked, 10)], key="other")
    status, body = call(
        grace, "post", f"carts/{cart['id']}/checkout", {"delivery_address": str(address_of(world["buyer"]).pk)}
    )
    assert status == 409 and "only 25 packs" in body["detail"]  # the ledger's figure, checked before holding
    assert Order.objects.filter(order_number__startswith="SO-2").count() == 0  # nothing placed, nothing held
    assert inventory.reserve(other, [(stocked, 10)], key="other")[0].quantity == 10  # the same key holds once
    assert balance().reserved == 10


@pytest.mark.django_db(transaction=True)
def test_two_buyers_cannot_both_take_the_last_bales(world, catalogue):  # noqa: F811
    v = Variant.objects.get(sku=SKU)
    with transaction.atomic():
        inventory.receive(v, 24, actor=None)
    orders = [
        Order.objects.create(
            order_number=f"SO-R{i}",
            buyer_organization=world["buyer"],
            seller_organization=catalogue.seller,
            subtotal=1,
            total=1,
            status="awaiting_payment",
            submitted_at=timezone.now(),
        )
        for i in range(2)
    ]
    start, results = threading.Barrier(2), []

    def buy(order: Order) -> None:
        try:
            start.wait()
            with transaction.atomic():
                inventory.reserve(order, [(v, 24)], key=f"race:{order.pk}")
            results.append("held")
        except Problem:
            results.append("refused")
        finally:
            connection.close()

    threads = [threading.Thread(target=buy, args=(o,)) for o in orders]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    b = balance()
    assert sorted(results) == ["held", "refused"] and (b.reserved, b.available) == (24, 0)
    assert Reservation.objects.filter(status="active").count() == 1


# --- SM-F-14: payments ------------------------------------------------------------------------------------


def test_a_payment_submits_the_order_once_however_often_the_result_arrives(world, catalogue, stocked):  # noqa: F811
    grace, faith = signed_in(world["owner"]), signed_in(world["manager"])
    placed = checkout(grace, world["buyer"], (stocked, 5))
    status, first = call(grace, "post", f"orders/{placed['id']}/pay", {"phone": "0712 345 678"})
    again = call(grace, "post", f"orders/{placed['id']}/pay", {"phone": "0712 345 678"})[1]
    assert (
        first["payments"][0]["id"] == again["payments"][0]["id"] and PaymentIntent.objects.count() == 1
    )  # taps reuse it
    intent = PaymentIntent.objects.get()
    assert intent.status == "pending" and intent.phone_masked == "0712 *** 678" and intent.amount == Decimal("8700.00")
    assert call(faith, "get", f"orders/{placed['id']}")[0] == 404  # unpaid: not the seller's yet
    assert call(signed_in(world["manager"]), "post", f"payments/{intent.pk}/simulate", {"outcome": "approve"})[0] == 403
    status, answered = call(grace, "post", f"payments/{intent.pk}/simulate", {"outcome": "approve"})
    assert (
        status == 200
        and answered["status"] == "confirmed"
        and answered["results_received"] == 2
        and answered["duplicates"] == 1
    )
    order = Order.objects.get(pk=placed["id"])
    assert order.status == "submitted" and order.transitions.last().reason.startswith("Paid by M-Pesa")  # pyright: ignore[reportAttributeAccessIssue,reportOptionalMemberAccess]
    b = balance()
    assert (b.reserved, b.allocated, b.available) == (0, 5, 35)  # held packs are now allocated to the order
    assert call(faith, "get", f"orders/{placed['id']}")[1]["side"] == "seller"
    # A replay of the same result is kept and changes nothing; a forged one is refused.
    event = PaymentEvent.objects.filter(processing_result="applied").get()
    body = json.dumps(
        {
            "id": event.provider_event_id,
            "type": "payment.succeeded",
            "data": {"reference": intent.provider_intent_id, "amount": "8700.00", "currency": "KES"},
        }
    ).encode()
    replay = Client().post(
        f"{API}payments/callbacks/sandbox",
        body,
        content_type="application/json",
        headers={"X-SokoMesh-Signature": providers.sign(body)},
    )
    assert replay.status_code == 200 and replay.json()["result"] == "duplicate"
    forged = Client().post(
        f"{API}payments/callbacks/sandbox",
        body,
        content_type="application/json",
        headers={"X-SokoMesh-Signature": "t=1,v1=00"},
    )
    assert (
        forged.status_code == 401
        and PaymentEvent.objects.filter(processing_result="invalid", error_code="bad_signature").count() == 1
    )
    assert Order.objects.get(pk=placed["id"]).transitions.filter(to_status="submitted").count() == 1  # pyright: ignore[reportAttributeAccessIssue]
    # Cancelling a paid order gives back the allocation and the money.
    status, _ = call(grace, "post", f"orders/{placed['id']}/cancel", {"reason": "Ordered twice"})
    assert status == 200 and PaymentIntent.objects.get().status == "refunded" and balance().available == 40


def test_a_declined_prompt_can_be_sent_again_and_wrong_amounts_are_not_applied(world, catalogue, stocked):  # noqa: F811
    grace = signed_in(world["owner"])
    placed = checkout(grace, world["buyer"], (stocked, 5))
    after = pay(grace, placed["id"], outcome="cancel")
    assert after["status"] == "awaiting_payment" and after["payments"][0]["status"] == "cancelled"
    assert "cancelled the prompt" in after["payments"][0]["failure"]
    second = call(grace, "post", f"orders/{placed['id']}/pay", {"phone": "0712345678"})[1]["payments"][0]
    assert second["attempt"] == 2 and second["status"] == "pending"
    intent = PaymentIntent.objects.get(attempt=2)
    body = json.dumps(
        {
            "id": "evt_wrong",
            "type": "payment.succeeded",
            "data": {"reference": intent.provider_intent_id, "amount": "1.00", "currency": "KES"},
        }
    ).encode()
    answer = Client().post(
        f"{API}payments/callbacks/sandbox",
        body,
        content_type="application/json",
        headers={"X-SokoMesh-Signature": providers.sign(body)},
    )
    assert answer.json()["result"] == "conflict" and PaymentIntent.objects.get(pk=intent.pk).status == "pending"
    # A stale prompt (no result for a while) reads as not confirmed and may be sent again.
    PaymentIntent.objects.filter(pk=intent.pk).update(sent_at=timezone.now() - timedelta(minutes=5))
    assert call(grace, "get", f"orders/{placed['id']}")[1]["payments"][0]["status"] == "stale"


def test_a_payment_after_the_hold_lapsed_is_refunded_if_the_stock_is_gone(world, catalogue, stocked):  # noqa: F811
    grace = signed_in(world["owner"])
    placed = checkout(grace, world["buyer"], (stocked, 30))
    call(grace, "post", f"orders/{placed['id']}/pay", {"phone": "0712345678"})
    intent = PaymentIntent.objects.get()
    Reservation.objects.filter(order_id=placed["id"]).update(expires_at=timezone.now() - timedelta(minutes=1))
    with transaction.atomic():  # the hold lapses; someone else takes the packs before the result arrives
        r = Reservation.objects.get(order_id=placed["id"])
        inventory.release(r, "expired")
        other = Order.objects.create(
            order_number="SO-X3",
            buyer_organization=world["buyer"],
            seller_organization=catalogue.seller,
            subtotal=1,
            total=1,
            status="awaiting_payment",
            submitted_at=timezone.now(),
        )
        inventory.reserve(other, [(stocked, 20)], key="other")
    body = json.dumps(
        {
            "id": "evt_late",
            "type": "payment.succeeded",
            "data": {"reference": intent.provider_intent_id, "amount": format(intent.amount, "f"), "currency": "KES"},
        }
    ).encode()
    Client().post(
        f"{API}payments/callbacks/sandbox",
        body,
        content_type="application/json",
        headers={"X-SokoMesh-Signature": providers.sign(body)},
    )
    order = Order.objects.get(pk=placed["id"])
    assert order.status == "cancelled" and PaymentIntent.objects.get().status == "refunded"


# --- SM-F-16: fulfilment ----------------------------------------------------------------------------------


def paid_order(world, catalogue, stocked, quantity=10) -> Order:  # noqa: F811
    grace = signed_in(world["owner"])
    placed = checkout(grace, world["buyer"], (stocked, quantity))
    pay(grace, placed["id"])
    return Order.objects.get(pk=placed["id"])


def test_the_warehouse_picks_short_ships_with_a_reason_and_hands_over_with_a_photo(world, catalogue, stocked):  # noqa: F811
    order = paid_order(world, catalogue, stocked)
    faith, peter, grace = signed_in(world["manager"]), signed_in(world["operator"]), signed_in(world["owner"])
    assert call(faith, "post", f"orders/{order.pk}/confirm", {})[0] == 200
    tasks = call(peter, "get", "fulfilment/tasks")[1]["results"]
    task = tasks[0]
    assert (
        len(tasks) == 1
        and task["status"] == "queued"
        and task["lines"][0]["ordered"] == 10
        and task["lines"][0]["on_shelf"] == 40
    )
    assert call(grace, "get", f"fulfilment/tasks/{task['id']}")[0] == 404
    assert call(peter, "post", f"fulfilment/tasks/{task['id']}/start", {})[1]["status"] == "picking"
    assert Order.objects.get(pk=order.pk).status == "picking"
    line = task["lines"][0]["id"]
    assert (
        call(peter, "post", f"fulfilment/tasks/{task['id']}/record_picks", {"picks": [{"line": line, "picked": 8}]})[0]
        == 422
    )  # short needs a reason
    call(
        peter,
        "post",
        f"fulfilment/tasks/{task['id']}/record_picks",
        {"picks": [{"line": line, "picked": 8, "reason": "Two bales torn on the shelf"}]},
    )
    packed = call(peter, "post", f"fulfilment/tasks/{task['id']}/pack", {"packages": 8, "weight_kg": "192.00"})[1]
    assert packed["status"] == "packed" and Order.objects.get(pk=order.pk).status == "partially_fulfilled"
    assert (
        call(peter, "post", f"fulfilment/tasks/{task['id']}/hand_over", {"carrier_name": "Own van"})[0] == 422
    )  # the photo is required
    photo = peter.post(
        f"{API}files", {"file": SimpleUploadedFile("loaded.png", png(800, 600), "image/png"), "kind": "document"}
    ).json()
    status, done = call(
        peter,
        "post",
        f"fulfilment/tasks/{task['id']}/hand_over",
        {
            "carrier_name": "Own van",
            "vehicle_registration": "KDA 412X",
            "driver_name": "Peter Kamau",
            "evidence_file": photo["id"],
        },
    )
    assert status == 200 and done["status"] == "handed_over" and done["handover_evidence"]["id"] == photo["id"]
    order.refresh_from_db()
    b = balance()
    assert order.status == "shipped" and order.shipments.count() == 1  # pyright: ignore[reportAttributeAccessIssue]
    assert (b.on_hand, b.allocated, b.available) == (32, 0, 32)  # 8 out of the door, 2 back to available
    assert PaymentIntent.objects.get().refunded_amount == Decimal("3480.00")  # the two short bales refunded
    assert grace.get(f"{API}files/{photo['id']}").status_code == 200  # the buyer may see the handover photo


def test_shipping_from_the_order_page_picks_everything(world, catalogue, stocked):  # noqa: F811
    order = paid_order(world, catalogue, stocked, quantity=6)
    faith = signed_in(world["manager"])
    call(faith, "post", f"orders/{order.pk}/confirm", {})
    end = (timezone.now() + timedelta(days=1)).isoformat()
    assert (
        call(faith, "post", f"orders/{order.pk}/ship", {"carrier_name": "G4S", "estimated_end_at": end})[1]["status"]
        == "shipped"
    )
    assert (balance().on_hand, balance().allocated) == (34, 0) and order.fulfilment.status == "handed_over"  # pyright: ignore[reportAttributeAccessIssue]


# --- SM-F-18: returns ---------------------------------------------------------------------------------------


def delivered(world, catalogue, stocked) -> Order:  # noqa: F811
    order = paid_order(world, catalogue, stocked)
    faith = signed_in(world["manager"])
    call(faith, "post", f"orders/{order.pk}/confirm", {})
    call(
        faith,
        "post",
        f"orders/{order.pk}/ship",
        {"carrier_name": "Own van", "estimated_end_at": (timezone.now() + timedelta(days=1)).isoformat()},
    )
    call(faith, "post", f"orders/{order.pk}/mark_delivered", {})
    return Order.objects.get(pk=order.pk)


def test_a_damage_claim_moves_from_evidence_to_a_partial_refund_and_restock(world, catalogue, stocked):  # noqa: F811
    order = delivered(world, catalogue, stocked)
    grace, faith = signed_in(world["owner"]), signed_in(world["manager"])
    line = order.lines.get()  # pyright: ignore[reportAttributeAccessIssue]
    claim = {
        "order": str(order.pk),
        "order_line": str(line.pk),
        "case_type": "damage",
        "reason_code": "damaged_in_transit",
        "quantity": 11,
        "reason_details": "Four bales arrived wet.",
    }
    assert call(grace, "post", "returns", claim)[0] == 422  # more than were ordered
    assert call(faith, "post", "returns", {**claim, "quantity": 4})[0] == 403  # sellers do not open cases
    status, case = call(grace, "post", "returns", {**claim, "quantity": 4})
    assert status == 201 and case["status"] == "open" and case["reference"].startswith("RC-")
    assert call(faith, "post", f"returns/{case['id']}/request_evidence", {})[0] == 422
    assert (
        call(faith, "post", f"returns/{case['id']}/request_evidence", {"note": "Photos of the wet bales, please."})[1][
            "status"
        ]
        == "evidence_requested"
    )
    photo = grace.post(
        f"{API}files", {"file": SimpleUploadedFile("wet.png", png(700, 700), "image/png"), "kind": "document"}
    ).json()
    status, case = call(
        grace, "post", f"returns/{case['id']}/add_evidence", {"evidence_file": photo["id"], "note": "Bottom row"}
    )
    assert status == 200 and case["status"] == "reviewing" and len(case["evidence"]) == 1
    assert faith.get(f"{API}files/{photo['id']}").status_code == 200  # the seller reads the buyer's evidence
    assert (
        call(grace, "post", f"returns/{case['id']}/decide", {"decision": "approved", "decision_notes": "x"})[0] == 403
    )
    decision = {
        "decision": "partial",
        "approved_quantity": 3,
        "stock_disposition": "restock",
        "decision_notes": "One bale was dry; three refunded and restocked.",
    }
    status, case = call(faith, "post", f"returns/{case['id']}/decide", decision)
    assert (
        status == 200
        and case["status"] == "resolved"
        and case["refund_amount"] == "5220.00"
        and case["refunded_amount"] == "5220.00"
    )
    assert balance().on_hand == 33 and Movement.objects.filter(movement_type="return").get().on_hand_change == 3
    assert call(grace, "post", "returns", {**claim, "quantity": 7})[0] == 422  # 4 of 10 already claimed
    assert (
        call(grace, "post", "returns", {**claim, "quantity": 6})[0] == 201
    )  # what is left of the line may still be claimed
    assert call(grace, "post", "returns", {**claim, "quantity": 1})[0] == 422


def test_report_a_problem_disputes_the_order_and_opens_a_case(world, catalogue, stocked):  # noqa: F811
    order = delivered(world, catalogue, stocked)
    grace = signed_in(world["owner"])
    status, view = call(
        grace, "post", f"orders/{order.pk}/dispute", {"reason": "The invoice does not match the delivery note."}
    )
    assert status == 200 and view["status"] == "disputed" and view["cases"][0]["type"] == "dispute"


# --- SM-F-23: integrations -----------------------------------------------------------------------------------


def test_tokens_are_shown_once_scoped_and_revocable(world, catalogue, stocked):  # noqa: F811
    faith = signed_in(world["manager"])
    client = call(faith, "post", "integrations/clients", {"name": "Stock sync (ERP)"})[1]
    status, token = call(
        faith,
        "post",
        "integrations/tokens",
        {"client": client["id"], "name": "ERP", "scopes": ["inventory.read", "inventory.write"]},
    )
    raw = token["token"]
    assert status == 201 and raw.startswith("smk_") and raw.endswith(token["last4"])
    assert "token" not in call(faith, "get", f"integrations/tokens/{token['id']}")[1]  # never again
    api = Client(headers={"Authorization": f"Bearer {raw}"})
    rows = api.get(f"{API}integration/inventory").json()["results"]
    assert rows[0]["sku"] == SKU and rows[0]["available"] == 40
    assert api.get(f"{API}integration/orders").status_code == 403  # no orders.read
    receipt = {"sku": SKU, "quantity": 12, "note": "GRN 88"}
    first = api.post(
        f"{API}integration/inventory/receipts",
        receipt,
        content_type="application/json",
        headers={"Idempotency-Key": "grn-88"},
    ).json()
    again = api.post(
        f"{API}integration/inventory/receipts",
        receipt,
        content_type="application/json",
        headers={"Idempotency-Key": "grn-88"},
    ).json()
    assert first["on_hand"] == 52 and again["replayed"] and balance().on_hand == 52  # received once
    assert (
        Client(headers={"Authorization": f"Bearer {raw[:-1]}x"}).get(f"{API}integration/inventory").status_code == 401
    )
    call(faith, "post", f"integrations/tokens/{token['id']}/revoke", {})
    assert api.get(f"{API}integration/inventory").status_code == 401
    assert call(signed_in(world["operator"]), "post", "integrations/clients", {"name": "x"})[0] == 403


def test_webhooks_are_signed_retried_with_backoff_and_refuse_private_addresses(world, catalogue, stocked, settings):  # noqa: F811
    faith = signed_in(world["manager"])
    assert (
        call(
            faith, "post", "integrations/webhooks", {"url": "http://hooks.example.com/x", "events": ["order.submitted"]}
        )[0]
        == 422
    )
    assert (
        call(faith, "post", "integrations/webhooks", {"url": "https://127.0.0.1/x", "events": ["order.submitted"]})[0]
        == 422
    )
    status, hook = call(
        faith,
        "post",
        "integrations/webhooks",
        {"url": "https://hooks.mwangaza.example/orders", "events": ["order.submitted", "payment.confirmed"]},
    )
    assert status == 201 and hook["secret"].startswith("whsec_")
    paid_order(world, catalogue, stocked, quantity=5)
    assert OutboxEvent.objects.filter(topic="order.submitted").count() == 2  # one for each side's organization
    assert integrations.fan_out() == 2  # order.submitted and payment.confirmed for the seller's endpoint
    seen: list[tuple[str, bytes, dict[str, str]]] = []
    integrations.deliver_due(send=lambda url, body, headers: seen.append((url, body, headers)) or 200)
    _, body, headers = seen[0]
    endpoint = WebhookDelivery.objects.first().endpoint  # pyright: ignore[reportOptionalMemberAccess]
    at = int(headers["X-SokoMesh-Signature"].split(",")[0][2:])
    assert headers["X-SokoMesh-Signature"] == integrations.signature(endpoint, body, at) and json.loads(body)["data"][
        "order_number"
    ].startswith("SO-")
    assert WebhookDelivery.objects.filter(status="delivered").count() == 2
    # A failing endpoint is retried later, then given up on.
    paid_order(world, catalogue, stocked, quantity=5)
    integrations.fan_out()
    integrations.deliver_due(send=lambda *a: 503)
    d = WebhookDelivery.objects.filter(status="retrying").first()
    assert d and d.attempts == 1 and d.next_attempt_at > timezone.now() + timedelta(seconds=50)
    for _ in range(integrations.MAX_ATTEMPTS):
        WebhookDelivery.objects.filter(status="retrying").update(next_attempt_at=timezone.now())
        integrations.deliver_due(send=lambda *a: 503)
    assert WebhookDelivery.objects.filter(status="failed").count() == 2


# --- SM-F-24: audit and reconciliation -----------------------------------------------------------------------


def test_one_journey_traces_end_to_end_and_reconciliation_finds_drift(world, catalogue, stocked):  # noqa: F811
    order = paid_order(world, catalogue, stocked, quantity=5)
    amina, faith = signed_in(world["admin"]), signed_in(world["manager"])
    trace = call(amina, "get", f"reconciliation/trace?q={order.order_number}")[1]
    kinds = [e["event"] for e in trace["events"]]
    assert trace["correlation_id"] == order.correlation_id
    for step in (
        "order.awaiting_payment",
        "inventory.reserved",
        "payment.prompt_sent",
        "payment.confirmed",
        "order.submitted",
    ):
        assert step in kinds
    assert kinds.index("payment.confirmed") < kinds.index("order.submitted")
    by_ref = call(amina, "get", f"reconciliation/trace?q={PaymentIntent.objects.get().provider_intent_id}")[1]
    assert by_ref["correlation_id"] == order.correlation_id  # a payment reference finds the same journey
    checks = {c["key"]: c for c in call(amina, "get", "reconciliation/checks")[1]["checks"]}
    assert all(c["ok"] for c in checks.values()), [c for c in checks.values() if not c["ok"]]
    Balance.objects.filter(variant=stocked).update(on_hand=99)  # a change that bypassed the ledger
    checks = {c["key"]: c for c in call(amina, "get", "reconciliation/checks")[1]["checks"]}
    assert not checks["ledger_drift"]["ok"] and checks["ledger_drift"]["examples"][0].startswith(SKU)
    assert call(faith, "get", "reconciliation/checks")[0] == 403 and call(faith, "get", "audit-events")[0] == 403
    audit = call(amina, "get", "audit-events?domain__in=payment")[1]["results"]
    assert {e["event_type"] for e in audit} >= {"payment.prompt_sent", "payment.confirmed"}
    assert AuditEvent.objects.filter(event_type="payment.prompt_sent").get().data == {
        "reference": PaymentIntent.objects.get().provider_intent_id,
        "attempt": 1,
        "amount": "8700.00",
    }
    response = amina.get(f"{API}reconciliation/checks", headers={"X-Request-ID": "req_from_the_test_1"})
    assert response["X-Request-ID"] == "req_from_the_test_1"
