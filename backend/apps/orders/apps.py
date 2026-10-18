from django.apps import AppConfig


class OrdersConfig(AppConfig):
    name = "apps.orders"
    label = "orders"

    def ready(self) -> None:
        from apps.orders import resources  # noqa: F401  (registers the order history and reorder, SM-F-20)
