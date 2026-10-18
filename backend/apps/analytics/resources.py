"""Metric definitions, readable by sellers (to explain each figure) and administrators; written by migrations."""

from apps.analytics.models import MetricDefinition
from core.operations.registry import Resource, derive, register

metric_definition = register(
    Resource(
        key="metric_definition",
        path="metric-definitions",
        model=MetricDefinition,
        label="Metric",
        label_plural="Metrics",
        display_field="name",
        tenant_scoped=False,
        fields=(
            derive(MetricDefinition, "id"),
            derive(MetricDefinition, "key", read_only=True, widget="code"),
            derive(MetricDefinition, "name", read_only=True),
            derive(MetricDefinition, "aggregation", read_only=True),
            derive(MetricDefinition, "source_entity", read_only=True),
            derive(MetricDefinition, "unit", read_only=True),
            derive(MetricDefinition, "better", read_only=True),
            derive(MetricDefinition, "description", read_only=True),
            derive(MetricDefinition, "dimensions_json", read_only=True),
            derive(MetricDefinition, "version", read_only=True),
        ),
        list_fields=("name", "key", "aggregation", "unit", "version"),
        search=("name", "key"),
        ordering=("key", "-version"),
        default_page_size=50,
        permissions={"list": "metric_definition.list", "get": "metric_definition.list"},
        hooks={"organization_of": lambda d: None},
    )
)
