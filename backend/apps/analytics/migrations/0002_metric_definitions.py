"""The first metric definitions (version 1). A change of meaning is a new version, never an edit."""

from django.db import migrations

PLACED = ["pending_approval", "cancelled"]  # not counted as sales
DISPATCHED = ["shipped", "delivered", "disputed"]

DEFINITIONS = [
    {
        "key": "revenue",
        "name": "Revenue",
        "aggregation": "sum",
        "source_entity": "order",
        "measure": "total",
        "filters_json": {"where": {"status_not_in": PLACED}},
        "dimensions_json": ["day", "buyer"],
        "unit": "KES",
        "description": "Order totals placed with you in the period, excluding cancelled orders and orders still awaiting the buyer's approval.",
        "position": 1,
    },
    {
        "key": "orders",
        "name": "Orders",
        "aggregation": "count",
        "source_entity": "order",
        "filters_json": {"where": {"status_not_in": PLACED}},
        "dimensions_json": ["day"],
        "unit": "count",
        "description": "Orders placed with you in the period, excluding cancelled orders and orders awaiting approval.",
        "position": 2,
    },
    {
        "key": "average_order_value",
        "name": "Average order",
        "aggregation": "avg",
        "source_entity": "order",
        "measure": "total",
        "filters_json": {"where": {"status_not_in": PLACED}},
        "dimensions_json": [],
        "unit": "KES",
        "description": "Revenue divided by orders, over the same orders.",
        "position": 3,
    },
    {
        "key": "fill_rate",
        "name": "Fill rate",
        "aggregation": "ratio",
        "source_entity": "order",
        "filters_json": {
            "numerator": {"status_in": DISPATCHED, "never_status": "partially_fulfilled"},
            "denominator": {"status_in": DISPATCHED},
        },
        "dimensions_json": [],
        "unit": "percent",
        "description": "Of the orders you dispatched in the period, the share that left complete (never short-shipped).",
        "position": 4,
    },
    {
        "key": "cancellation_rate",
        "name": "Cancellations",
        "aggregation": "ratio",
        "source_entity": "order",
        "filters_json": {"numerator": {"status_in": ["cancelled"]}, "denominator": {"status_not_in": ["pending_approval"]}},
        "dimensions_json": [],
        "unit": "percent",
        "description": "Of the orders placed with you in the period, the share cancelled by you or the buyer.",
        "position": 5,
    },
    {
        "key": "stock_risk",
        "name": "Stock at risk",
        "aggregation": "count",
        "source_entity": "variant",
        "filters_json": {"where": {"active": True, "stock_below_moq_times": 3}},
        "dimensions_json": [],
        "unit": "count",
        "description": "Variants on sale whose reported stock is below three minimum orders, right now.",
        "position": 6,
    },
    {
        "key": "product_revenue",
        "name": "Revenue by product",
        "aggregation": "sum",
        "source_entity": "order_line",
        "measure": "line_total",
        "filters_json": {"where": {"status_not_in": PLACED}},
        "dimensions_json": ["product", "day"],
        "unit": "KES",
        "description": "Line totals by product over the same orders as revenue; the top ten are listed.",
        "position": 7,
    },
]


def forwards(apps, schema_editor):
    MetricDefinition = apps.get_model("analytics", "MetricDefinition")
    for d in DEFINITIONS:
        MetricDefinition.objects.update_or_create(key=d["key"], version=1, defaults=d)


def backwards(apps, schema_editor):
    apps.get_model("analytics", "MetricDefinition").objects.filter(version=1, key__in=[d["key"] for d in DEFINITIONS]).delete()


class Migration(migrations.Migration):
    dependencies = [("analytics", "0001_initial")]
    operations = [migrations.RunPython(forwards, backwards)]
