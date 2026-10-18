from django.apps import AppConfig


class SellersConfig(AppConfig):
    name = "apps.sellers"
    label = "sellers"

    def ready(self) -> None:
        from apps.sellers import resources  # noqa: F401  (registers the SM-F-02 resources)
