"""SM-F-03, 04, 08, 09, 10 and 20 through the HTTP API, as the web client uses them."""

import uuid
from datetime import timedelta
from decimal import Decimal

import pytest
from django.test import Client
from django.utils import timezone

from apps.carts.models import Cart, CartLine
from apps.catalog.contracts import definition_errors
from apps.catalog.models import CategoryContract, Product, Variant
from apps.orders.models import Order, OrderLine, OrderTransition
from apps.organizations.models import Organization
from apps.sellers.models import SellerProfile
from tests.test_features import FLOUR, call, catalogue, person, signed_in, world  # noqa: F401  (fixtures)

pytestmark = pytest.mark.django_db


def second_product(catalogue, **attributes) -> Product:  # noqa: F811
    p = Product(
        seller=catalogue.seller,
        category=catalogue.category,
        category_contract=catalogue.category_contract,
        name="Unga Bora Baking Flour 2 kg",
        slug="unga-bora-baking-flour-2kg",
        attributes={"grain": "wheat", "unit_size": 2, **attributes},
        status="published",
    )
    p.full_clean()
    p.save()
    v = Variant(
        product=p,
        seller=p.seller,
        sku="UBF-2K-10",
        packaging_unit="bale",
        units_per_pack=10,
        minimum_order_quantity=5,
        unit_price="1690.00",
    )
    v.full_clean()
    v.save()
    return p


# --- SM-F-03: category contracts ---------------------------------------------------------------


def test_contract_definitions_are_checked():
    bad = definition_errors(
        [
            {"key": "Grain", "label": "Grain", "type": "enum", "choices": []},
            {"key": "notes", "label": "Notes", "type": "string"},
            {"key": "colour", "label": "Colour", "type": "decimal", "variant": True},
        ],
        {"sale_units": ["lorry"], "normalise": {"attribute": "notes", "per": "kg", "factor": 1}},
        ["notes"],
        ["missing"],
        {"card_keys": ["notes", "colour", "notes"]},
    )
    assert set(bad) == {"attribute_schema", "unit_rules", "facet_keys", "comparison_keys", "display_recipe"}
    keys = ("attribute_schema", "unit_rules", "facet_keys", "comparison_keys", "display_recipe")
    assert definition_errors(*(FLOUR[k] for k in keys)) == {}


def test_administrators_draft_publish_and_revise_versions(world, catalogue):  # noqa: F811
    admin = signed_in(world["admin"])
    current = catalogue.category_contract
    status, draft = call(admin, "post", f"category-contracts/{current.pk}/revise", {})
    assert status == 200 and draft["status"] == "draft" and draft["version"] == current.version + 1
    assert call(admin, "post", f"category-contracts/{current.pk}/revise", {})[0] == 409  # one draft at a time
    assert call(admin, "patch", f"category-contracts/{current.pk}", {"name": "Flour"})[0] == 409  # immutable
    schema = [*FLOUR["attribute_schema"], {"key": "brand_origin", "label": "Origin", "type": "string"}]
    status, body = call(
        admin,
        "patch",
        f"category-contracts/{draft['id']}",
        {"facet_keys": ["brand_origin"], "attribute_schema": schema},
    )
    assert status == 422 and "facet_keys" in body["fields"]  # free text cannot be a buyer filter
    status, _ = call(
        admin, "patch", f"category-contracts/{draft['id']}", {"name": "Flour and grains", "attribute_schema": schema}
    )
    assert status == 200
    status, published = call(admin, "post", f"category-contracts/{draft['id']}/publish", {})
    assert status == 200 and published["status"] == "published" and published["published_by"]["label"]
    current.refresh_from_db()
    catalogue.category.refresh_from_db()
    assert current.status == "retired" and catalogue.category.name == "Flour and grains"
    # The public sees only published versions; only administrators write.
    page = call(Client(), "get", "category-contracts")[1]
    assert [r["status"] for r in page["results"]] == ["published"]
    manager = signed_in(world["manager"])
    assert call(manager, "post", "category-contracts", {"category": str(catalogue.category_id)})[0] == 403


# --- SM-F-04: catalogue management ----------------------------------------------------------------


def test_sellers_create_validate_and_publish_products(world, catalogue):  # noqa: F811
    manager = signed_in(world["manager"])
    contract = str(catalogue.category_contract_id)
    status, body = call(
        manager,
        "post",
        "catalog/products",
        {
            "name": "Mavuno Whole Meal 2 kg",
            "category_contract": contract,
            "attributes": {"grain": "barley", "unit_size": 2},
        },
    )
    assert status == 422 and body["fields"]["attributes.grain"]  # field-level guidance from the contract
    status, made = call(
        manager,
        "post",
        "catalog/products",
        {
            "name": "Mavuno Whole Meal 2 kg",
            "category_contract": contract,
            "attributes": {"grain": "maize", "unit_size": "2"},
        },
    )
    assert status == 201 and made["slug"] == "mavuno-whole-meal-2-kg" and made["status"] == "draft"
    assert made["publish_blockers"] == ["Add at least one variant that is on sale."]
    assert call(manager, "post", f"catalog/products/{made['id']}/publish", {})[0] == 409
    variant = {
        "product": made["id"],
        "sku": "MVW-2K-12",
        "packaging_unit": "carton",
        "units_per_pack": "12",
        "minimum_order_quantity": 5,
        "unit_price": "1620.00",
    }
    status, body = call(manager, "post", "catalog/variants", variant)
    assert status == 422 and body["fields"]["packaging_unit"]  # the contract sells flour by the bale or sack
    assert (
        call(manager, "post", "catalog/variants", {**variant, "packaging_unit": "bale", "sku": "MVN-2K-12"})[0] == 422
    )  # SKU taken
    status, v = call(manager, "post", "catalog/variants", {**variant, "packaging_unit": "bale"})
    assert (
        status == 201
        and v["pack_label"] == "Bale of 12 × 2 kg"
        and v["normalised_price"] == {"amount": "67.50", "per": "kg"}
    )
    status, live = call(manager, "post", f"catalog/products/{made['id']}/publish", {})
    assert status == 200 and live["status"] == "published"
    assert call(Client(), "get", "products/mavuno-whole-meal-2-kg")[0] == 200
    # Other sellers' products are invisible to this seller, and buyers cannot use the seller catalogue.
    assert call(signed_in(world["owner"]), "get", "catalog/products")[0] == 403


def test_unapproved_sellers_cannot_publish(catalogue):  # noqa: F811
    lakeside = Organization.objects.create(name="Lakeside Supplies", organization_type="seller")
    SellerProfile.objects.create(organization=lakeside, public_name="Lakeside", activation_status="under_review")
    joseph = signed_in(person("joseph@example.com", lakeside, "seller_manager"))
    _, made = call(
        joseph,
        "post",
        "catalog/products",
        {
            "name": "Maize 2 kg",
            "category_contract": str(catalogue.category_contract_id),
            "attributes": {"grain": "maize", "unit_size": 2},
        },
    )
    call(
        joseph,
        "post",
        "catalog/variants",
        {
            "product": made["id"],
            "sku": "LK-1",
            "packaging_unit": "bale",
            "units_per_pack": 12,
            "minimum_order_quantity": 1,
            "unit_price": "1500",
        },
    )
    status, body = call(joseph, "post", f"catalog/products/{made['id']}/publish", {})
    assert status == 409 and "approve" in body["detail"]


# --- SM-F-08: search and facets ----------------------------------------------------------------------


def test_search_filters_on_contract_facets_seller_price_and_stock(catalogue):  # noqa: F811
    second_product(catalogue, fortified=False)
    cat = f"category__eq={catalogue.category_id}"
    page = call(Client(), "get", f"products?{cat}&attr.grain__in=maize")[1]
    assert [r["slug"] for r in page["results"]] == ["mavuno-maize-flour-2kg"]
    assert page["facets"]["counts"]["attr.grain"] == {"maize": 1, "wheat": 1}  # its own filter left out
    assert call(Client(), "get", f"products?{cat}&attr.fortified__eq=false")[1]["total"] == 1
    assert call(Client(), "get", f"products?{cat}&attr.unit_size__gte=1.5&attr.unit_size__lte=2")[1]["total"] == 2
    assert call(Client(), "get", "products?attr.grain__in=maize")[0] == 422  # buyer filters need their category
    assert call(Client(), "get", f"products?{cat}&attr.grain__in=barley")[0] == 422  # not one of the choices
    assert call(Client(), "get", "products?q=UBF-2K")[1]["total"] == 1  # SKUs are in the search body
    assert call(Client(), "get", "products?unit_price__lte=1700")[1]["results"][0]["unit_price"] == "1690.00"
    in_stock = call(Client(), "get", "products?in_stock__eq=true")[1]
    assert in_stock["total"] == 2  # untracked stock is not "out of stock"
    Variant.objects.filter(sku="MVN-2K-12").update(stock_on_hand=0)
    Product.objects.get(slug="mavuno-maize-flour-2kg").save()  # rebuild its document
    assert call(Client(), "get", "products?in_stock__eq=true")[1]["total"] == 1
    seller = call(Client(), "get", f"products?seller__in={catalogue.seller_id}")[1]
    assert seller["facets"]["options"]["seller"][0]["label"] == "Mwangaza Wholesalers"


def test_pages_step_forwards_and_back(catalogue):  # noqa: F811
    second_product(catalogue)
    first = call(Client(), "get", "products?ordering=unit_price&page_size=1")[1]
    assert first["previous"] is None and first["next"] and first["results"][0]["unit_price"] == "1690.00"
    second = call(Client(), "get", f"products?ordering=unit_price&page_size=1&cursor={first['next']}")[1]
    assert second["results"][0]["unit_price"] == "1740.00" and second["next"] is None and second["previous"]
    back = call(Client(), "get", f"products?ordering=unit_price&page_size=1&cursor={second['previous']}")[1]
    assert back["results"] == first["results"] and back["previous"] is None and back["next"]


def test_unpublished_products_never_reach_search(catalogue):  # noqa: F811
    catalogue.status = "draft"
    catalogue.published_at = None
    catalogue.save()
    assert call(Client(), "get", "products")[1]["total"] == 0
    catalogue.status = "published"
    catalogue.available_from = timezone.now() + timedelta(days=3)  # listed later
    catalogue.save()
    assert call(Client(), "get", "products")[1]["total"] == 0


# --- SM-F-09: comparison ------------------------------------------------------------------------------


def test_comparison_uses_contract_keys_normalised_prices_and_explicit_gaps(catalogue):  # noqa: F811
    other = second_product(catalogue)
    status, state = call(Client(), "get", f"compare?products={catalogue.pk},{other.pk}")
    assert status == 200 and state["comparison_keys"] == ["grain", "unit_size", "fortified"]
    first, second = state["products"]
    assert first["normalised_price"] == {"amount": "72.50", "per": "kg"}  # 1740 / (12 × 2 kg)
    assert second["normalised_price"] == {"amount": "84.50", "per": "kg"}  # 1690 / (10 × 2 kg)
    assert state["missing_value_keys"] == {str(catalogue.pk): [], str(other.pk): ["fortified"]}
    too_many = ",".join(str(uuid.uuid4()) for _ in range(5))
    assert call(Client(), "get", f"compare?products={too_many}")[0] == 422
    with_other = Product.objects.filter(pk=other.pk)
    with_other.update(category=Product.objects.get(pk=catalogue.pk).category)  # same category still
    assert call(Client(), "get", f"compare?products={catalogue.pk},{other.pk}")[0] == 200


# --- SM-F-10: cart ---------------------------------------------------------------------------------------


def test_buyers_keep_a_validated_cart_grouped_by_seller(world, catalogue):  # noqa: F811
    variant = Variant.objects.get(sku="MVN-2K-12")
    brian = signed_in(world["purchaser"])
    status, body = call(brian, "post", "cart-lines", {"variant": str(variant.pk), "quantity": 2})
    assert status == 422 and body["fields"]["quantity"] == ["The minimum order is 5 packs."]
    assert call(brian, "post", "cart-lines", {"variant": str(variant.pk), "quantity": 41})[0] == 422  # only 40 in stock
    status, line = call(brian, "post", "cart-lines", {"variant": str(variant.pk), "quantity": 5})
    assert status == 201 and line["quoted_unit_price"] == "1740.00"
    status, again = call(brian, "post", "cart-lines", {"variant": str(variant.pk), "quantity": 5})
    assert again["id"] == line["id"] and again["quantity"] == 10  # the same variant adds to its line
    cart = call(brian, "get", "carts?status__in=active")[1]["results"][0]
    assert cart["groups"][0]["seller"]["label"] == "Mwangaza Wholesalers" and cart["subtotal"] == "17400.00"
    # A price rise shows on the line and in the total, but the quote moves only when accepted.
    Variant.objects.filter(pk=variant.pk).update(unit_price=Decimal("1790.00"))
    cart = call(brian, "get", f"carts/{cart['id']}")[1]
    assert cart["state"] == "repricing" and cart["groups"][0]["lines"][0]["quoted_unit_price"] == "1740.00"
    status, cart = call(brian, "post", f"carts/{cart['id']}/accept_prices", {})
    assert status == 200 and cart["state"] == "valid" and cart["version"] > 1
    assert call(brian, "patch", f"cart-lines/{line['id']}", {"quantity": 6})[1]["quantity"] == 6
    assert call(brian, "post", f"cart-lines/{line['id']}/remove", {})[1] == {"deleted": True}
    # Sellers have no cart, and an organization waiting for approval cannot order.
    assert (
        call(signed_in(world["manager"]), "post", "cart-lines", {"variant": str(variant.pk), "quantity": 5})[0] == 403
    )
    pending = Organization.objects.create(name="Baraka Mini-Mart", organization_type="buyer")
    baraka = signed_in(person("baraka@example.com", pending, "buyer_owner"))
    assert call(baraka, "post", "cart-lines", {"variant": str(variant.pk), "quantity": 5})[0] == 409


# --- SM-F-20: reorder ------------------------------------------------------------------------------------


def test_reorder_copies_history_into_a_fresh_cart_with_explicit_differences(world, catalogue):  # noqa: F811
    buyer, grace = world["buyer"], world["owner"]
    lead = Variant.objects.get(sku="MVN-2K-12")
    gone = second_product(catalogue)
    order = Order.objects.create(
        order_number="SO-1",
        buyer_organization=buyer,
        seller_organization=catalogue.seller,
        submitted_by=grace,
        subtotal=Decimal("23300"),
        total=Decimal("23300"),
        status="delivered",
        submitted_at=timezone.now() - timedelta(days=7),
    )
    OrderTransition.objects.create(order=order, to_status="submitted", occurred_at=order.submitted_at)
    OrderLine.objects.create(
        order=order,
        variant=lead,
        product_name_snapshot="Mavuno",
        sku_snapshot="MVN-2K-12",
        quantity_ordered=3,
        unit="bale",
        unit_price="1690.00",
        line_total="5070.00",
    )
    OrderLine.objects.create(
        order=order,
        variant=Variant.objects.get(product=gone),
        product_name_snapshot="Unga Bora",
        sku_snapshot="UBF-2K-10",
        quantity_ordered=5,
        unit="bale",
        unit_price="1690.00",
        line_total="8450.00",
    )
    gone.status = "archived"
    gone.save()
    client = signed_in(grace)
    old = Cart.objects.create(buyer_organization=buyer, created_by=grace)
    held = CartLine(cart=old, variant=lead, quantity=5)
    held.full_clean()
    held.save()
    preview = call(client, "get", f"orders/{order.pk}")[1]["reorder"]
    assert preview["addable"] == 1 and preview["current_cart_lines"] == 1
    status, result = call(client, "post", f"orders/{order.pk}/reorder", {})
    assert status == 200 and result["replaced_cart_lines"] == 1
    first, second = result["line_differences"]
    assert first["kinds"] == ["price", "moq"] and first["now"]["quantity"] == 5  # raised to today's minimum
    assert second["kinds"] == ["discontinued"] and result["unavailable_line_ids"] == [second["line_id"]]
    new = Cart.objects.get(pk=result["new_cart_id"])
    assert new.status == "active" and CartLine.objects.get(cart=new).quoted_unit_price == Decimal("1740.00")
    old.refresh_from_db()
    order.refresh_from_db()
    assert old.status == "abandoned" and OrderLine.objects.get(
        order=order, sku_snapshot="MVN-2K-12"
    ).unit_price == Decimal("1690.00")
    seller_view = call(signed_in(world["manager"]), "get", f"orders/{order.pk}")[1]  # the seller's side (SM-F-15)
    assert seller_view["side"] == "seller" and "reorder" not in seller_view["_can"] and "reorder" not in seller_view


def test_contract_versions_are_monotonic_per_category(catalogue):  # noqa: F811
    draft = CategoryContract(category=catalogue.category, name="Next", **FLOUR)
    draft.full_clean()
    draft.save()
    assert draft.version == catalogue.category_contract.version + 1


def test_drafts_may_be_incomplete_but_publishing_needs_every_required_detail(world, catalogue):  # noqa: F811
    manager = signed_in(world["manager"])
    status, draft = call(
        manager,
        "post",
        "catalog/products",
        {"name": "Mavuno Sifted 5 kg", "category_contract": str(catalogue.category_contract_id)},
    )
    assert status == 201 and "Fill in the details Flour & grains asks for." in draft["publish_blockers"]
    status, body = call(manager, "patch", f"catalog/products/{draft['id']}", {"attributes": {"unit_size": 0}})
    assert status == 422 and body["fields"]["attributes.unit_size"] == ["Use at least 0.1 kg."]
