from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    name = "apps.notifications"
    label = "notifications"

    def ready(self) -> None:
        from apps.notifications import resources  # noqa: F401  (registers the SM-F-21 resources)
