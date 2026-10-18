from django.apps import AppConfig


class OrganizationsConfig(AppConfig):
    name = "apps.organizations"
    label = "organizations"

    def ready(self) -> None:
        from apps.organizations import resources  # noqa: F401  (registers the SM-F-01 resources)
        from apps.organizations.tenancy import roles
        from core.policies import set_role_resolver

        set_role_resolver(roles)
