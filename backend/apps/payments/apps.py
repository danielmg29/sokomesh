from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    name = "apps.payments"
    label = "payments"

    def ready(self) -> None:
        from apps.payments import handlers  # noqa: F401  (signal receivers)
