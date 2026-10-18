"""Existing products keep working: each category with products gets a first published contract (no
attributes yet), and each product's pack, price and minimum order become its first variant."""

from django.db import migrations
from django.utils import timezone

ALL_UNITS = ["bale", "sack", "carton", "case", "tray", "crate", "jerrycan", "pack", "piece"]


def forwards(apps, schema_editor):
    Category = apps.get_model("catalog", "Category")
    CategoryContract = apps.get_model("catalog", "CategoryContract")
    Product = apps.get_model("catalog", "Product")
    Variant = apps.get_model("catalog", "Variant")
    now = timezone.now()
    for category in Category.objects.filter(products__isnull=False).distinct():
        contract = CategoryContract.objects.create(
            category=category,
            name=category.name,
            version=1,
            status="published",
            unit_rules={"sale_units": ALL_UNITS},
            display_recipe={},
            published_at=now,
        )
        Product.objects.filter(category=category).update(category_contract=contract)
    for p in Product.objects.all():
        Variant.objects.create(
            product=p,
            seller_id=p.seller_id,
            sku=p.sku,
            packaging_unit="pack",
            units_per_pack=1,
            minimum_order_quantity=p.min_order_quantity,
            unit_price=p.unit_price,
            is_active=True,
        )


class Migration(migrations.Migration):
    dependencies = [("catalog", "0003_contracts_variants_search")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
