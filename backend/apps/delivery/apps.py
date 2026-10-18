from django.apps import AppConfig


class DeliveryConfig(AppConfig):
    name = "apps.delivery"
    label = "delivery"

    def ready(self) -> None:
        from apps.delivery import resources  # noqa: F401  (registers the resources)
