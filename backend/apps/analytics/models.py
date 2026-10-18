"""SM-F-19 seller analytics: metrics defined once and used everywhere (cards, chart, export).

A MetricDefinition names what is aggregated, over which source, with which fixed filters and which
breakdowns it allows; apps.analytics.engine turns a definition into one bounded query. Definitions are
versioned: changing what a metric means is a new version, so earlier exports can say which one they used.
"""

import uuid

from django.db import models


class MetricDefinition(models.Model):
    class Aggregation(models.TextChoices):
        SUM = "sum", "Sum"
        COUNT = "count", "Count"
        AVG = "avg", "Average"
        RATIO = "ratio", "Ratio"

    class Source(models.TextChoices):
        ORDER = "order", "Orders"
        ORDER_LINE = "order_line", "Order lines"
        VARIANT = "variant", "Variants (stock now)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.SlugField("Key", max_length=40)
    name = models.CharField("Name", max_length=80)
    aggregation = models.CharField("Aggregation", max_length=10, choices=Aggregation.choices)
    source_entity = models.CharField("Source", max_length=20, choices=Source.choices)
    measure = models.CharField("Measure", max_length=40, blank=True, help_text="The field summed or averaged.")
    # {"where": {...}} for sum, count and avg; {"numerator": {...}, "denominator": {...}} for a ratio.
    filters_json = models.JSONField("Filters", default=dict, blank=True)
    dimensions_json = models.JSONField("Breakdowns", default=list, blank=True)
    unit = models.CharField("Unit", max_length=20, blank=True)  # KES, percent, count
    # Which way is good news: a rise in revenue is, a rise in cancellations is not.
    better = models.CharField(
        "Better when", max_length=6, choices=[("higher", "Higher"), ("lower", "Lower")], default="higher"
    )
    description = models.TextField("What it means", blank=True)
    version = models.PositiveIntegerField("Version", default=1)
    position = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("position", "key")
        constraints = (models.UniqueConstraint(fields=["key", "version"], name="metric_key_version_unique"),)

    def __str__(self) -> str:
        return f"{self.key} v{self.version}"
