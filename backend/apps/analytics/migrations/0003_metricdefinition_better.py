"""Metric definitions say which way is good news, so cards colour a change by meaning, not by sign."""

from django.db import migrations, models

LOWER_IS_BETTER = ["cancellation_rate", "stock_risk"]


def mark(apps, schema_editor):
    MetricDefinition = apps.get_model("analytics", "MetricDefinition")
    MetricDefinition.objects.filter(key__in=LOWER_IS_BETTER).update(better="lower")


class Migration(migrations.Migration):
    dependencies = [("analytics", "0002_metric_definitions")]

    operations = [
        migrations.AddField(
            model_name="metricdefinition",
            name="better",
            field=models.CharField(
                choices=[("higher", "Higher"), ("lower", "Lower")],
                default="higher",
                max_length=6,
                verbose_name="Better when",
            ),
        ),
        migrations.RunPython(mark, migrations.RunPython.noop),
    ]
