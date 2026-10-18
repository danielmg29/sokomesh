from django.apps import AppConfig


class CartsConfig(AppConfig):
    name = "apps.carts"
    label = "carts"

    def ready(self) -> None:
        from apps.carts import resources  # noqa: F401  (registers the SM-F-10 resources)
