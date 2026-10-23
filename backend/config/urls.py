from django.conf import settings
from django.contrib import admin
from django.urls import include, path

from apps.accounts import views as accounts
from apps.analytics import views as analytics
from apps.catalog import views as catalog
from apps.demo import views as demo
from apps.integrations import api as integration
from apps.media import views as media
from apps.notifications import views as notifications
from apps.payments import views as payments
from apps.reconciliation import views as reconciliation
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
    path("prices", catalog.prices, name="prices"),
    path("media/<str:asset_id>", catalog.media_display, name="media-display"),
    path("media/<str:asset_id>/original", catalog.media_original, name="media-original"),
    path("catalog/products/<str:ref>/media", catalog.upload_media, name="media-upload"),
    path("catalog/buyers", catalog.buyers, name="catalog-buyers"),
    path("analytics", analytics.analytics, name="analytics"),
    path("analytics/export", analytics.export, name="analytics-export"),
    path("payments/callbacks/<str:provider>", payments.callback, name="payment-callback"),
    path("payments/<str:intent_id>/simulate", payments.simulate_view, name="payment-simulate"),
    path("reconciliation/checks", reconciliation.checks, name="reconciliation-checks"),
    path("reconciliation/trace", reconciliation.trace_view, name="reconciliation-trace"),
    path("integration/products", integration.products, name="integration-products"),
    path("integration/inventory", integration.inventory, name="integration-inventory"),
    path("integration/inventory/receipts", integration.receipts, name="integration-receipts"),
    path("integration/orders", integration.orders, name="integration-orders"),
    *registry.urls(),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),
    path(settings.AC_CONTRACT["api_base"].lstrip("/"), include(api)),
]
