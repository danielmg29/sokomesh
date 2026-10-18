"""SM-F-02 resources: the seller profile with its review commands, and seller documents.

Rules the API enforces: a profile goes to review only with a registration and a tax document; it is
locked while under review; only marketplace administrators decide; a rejection or suspension needs a
reason; the organization's approval follows the decision; unapproved sellers are never published
(apps.catalog filters on an active profile).
"""

from typing import Any

from django.conf import settings
from django.db.models import QuerySet
from django.http import HttpRequest
from django.utils import timezone

from apps.media.models import FileAsset
from apps.organizations.models import Membership, Organization
from apps.organizations.tenancy import active_membership, is_admin
from apps.sellers.models import SellerDocument, SellerProfile, SellerStatusChange
from core.api import fail, invalid
from core.operations.registry import Action, Field, Resource, derive, register
from core.result import ErrorCode

ACTIVATION_TONES = {
    "draft": "neutral",
    "under_review": "info",
    "active": "success",
    "rejected": "danger",
    "suspended": "warning",
}
DOC_TONES = {"pending": "info", "verified": "success", "rejected": "danger", "expired": "warning"}
REQUIRED_DOCUMENTS = ("registration", "tax")
EDITABLE = {"draft", "rejected", "active"}


def _profile_queryset(request: HttpRequest) -> QuerySet[SellerProfile]:
    qs = SellerProfile.objects.select_related("organization", "reviewed_by")
    if is_admin(request.user):
        return qs
    return qs.filter(organization=active_membership(request).organization)


def _documents(org: Organization, request: HttpRequest) -> list[dict[str, Any]]:
    return [
        document.serialize(d, request)
        for d in SellerDocument.objects.filter(seller_organization=org).select_related("file_asset")
    ]


def _profile_extra(p: SellerProfile, request: HttpRequest) -> dict[str, Any]:
    org = p.organization
    place = org.addresses.order_by("created_at").first()  # pyright: ignore[reportAttributeAccessIssue]
    return {
        "organization": {
            "id": str(org.pk),
            "label": org.name,
            "approval_state": org.approval_state,
            "created_at": org.created_at.isoformat(),
            "location": ", ".join(dict.fromkeys(x for x in (place.city, place.region) if x)) if place else "",
        },
        "documents": _documents(org, request),
        "history": [
            {
                "id": str(h.pk),
                "from_status": h.from_status,
                "to_status": h.to_status,
                "reason": h.reason,
                "actor": (h.actor.display_name or h.actor.email) if h.actor else None,
                "at": h.at.isoformat(),
            }
            for h in p.history.select_related("actor")[:50]  # pyright: ignore[reportAttributeAccessIssue]
        ],
        "missing_documents": [
            k
            for k in REQUIRED_DOCUMENTS
            if not SellerDocument.objects.filter(seller_organization=org, document_type=k)
            .exclude(verification_status="rejected")
            .exists()
        ],
        "activation_blockers": _activation_blockers(org),
    }


def _in_sentence(label: object) -> str:
    """A choice label inside a sentence: "Business registration" -> "business registration", "KRA PIN" kept."""
    text = str(label)
    return text if text[1:2].isupper() else text[:1].lower() + text[1:]


def _activation_blockers(org: Organization) -> list[str]:
    """Why the seller cannot be activated yet: each required document must be verified and in date."""
    names = dict(SellerDocument.Kind.choices)
    today = timezone.localdate()
    out = []
    for k in REQUIRED_DOCUMENTS:
        verified = SellerDocument.objects.filter(
            seller_organization=org, document_type=k, verification_status="verified"
        )
        if not verified.exclude(expires_at__lt=today).exists():
            out.append(f"Verify the {_in_sentence(names[k])} first.")
    return out


def _update_profile(request: HttpRequest, p: SellerProfile, changes: dict[str, Any]) -> None:
    if p.activation_status not in EDITABLE:
        fail(ErrorCode.CONFLICT, "The profile is locked while the marketplace reviews it.")
    for k, v in changes.items():
        setattr(p, k, v)


def _move(p: SellerProfile, to: str, request: HttpRequest, reason: str = "") -> None:
    SellerStatusChange.objects.create(
        profile=p, from_status=p.activation_status, to_status=to, actor=request.user, reason=reason
    )
    p.activation_status = to


def _notify_managers(p: SellerProfile, *, message: str, params: dict[str, Any], event_id: str) -> None:
    from apps.notifications.services import notify

    for m in Membership.objects.filter(
        organization=p.organization, role_key="seller_manager", status=Membership.Status.ACTIVE
    ).select_related("user"):
        notify(m.user, event_key="approval", event_id=event_id, message=message, params=params, deep_link="/sell")


def _submit(request: HttpRequest, p: SellerProfile, data: dict[str, Any]) -> None:
    missing = _profile_extra(p, request)["missing_documents"]
    problems: dict[str, list[str]] = {}
    if missing:
        names = dict(SellerDocument.Kind.choices)
        problems["documents"] = [f"Upload your {_in_sentence(names[k])}." for k in missing]
    if not p.description_text.strip():
        problems["description"] = ["Tell buyers about the business before you apply."]
    if problems:
        invalid(problems, "A few things are needed before review.")
    _move(p, SellerProfile.Activation.UNDER_REVIEW, request)
    p.submitted_at = timezone.now()
    p.save()
    from apps.notifications.services import notify

    documents = SellerDocument.objects.filter(seller_organization=p.organization).count()
    admins = Membership.objects.filter(role_key="marketplace_admin", status=Membership.Status.ACTIVE).select_related(
        "user"
    )
    for m in admins:
        notify(
            m.user,
            event_key="approval",
            event_id=f"seller:{p.pk}:submitted:{p.submitted_at.isoformat()}",
            message="seller.submitted",
            params={"seller": p.public_name, "documents": documents},
            deep_link=f"/admin/sellers/{p.pk}",
        )


def _decide(to: str, needs_reason: bool, approval: str):
    def handler(request: HttpRequest, p: SellerProfile, data: dict[str, Any]) -> None:
        if to == SellerProfile.Activation.ACTIVE and (blockers := _activation_blockers(p.organization)):
            invalid({"documents": blockers}, "The seller's documents are not all verified yet.")
        reason = (data.get("rejection_reason") or "").strip()
        if needs_reason and not reason:
            invalid({"rejection_reason": ["Say what the seller needs to change."]})
        if len(reason) > 1000:
            invalid({"rejection_reason": ["Keep the reason under 1,000 characters."]})
        _move(p, to, request, reason)
        p.reviewed_by, p.reviewed_at = request.user, timezone.now()
        p.rejection_reason = reason if needs_reason else ""
        p.save()
        p.organization.approval_state = approval
        p.organization.save(update_fields=["approval_state", "updated_at"])
        _notify_managers(
            p,
            message=f"seller.{to}",
            params={"seller": p.public_name, "reason": reason},
            event_id=f"seller:{p.pk}:{to}:{p.reviewed_at.isoformat()}",
        )

    return handler


profile = register(
    Resource(
        key="seller_profile",
        path="seller-profiles",
        model=SellerProfile,
        label="Seller profile",
        label_plural="Seller profiles",
        display_field="public_name",
        fields=(
            Field("id", "uuid", "hidden", read_only=True),
            derive(SellerProfile, "public_name", weight=10),
            derive(SellerProfile, "description", type="richtext", widget="richtext", weight=20),
            derive(SellerProfile, "support_email", weight=30),
            derive(SellerProfile, "support_phone", widget="phone", weight=40),
            derive(
                SellerProfile,
                "activation_status",
                widget="status",
                tones=ACTIVATION_TONES,
                read_only=True,
                filter=("in",),
            ),
            derive(SellerProfile, "reviewed_by", read_only=True, relation={"model": "user", "display": "display_name"}),
            derive(SellerProfile, "reviewed_at", read_only=True, widget="relative-time"),
            derive(SellerProfile, "rejection_reason", read_only=True, field_policy={"write": "seller_profile.review"}),
            derive(SellerProfile, "submitted_at", read_only=True, widget="relative-time"),
            derive(SellerProfile, "updated_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("public_name", "activation_status", "submitted_at", "reviewed_at"),
        search=("public_name",),
        ordering=("-submitted_at", "public_name"),
        writable=("public_name", "description", "support_email", "support_phone"),
        permissions={"list": "seller_profile.get", "get": "seller_profile.get", "update": "seller_profile.update"},
        actions=(
            Action(
                "submit",
                "Send for review",
                "seller_profile.submit",
                _submit,
                tone="primary",
                icon="send",
                when={"activation_status": ["draft", "rejected"]},
            ),
            Action(
                "activate",
                "Activate seller",
                "seller_profile.review",
                _decide("active", False, "approved"),
                tone="primary",
                icon="check",
                when={"activation_status": ["under_review", "suspended"]},
            ),
            Action(
                "reject",
                "Reject application",
                "seller_profile.review",
                _decide("rejected", True, "rejected"),
                tone="danger",
                input=("rejection_reason",),
                confirm=True,
                when={"activation_status": ["under_review"]},
            ),
            Action(
                "suspend",
                "Suspend seller",
                "seller_profile.review",
                _decide("suspended", True, "suspended"),
                tone="warning",
                input=("rejection_reason",),
                confirm=True,
                when={"activation_status": ["active"]},
            ),
        ),
        hooks={"queryset": _profile_queryset, "serialize_extra": _profile_extra, "update": _update_profile},
    )
)


# --- documents --------------------------------------------------------------------------------


def _doc_queryset(request: HttpRequest) -> QuerySet[SellerDocument]:
    qs = SellerDocument.objects.select_related("file_asset", "seller_organization")
    if is_admin(request.user):
        return qs
    return qs.filter(seller_organization=active_membership(request).organization)


def _doc_extra(d: SellerDocument, request: HttpRequest) -> dict[str, Any]:
    return {"file_asset": d.file_asset.describe()}


def _create_doc(request: HttpRequest, data: dict[str, Any]) -> SellerDocument:
    org = active_membership(request).organization
    if org.organization_type != Organization.Type.SELLER:
        fail(ErrorCode.FORBIDDEN, "Only seller organizations upload seller documents.")
    raw = data.get("file_asset")
    asset = (
        FileAsset.objects.filter(pk=raw, organization=org, kind=FileAsset.Kind.DOCUMENT).first()
        if _is_uuid(raw)
        else None
    )
    if asset is None:
        invalid({"file_asset": ["Upload the file first."]})
    profile_obj = SellerProfile.objects.filter(organization=org).first()
    if profile_obj and profile_obj.activation_status == SellerProfile.Activation.UNDER_REVIEW:
        fail(ErrorCode.CONFLICT, "Documents are locked while the marketplace reviews your application.")
    return SellerDocument(
        seller_organization=org,
        document_type=data["document_type"],
        file_asset=asset,
        expires_at=data.get("expires_at"),
    )


def _is_uuid(value: Any) -> bool:
    import uuid

    try:
        uuid.UUID(str(value))
    except ValueError:
        return False
    return True


def _check(status: str):
    def handler(request: HttpRequest, d: SellerDocument, data: dict[str, Any]) -> None:
        notes = (data.get("review_notes") or "").strip()
        if status == "rejected" and not notes:
            invalid({"review_notes": ["Say why the document is not accepted."]})
        d.verification_status, d.review_notes = status, notes[:2000]
        d.save(update_fields=["verification_status", "review_notes"])

    return handler


def _remove_doc(request: HttpRequest, d: SellerDocument, data: dict[str, Any]) -> dict[str, Any]:
    asset = d.file_asset
    d.delete()
    asset.file.delete(save=False)
    asset.delete()
    return {"deleted": True}


document = register(
    Resource(
        key="seller_document",
        path="seller-documents",
        model=SellerDocument,
        label="Seller document",
        label_plural="Seller documents",
        display_field="document_type",
        fields=(
            derive(SellerDocument, "id"),
            derive(
                SellerDocument,
                "seller_organization",
                read_only=True,
                relation={"model": "organization", "display": "name"},
                widget="hidden",
                filter=("eq",),
            ),
            derive(SellerDocument, "document_type", filter=("in",), weight=10),
            derive(
                SellerDocument,
                "file_asset",
                type="file",
                widget="file",
                accept=tuple(settings.AC_UPLOADS["document"]["types"]),
                max_bytes=settings.AC_UPLOADS["document"]["max_bytes"],
                weight=20,
            ),
            derive(
                SellerDocument,
                "verification_status",
                widget="status",
                tones=DOC_TONES,
                read_only=True,
                filter=("in",),
                weight=30,
            ),
            derive(SellerDocument, "expires_at", weight=40),
            derive(
                SellerDocument,
                "review_notes",
                read_only=True,
                field_policy={"write": "seller_document.verify"},
                weight=50,
            ),
            derive(SellerDocument, "created_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("document_type", "file_asset", "verification_status", "expires_at"),
        ordering=("document_type", "-created_at"),
        writable=("document_type", "file_asset", "expires_at"),
        permissions={"list": "seller_document.list", "get": "seller_document.list", "create": "seller_document.create"},
        actions=(
            Action(
                "verify",
                "Mark verified",
                "seller_document.verify",
                _check("verified"),
                tone="primary",
                icon="check",
                input=("review_notes",),
                when={"verification_status": ["pending", "rejected", "expired"]},
            ),
            Action(
                "reject",
                "Reject document",
                "seller_document.verify",
                _check("rejected"),
                tone="danger",
                input=("review_notes",),
                confirm=True,
                when={"verification_status": ["pending", "verified"]},
            ),
            Action(
                "expire",
                "Mark expired",
                "seller_document.verify",
                _check("expired"),
                tone="warning",
                input=("review_notes",),
                when={"verification_status": ["verified"]},
            ),
            Action(
                "remove",
                "Remove document",
                "seller_document.delete",
                _remove_doc,
                kind="archive",
                tone="danger",
                confirm=True,
                when={"verification_status": ["pending", "rejected", "expired"]},
            ),
        ),
        hooks={
            "queryset": _doc_queryset,
            "organization_of": lambda d: d.seller_organization,
            "serialize_extra": _doc_extra,
            "create": _create_doc,
        },
    )
)
