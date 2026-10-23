"""Stock the sellers reported before the ledger becomes each tracked pack's opening balance (SM-F-07)."""

from django.db import migrations
from django.utils import timezone


def open_balances(apps, schema_editor):
    Variant = apps.get_model("catalog", "Variant")
    Location = apps.get_model("inventory", "Location")
    Balance = apps.get_model("inventory", "Balance")
    Movement = apps.get_model("inventory", "Movement")
    Address = apps.get_model("organizations", "Address")
    now = timezone.now()
    locations = {}
    for v in Variant.objects.exclude(stock_on_hand=None).order_by("seller_id", "sku"):
        location = locations.get(v.seller_id)
        if location is None:
            address = Address.objects.filter(organization_id=v.seller_id).order_by("created_at").first()
            location = Location.objects.create(seller_id=v.seller_id, name=address.label if address else "Main warehouse", address=address, is_default=True)
            locations[v.seller_id] = location
        balance = Balance.objects.create(seller_id=v.seller_id, variant=v, location=location, on_hand=v.stock_on_hand)
        Movement.objects.create(
            seller_id=v.seller_id,
            variant=v,
            balance=balance,
            movement_type="receipt",
            quantity=v.stock_on_hand,
            on_hand_change=v.stock_on_hand,
            available_after=v.stock_on_hand,
            on_hand_after=v.stock_on_hand,
            unit=v.packaging_unit,
            reference_type="opening",
            reference_label="Opening balance (stock reported before the ledger)",
            occurred_at=now,
        )


class Migration(migrations.Migration):
    dependencies = [("inventory", "0001_initial"), ("catalog", "0007_alter_variant_stock_on_hand"), ("organizations", "0001_initial")]

    operations = [migrations.RunPython(open_balances, migrations.RunPython.noop)]
