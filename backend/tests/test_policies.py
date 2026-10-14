import pytest

from core import policies


@pytest.fixture
def roles(monkeypatch):
    table = {"seller_manager": {"product.*"}, "buyer_purchaser": {"cart.create"}, "marketplace_admin": {"*"}}
    monkeypatch.setattr(policies, "ROLE_PERMISSIONS", table)
    return table


def test_role_has_exact_wildcard_and_prefix(roles):
    assert policies.role_has("buyer_purchaser", "cart.create")
    assert not policies.role_has("buyer_purchaser", "cart.archive")
    assert policies.role_has("seller_manager", "product.publish")
    assert policies.role_has("marketplace_admin", "order.cancel")


def test_unknown_role_has_nothing(roles):
    assert not policies.role_has("visitor", "cart.create")


def test_export_is_sorted(roles):
    assert policies.export_policies()["roles"]["seller_manager"] == ["product.*"]
