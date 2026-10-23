from django.apps import AppConfig


class FulfillmentConfig(AppConfig):
    name = "apps.fulfillment"
    label = "fulfillment"

    def ready(self) -> None:
        from apps.fulfillment import handlers, resources  # noqa: F401  (signal receivers and resources)
