from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    name = "apps.integrations"
    label = "integrations"

    def ready(self) -> None:
        from apps.integrations import resources  # noqa: F401  (registers the resources)
