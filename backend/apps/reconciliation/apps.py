from django.apps import AppConfig


class ReconciliationConfig(AppConfig):
    name = "apps.reconciliation"
    label = "reconciliation"

    def ready(self) -> None:
        from apps.reconciliation import resources  # noqa: F401  (registers the resource)
