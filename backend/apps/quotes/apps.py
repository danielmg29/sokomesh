from django.apps import AppConfig


class QuotesConfig(AppConfig):
    name = "apps.quotes"
    label = "quotes"

    def ready(self) -> None:
        from apps.quotes import resources  # noqa: F401  (registers the resources)
