"""Demo history for the Advanced and Hard features, built after the orders (management/commands/seed_demo.py).

Stock goes through the inventory services, so every balance equals the sum of its movements and the
reconciliation checks agree; the services stamp everything "now", so each step is moved back to when it
happened. Payments, pick lists, cases, the integration and the audit trail are written as the services
would have left them for orders that were placed before payments were taken. Nothing here is random: every
reseed gives the same history.

    stock (SM-F-07)        opening count, restocks, every shipped order, a damage write-off, a top-up
    holds (SM-F-13)        held then allocated for the orders still in the warehouse
    payments (SM-F-14)     a confirmed sandbox payment for every order a seller saw, refunds where due
    pick lists (SM-F-16)   handed over for Mwangaza's recent orders, one still being picked
    cases (SM-F-18)        resolved in part, rejected, waiting for evidence, and one for Faith to decide
    integration (SM-F-23)  Mwangaza's ERP client, tokens and a webhook with delivered, retrying and failed sends
    audit (SM-F-24)        every order transition and payment under the order's correlation id
"""

import hashlib
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models import F
from django.utils import timezone

from apps.accounts.models import User
from apps.catalog.models import Variant
from apps.fulfillment.models import FulfillmentLine, FulfillmentTask
from apps.fulfillment.services import task_for
from apps.integrations import services as integrations
from apps.integrations.models import ApiClient, ApiToken, WebhookDelivery, WebhookEndpoint
from apps.inventory import services as inventory
from apps.inventory.models import Balance, Movement, Reservation
from apps.media.models import FileAsset
from apps.media.services import store
from apps.orders.models import Order, OrderTransition
from apps.organizations.models import Organization
from apps.payments.models import PaymentEvent, PaymentIntent
from apps.payments.providers import mask
from apps.returns.models import ReturnCase, ReturnEvidence
from core.events import context
from core.events.models import AuditEvent, OutboxEvent

OPEN = ("submitted", "confirmed", "picking")  # paid and still in the warehouse: packs allocated
GONE = ("partially_fulfilled", "shipped", "delivered", "disputed")  # the packs left the warehouse
WAREHOUSE = {"mwangaza": "peter@mwangaza-demo.co.ke", "lakeside": "joseph@lakeside-demo.co.ke"}
MANAGER = {"mwangaza": "faith@mwangaza-demo.co.ke", "lakeside": "joseph@lakeside-demo.co.ke"}


@dataclass(frozen=True, slots=True)
class Placed:
    """An order the seed placed, with the spec it came from and when it left and arrived."""

    order: Order
    spec: dict[str, Any]
    shipped: datetime | None
    delivered: datetime | None


def _hex(*parts: Any, n: int = 10) -> str:
    return hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()[:n]


def _backdate(since: datetime, when: datetime) -> None:
    """What the services stamped after `since` happened at `when` instead (append-only rows: queryset updates)."""
    Movement.objects.filter(occurred_at__gte=since).update(occurred_at=when)
    AuditEvent.objects.filter(occurred_at__gte=since).update(occurred_at=when)
    OutboxEvent.objects.filter(available_at__gte=since).update(available_at=when)


def _short(p: Placed) -> int:
    """Packs of the first line not shipped (the generated history's short deliveries)."""
    return (p.spec["lines"][0][1] // 3 or 1) if p.spec.get("short") else 0


class History:
    def __init__(
        self,
        people: dict[str, User],
        orgs: dict[str, Organization],
        placed: list[Placed],
        now: datetime,
        pdf: Callable[[str], bytes],
    ) -> None:
        self.people, self.orgs, self.placed, self.now, self.pdf = people, orgs, placed, now, pdf
        self.audit: list[AuditEvent] = []

    def build(self, opening: dict[str, int]) -> None:
        self.stock(opening)
        self.payments()
        self.pick_lists()
        self.cases()
        self.integration()
        self.trail()
        AuditEvent.objects.bulk_create(self.audit)
        # The relay delivered everything the past produced; only the seeded deliveries say otherwise.
        ids = [o.pk for o in self.orgs.values()]
        OutboxEvent.objects.filter(organization_id__in=ids, status=OutboxEvent.Status.PENDING).update(
            status=OutboxEvent.Status.PUBLISHED, published_at=self.now
        )

    def person(self, email: str | None) -> User | None:
        return self.people.get(email or "")

    # --- stock (SM-F-07) and holds (SM-F-13) ------------------------------------------------------------

    def stock(self, opening: dict[str, int]) -> None:
        """Each tracked pack's ledger, from an opening count to today's figure (`opening` is what is
        available now); then the paid orders still in the warehouse hold and allocate their packs."""
        start, top_up = self.now - timedelta(days=95), self.now - timedelta(hours=30)
        shipped: dict[Any, list[tuple[datetime, int, Order]]] = {}
        allocated: dict[Any, int] = {}
        for p in self.placed:
            for i, line in enumerate(p.order.lines.all()):  # pyright: ignore[reportAttributeAccessIssue]
                if p.order.status in GONE and p.shipped:
                    q = line.quantity_ordered - (_short(p) if i == 0 else 0)
                    shipped.setdefault(line.variant_id, []).append((p.shipped, q, p.order))
                elif p.order.status in OPEN:
                    allocated[line.variant_id] = allocated.get(line.variant_id, 0) + line.quantity_ordered
        variants = Variant.objects.filter(sku__in=opening).select_related("seller").order_by("seller__name", "sku")
        for n, variant in enumerate(variants):
            key = next(k for k, o in self.orgs.items() if o.pk == variant.seller_id)  # pyright: ignore[reportAttributeAccessIssue]
            staff = self.person(WAREHOUSE.get(key))
            # One timeline per pack, run in time order so each row's figures follow the one before it.
            events: list[tuple[datetime, int, Order | None]] = sorted(shipped.get(variant.pk, []), key=lambda e: e[0])
            if variant.sku == "MVN-2K-12":
                events = sorted([*events, (self.now - timedelta(days=12), 1, None)], key=lambda e: e[0])
            want = opening[variant.sku] + allocated.get(variant.pk, 0)  # on hand today
            batch = max(want, 2 * max((q for _, q, _ in events), default=0), 20)
            bin_label = f"{'ABCDEF'[n // 8 % 6]}-{n % 8 + 1:02d}"
            with self.at(start):
                inventory.receive(variant, batch, actor=staff, note="Opening count", bin_label=bin_label)
            on_hand, last, restocks = batch, start, 0
            for when, q, order in events:
                if on_hand < q:
                    restocks += 1
                    with self.at(max(last + timedelta(hours=1), when - timedelta(days=1))):
                        inventory.receive(
                            variant,
                            batch,
                            actor=staff,
                            note=f"Delivery note DN-{_hex(variant.sku, restocks, n=5).upper()}",
                        )
                    on_hand += batch
                with self.at(when):
                    if order is None:
                        inventory.adjust(
                            variant,
                            -1,
                            actor=staff,
                            reason_code="damage",
                            note="One bale torn by the forklift; written off.",
                        )
                    else:
                        self.ship(variant, q, order, staff)
                on_hand, last = on_hand - q, when
            with self.at(max(top_up, last + timedelta(hours=1))):
                if want > on_hand:
                    inventory.receive(variant, want - on_hand, actor=staff, note="Delivery note DN-TOPUP")
                elif want < on_hand:
                    note = "Monthly count: fewer on the shelves than the ledger said."
                    inventory.adjust(variant, want - on_hand, actor=staff, reason_code="count", note=note)
        for p in self.placed:
            if p.order.status in OPEN:
                self.hold(p)

    @contextmanager
    def at(self, when: datetime) -> Iterator[None]:
        """What the services record inside happened at `when`."""
        since = timezone.now()
        yield
        _backdate(since, when)

    def ship(self, variant: Variant, quantity: int, order: Order, actor: User | None) -> None:
        balance = Balance.objects.select_for_update(of=("self",)).select_related("variant").get(variant=variant)
        with context.bound(order.correlation_id):
            inventory._apply(  # the shipment of an order placed before holds: straight off the shelf
                balance,
                Movement.Type.SHIPMENT,
                inventory.Change(on_hand=-quantity),
                reference_type=Movement.Reference.ORDER,
                reference_id=order.pk,
                reference_label=order.order_number,
                actor=actor,
            )

    def hold(self, p: Placed) -> None:
        order = p.order
        lines = [(line.variant, line.quantity_ordered) for line in order.lines.select_related("variant")]  # pyright: ignore[reportAttributeAccessIssue]
        placed_at = order.submitted_at
        with self.at(placed_at):
            inventory.reserve(order, lines, key=f"seed:{order.order_number}")
        with self.at(placed_at + timedelta(minutes=2)):
            inventory.consume_order(order)
        Reservation.objects.filter(order=order).update(
            created_at=placed_at, expires_at=placed_at + inventory.ttl(), consumed_at=placed_at + timedelta(minutes=2)
        )

    # --- payments (SM-F-14) ------------------------------------------------------------------------------

    def payments(self) -> None:
        """A confirmed sandbox payment for every order a seller saw; cancelled ones were refunded, and short
        deliveries refunded the packs not shipped."""
        self.intents: dict[Any, PaymentIntent] = {}
        for n, p in enumerate(self.placed):
            o = p.order
            if o.status == "pending_approval":
                continue
            ref, sent = f"SBX-{_hex(o.order_number).upper()}", o.submitted_at + timedelta(minutes=1)
            payer = o.submitted_by
            intent = PaymentIntent.objects.create(
                order=o,
                buyer_organization=o.buyer_organization,
                seller_organization=o.seller_organization,
                provider="sandbox",
                provider_intent_id=ref,
                amount=o.total,
                status=PaymentIntent.Status.CONFIRMED,
                idempotency_key=f"seed:{o.order_number}",
                requested_by=payer,
                phone_masked=mask(payer.phone if payer else "+254 720 661 093"),
                sent_at=sent,
                confirmed_at=sent + timedelta(minutes=1),
            )
            self.intents[o.pk] = intent
            for k in range(2 if n % 3 == 0 else 1):  # every third result arrived twice
                event = PaymentEvent.objects.create(
                    payment_intent=intent,
                    provider="sandbox",
                    provider_event_id=f"sbx_evt_{_hex(ref, n=16)}",
                    event_type="payment.succeeded",
                    signature_valid=True,
                    payload_hash=_hex(ref, k, n=64),
                    processed_at=sent + timedelta(minutes=1, seconds=k * 4),
                    processing_result=PaymentEvent.Result.DUPLICATE if k else PaymentEvent.Result.APPLIED,
                )
                PaymentEvent.objects.filter(pk=event.pk).update(received_at=sent + timedelta(minutes=1, seconds=k * 4))
            PaymentIntent.objects.filter(pk=intent.pk).update(
                created_at=o.submitted_at, updated_at=sent + timedelta(minutes=1)
            )
            self.event(
                o,
                "payment.prompt_sent",
                "payment",
                sent,
                payer,
                f"M-Pesa prompt {ref} for KES {o.total:,.2f} to {intent.phone_masked}",
            )
            self.event(
                o,
                "payment.confirmed",
                "payment",
                sent + timedelta(minutes=1),
                "Payment sandbox",
                f"{ref} confirmed; the order went to its seller",
            )
            if o.status == "cancelled":
                cancelled = o.transitions.filter(to_status="cancelled").first()  # pyright: ignore[reportAttributeAccessIssue]
                self.refund(intent, o.total, cancelled.occurred_at if cancelled else sent, "The order was cancelled.")
            elif short := _short(p):
                line = o.lines.get(sku_snapshot=p.spec["lines"][0][0])  # pyright: ignore[reportAttributeAccessIssue]
                when = p.shipped or sent
                self.refund(
                    intent,
                    line.unit_price * short,
                    when,
                    f"{short} {line.unit} of {line.sku_snapshot} were not shipped.",
                )

    def refund(self, intent: PaymentIntent, amount: Decimal, when: datetime, why: str) -> None:
        intent.refunded_amount += amount
        if intent.refunded_amount >= intent.amount:
            intent.status = PaymentIntent.Status.REFUNDED
        intent.save(update_fields=["refunded_amount", "status", "updated_at"])
        self.event(
            intent.order,
            "payment.refunded",
            "payment",
            when,
            "Payment sandbox",
            f"KES {amount:,.2f} refunded on {intent.order.order_number}",
            why,
        )

    # --- pick lists (SM-F-16) ------------------------------------------------------------------------------

    def pick_lists(self) -> None:
        """Mwangaza's recent hand-kept orders: handed over with the signed delivery note, or being picked."""
        peter = self.person(WAREHOUSE["mwangaza"])
        mwangaza = self.orgs["mwangaza"]
        recent = [
            p
            for p in self.placed
            if p.order.seller_organization_id == mwangaza.pk and p.order.submitted_at > self.now - timedelta(days=30)  # pyright: ignore[reportAttributeAccessIssue]
        ]  # pyright: ignore[reportAttributeAccessIssue]
        for p in recent:
            o = p.order
            if o.status not in ("picking", "shipped", "delivered"):
                continue
            task = task_for(o)
            confirmed = o.transitions.filter(to_status="confirmed").first()  # pyright: ignore[reportAttributeAccessIssue]
            picking = o.transitions.filter(to_status="picking").first()  # pyright: ignore[reportAttributeAccessIssue]
            lines = list(task.lines.order_by("order_line__product_name_snapshot"))  # pyright: ignore[reportAttributeAccessIssue]
            if o.status == "picking":
                first = lines[0]
                FulfillmentLine.objects.filter(pk=first.pk).update(
                    quantity_picked=first.quantity_ordered, outcome="full"
                )
                FulfillmentTask.objects.filter(pk=task.pk).update(
                    status="picking", assigned_to=peter, started_at=picking.occurred_at if picking else None
                )
            else:
                FulfillmentLine.objects.filter(task=task).update(quantity_picked=F("quantity_ordered"), outcome="full")
                note = SimpleUploadedFile(
                    f"handover-{o.order_number}.pdf",
                    self.pdf(f"Signed delivery note, {o.order_number}"),
                    "application/pdf",
                )
                evidence = store(note, FileAsset.Kind.DOCUMENT, user=peter, organization=mwangaza)
                FulfillmentTask.objects.filter(pk=task.pk).update(
                    status="handed_over",
                    assigned_to=peter,
                    packages=len(lines) * 4,
                    weight_kg=Decimal(sum(line.quantity_ordered for line in lines) * 24),
                    driver_name="Peter Kamau" if o.status == "delivered" else "Samuel Otieno",
                    vehicle_registration="KDA 412X",
                    handover_evidence=evidence,
                    started_at=picking.occurred_at if picking else None,
                    packed_at=(p.shipped - timedelta(hours=2)) if p.shipped else None,
                    handed_over_at=p.shipped,
                )
                if p.shipped:
                    self.event(
                        o,
                        "fulfilment.handed_over",
                        "fulfilment",
                        p.shipped,
                        peter,
                        f"{o.order_number} handed to the carrier with the signed delivery note",
                    )
            FulfillmentTask.objects.filter(pk=task.pk).update(
                created_at=confirmed.occurred_at if confirmed else o.submitted_at
            )

    # --- cases (SM-F-18) ---------------------------------------------------------------------------------

    def cases(self) -> None:
        grace, brian, faith = (
            self.person(e) for e in ("grace@wanjiru-demo.co.ke", "brian@wanjiru-demo.co.ke", MANAGER["mwangaza"])
        )
        wanjiru = self.orgs["wanjiru"]
        hand_kept = [
            p
            for p in self.placed
            if p.order.buyer_organization_id == wanjiru.pk and p.spec.get("days_ago") is not None  # pyright: ignore[reportAttributeAccessIssue]
        ]  # pyright: ignore[reportAttributeAccessIssue]

        def order_of(seller: str, status: str) -> Placed:
            return next(p for p in hand_kept if p.spec["seller"] == seller and p.order.status == status)

        old, coast = order_of("mwangaza", "delivered"), order_of("pwani", "delivered")
        self.case(
            old,
            "MWP-25K-01",
            "shortage",
            "short_delivered",
            1,
            "One sack of rice was missing: two were invoiced and one came. The driver counted with us.",
            grace,
            opened=old.delivered,
            evidence=[("Signed delivery note showing one sack received", grace)],
            decision=(
                "partial",
                1,
                "none",
                "Our loading sheet agrees one sack stayed at the depot. We refund it.",
                faith,
            ),
        )
        self.case(
            old,
            "MVN-2K-12",
            "damage",
            "damaged_in_transit",
            3,
            "Three bales arrived torn at the seams and wet. We set them aside unopened.",
            grace,
            opened=old.delivered,
            evidence=[("Photos of the three torn bales", grace), ("Delivery note signed with a remark", grace)],
        )
        self.case(
            coast,
            "JUA-3L-06",
            "damage",
            "damaged_in_transit",
            1,
            "One jerrycan arrived dented and leaking at the seal.",
            brian,
            opened=coast.delivered,
            evidence=[("Delivery note with the damage written on it", brian)],
            ask="A photo of the dented jerrycan and its seal.",
        )
        self.case(
            coast,
            "SFI-800-25",
            "quality_issue",
            "quality",
            1,
            "The bars in one carton are cracked.",
            brian,
            opened=coast.delivered,
            evidence=[("Photo of the cracked bars", brian)],
            decision=(
                "rejected",
                None,
                "none",
                "The cracks are on the outer wrap only and the bars are whole; we cannot accept a return.",
                coast.order.seller_organization.name,
            ),
        )

    def case(
        self,
        p: Placed,
        sku: str,
        kind: str,
        reason: str,
        quantity: int,
        details: str,
        by: User | None,
        *,
        opened: datetime | None,
        evidence: list[tuple[str, User | None]],
        decision: tuple[str, int | None, str, str, Any] | None = None,
        ask: str = "",
    ) -> None:
        from apps.orders.checkout import next_reference

        o = p.order
        line = o.lines.get(sku_snapshot=sku)  # pyright: ignore[reportAttributeAccessIssue]
        at = (opened or self.now) + timedelta(hours=6)
        status = ReturnCase.Status.EVIDENCE_REQUESTED if ask else ReturnCase.Status.REVIEWING
        case = ReturnCase.objects.create(
            reference=next_reference(ReturnCase, "reference", "RC"),
            order=o,
            order_line=line,
            buyer_organization=o.buyer_organization,
            seller_organization=o.seller_organization,
            case_type=kind,
            reason_code=reason,
            reason_details=details,
            quantity=quantity,
            status=status,
            evidence_note=ask,
            opened_by=by,
        )
        for title, who in evidence:
            asset = store(
                SimpleUploadedFile(
                    f"{case.reference}-{_hex(title, n=4)}.pdf",
                    self.pdf(f"{title}, {o.order_number}"),
                    "application/pdf",
                ),
                FileAsset.Kind.DOCUMENT,
                user=who,
                organization=o.buyer_organization,
            )
            item = ReturnEvidence.objects.create(case=case, file=asset, note=title, side="buyer", uploaded_by=who)
            ReturnEvidence.objects.filter(pk=item.pk).update(created_at=at + timedelta(minutes=3))
        self.event(
            o,
            "return.opened",
            "return",
            at,
            by,
            f"{case.reference}: {quantity} × {sku} ({ReturnCase.Reason(reason).label.lower()})",
            details,
        )
        if ask:
            self.event(
                o,
                "return.evidence_requested",
                "return",
                at + timedelta(hours=5),
                o.seller_organization.name,
                f"{case.reference}: evidence asked for",
                ask,
            )
        updates: dict[str, Any] = {"opened_at": at}
        if decision:
            verdict, accepted, disposition, notes, who = decision
            decided = at + timedelta(days=1)
            decider = who if isinstance(who, User) else None
            refund = line.unit_price * (accepted or 0)
            updates |= {
                "status": ReturnCase.Status.REJECTED if verdict == "rejected" else ReturnCase.Status.RESOLVED,
                "decision": verdict,
                "approved_quantity": accepted,
                "stock_disposition": disposition,
                "decision_notes": notes,
                "decided_by": decider,
                "decided_at": decided,
                "resolved_at": decided,
                "refund_amount": refund,
                "refunded_amount": refund,
            }
            self.event(
                o,
                "return.decided",
                "return",
                decided,
                who,
                f"{case.reference}: {ReturnCase.Decision(verdict).label.lower()}",
                notes,
            )
            if refund:
                self.refund(self.intents[o.pk], refund, decided, f"{case.reference}: {accepted} {line.unit} accepted")
        ReturnCase.objects.filter(pk=case.pk).update(**updates)

    # --- integration (SM-F-23) -----------------------------------------------------------------------------

    def integration(self) -> None:
        """Mwangaza's ERP: a client with two tokens, a retired one, and a webhook whose sends show each state.
        The webhook address is on a reserved domain (.example), so a running relay never reaches a real host."""
        org, faith = self.orgs["mwangaza"], self.person(MANAGER["mwangaza"])
        erp = ApiClient.objects.create(organization=org, name="Mwangaza ERP (stock sync)", created_by=faith)
        sheet = ApiClient.objects.create(
            organization=org, name="Old stock spreadsheet", created_by=faith, status=ApiClient.Status.REVOKED
        )
        for client, name, scopes, used, revoked, days in (
            (erp, "Stock sync", ["catalogue.read", "inventory.read", "inventory.write"], timedelta(hours=2), False, 30),
            (erp, "Order export", ["orders.read"], None, False, 4),
            (sheet, "Spreadsheet import", ["inventory.write"], timedelta(days=50), True, 80),
        ):
            token = ApiToken(client=client, organization=org, name=name, scopes=scopes, created_by=faith)
            integrations.issue(token)  # the token itself is not kept anywhere
            token.last_used_at = self.now - used if used else None
            if revoked:
                token.status, token.revoked_at = ApiToken.Status.REVOKED, self.now - timedelta(days=45)
            token.save()
            ApiToken.objects.filter(pk=token.pk).update(created_at=self.now - timedelta(days=days))
        hook = WebhookEndpoint.objects.create(
            organization=org,
            url="https://erp.mwangaza.example/sokomesh/webhooks",
            events=["order.submitted", "order.cancelled", "inventory.low"],
            secret_salt=integrations.new_salt(),
            created_by=faith,
        )
        WebhookEndpoint.objects.filter(pk=hook.pk).update(created_at=self.now - timedelta(days=30))
        recent = sorted(
            (p for p in self.placed if p.order.seller_organization_id == org.pk and p.order.status in OPEN),  # pyright: ignore[reportAttributeAccessIssue]
            key=lambda p: p.order.submitted_at,
        )  # pyright: ignore[reportAttributeAccessIssue]
        sends = [(p.order, "order.submitted") for p in recent]
        cancelled = next(
            (
                p.order
                for p in sorted(self.placed, key=lambda p: -p.order.submitted_at.timestamp())
                if p.order.status == "cancelled" and p.order.seller_organization_id == org.pk  # pyright: ignore[reportAttributeAccessIssue]
            ),
            None,
        )  # pyright: ignore[reportAttributeAccessIssue]
        if cancelled:
            sends.insert(0, (cancelled, "order.cancelled"))
        states = ["failed", "delivered", "retrying"]
        for i, (o, topic) in enumerate(sends):
            when = o.submitted_at + timedelta(minutes=3)
            event = OutboxEvent.objects.create(
                topic=topic,
                organization_id=org.pk,
                payload={"order_id": str(o.pk), "order_number": o.order_number, "status": topic.split(".")[1]},
                correlation_id=o.correlation_id,
                status=OutboxEvent.Status.PUBLISHED,
                available_at=when,
                published_at=when,
            )
            state = states[i % 3] if i < 3 else "delivered"
            delivery = WebhookDelivery.objects.create(
                endpoint=hook,
                event=event,
                topic=topic,
                status=state,
                attempts={"failed": integrations.MAX_ATTEMPTS, "delivered": 1, "retrying": 2}[state],
                next_attempt_at=self.now + timedelta(minutes=25) if state == "retrying" else when,
                response_status={"failed": None, "delivered": 200, "retrying": 503}[state],
                duration_ms={"failed": 5000, "delivered": 142, "retrying": 388}[state],
                last_error={
                    "failed": "Connection timed out after 5 seconds",
                    "delivered": "",
                    "retrying": "HTTP 503 from the endpoint",
                }[state],
                delivered_at=when + timedelta(seconds=2) if state == "delivered" else None,
            )
            WebhookDelivery.objects.filter(pk=delivery.pk).update(created_at=when)
        self.audit.append(
            AuditEvent(
                occurred_at=self.now - timedelta(days=30),
                event_type="integration.webhook_created",
                domain="integration",
                resource_type="webhook_endpoint",
                resource_id=str(hook.pk),
                organization_id=org.pk,
                actor_id=faith.pk if faith else None,
                actor_label=faith.display_name if faith else "",
                request_id=f"req_{_hex(hook.url, n=12)}",
                correlation_id=f"req_{_hex(hook.url, n=12)}",
                summary=f"Webhook to {hook.url}: {', '.join(hook.events)}",
            )
        )

    # --- the audit trail (SM-F-24) ---------------------------------------------------------------------------

    def event(
        self, order: Order, kind: str, domain: str, when: datetime, actor: Any, summary: str, reason: str = ""
    ) -> None:
        label = actor if isinstance(actor, str) else (actor.display_name if actor else "SokoMesh")
        self.audit.append(
            AuditEvent(
                occurred_at=when,
                event_type=kind,
                domain=domain,
                resource_type="order",
                resource_id=str(order.pk),
                organization_id=order.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
                actor_id=getattr(actor, "pk", None),
                actor_label=label,  # pyright: ignore[reportAttributeAccessIssue]
                request_id=f"req_{_hex(order.order_number, kind, when, n=12)}",
                correlation_id=order.correlation_id,
                summary=summary[:500],
                reason=reason,
                data={"order": order.order_number},
            )
        )

    def trail(self) -> None:
        """Every order transition, as lifecycle.record() writes it, under the order's correlation id."""
        labels = dict(Order.Status.choices)
        for t in OrderTransition.objects.filter(order__in=[p.order for p in self.placed]).select_related(
            "order", "actor"
        ):
            o, to, before = t.order, t.to_status, t.from_status
            summary = f"{o.order_number} {str(labels.get(to, to)).lower()}" + (
                f", from {str(labels.get(before, before)).lower()}" if before else ""
            )
            self.event(o, f"order.{to}", "order", t.occurred_at, t.actor, summary, t.reason)
