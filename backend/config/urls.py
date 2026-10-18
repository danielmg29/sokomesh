from django.conf import settings
from django.contrib import admin
from django.urls import include, path

from apps.accounts import views as accounts
from apps.catalog import views as catalog
from apps.demo import views as demo
from apps.media import views as media
from apps.notifications import views as notifications
from core.health import healthz
from core.operations import registry

# Workflow routes first (they share prefixes with registry routes, e.g. notifications/summary), then
# the routes the registry generates for every registered resource. No per-model views. Paths carry no
# trailing slash: the web app proxies /api through Next.js, which normalises trailing slashes away.
api = [
    path("session", accounts.session, name="session"),
    path("session/organization", accounts.switch_organization, name="session-organization"),
    path("auth/register", accounts.register, name="register"),
    path("auth/login", accounts.sign_in, name="login"),
    path("auth/logout", accounts.sign_out, name="logout"),
    path("auth/verify", accounts.verify, name="verify"),
    path("auth/verify/resend", accounts.resend, name="verify-resend"),
    path("account/profile", accounts.profile, name="account-profile"),
    path("account/avatar", accounts.avatar, name="account-avatar"),
    path("account/password", accounts.password, name="account-password"),
    path("invitations/<str:token>", accounts.invitation, name="invitation"),
    path("files", media.upload, name="file-upload"),
    path("files/<str:asset_id>", media.download, name="file-download"),
    path("notifications/summary", notifications.summary, name="notification-summary"),
    path("notifications/read-all", notifications.read_all, name="notification-read-all"),
    path("notification-preferences/locale", notifications.set_locale, name="notification-locale"),
    path("demo/accounts", demo.accounts, name="demo-accounts"),
    path("compare", catalog.compare, name="compare"),
    *registry.urls(),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),
    path(settings.AC_CONTRACT["api_base"].lstrip("/"), include(api)),
]
