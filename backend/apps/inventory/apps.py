from django.apps import AppConfig


class InventoryConfig(AppConfig):
    name = "apps.inventory"
    label = "inventory"

    def ready(self) -> None:
        from apps.inventory import handlers, resources  # noqa: F401  (signal receivers and resources)
