from django.apps import AppConfig


class CatalogConfig(AppConfig):
    name = "apps.catalog"
    label = "catalog"

    def ready(self) -> None:
        from apps.catalog import resources, signals  # noqa: F401  (registers resources; keeps search documents current)
