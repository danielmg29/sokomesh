from django.apps import AppConfig


class ReturnsConfig(AppConfig):
    name = "apps.returns"
    label = "returns"

    def ready(self) -> None:
        from apps.returns import resources  # noqa: F401  (registers the resource)
