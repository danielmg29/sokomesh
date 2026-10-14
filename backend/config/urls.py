from django.conf import settings
from django.contrib import admin
from django.urls import include, path

from core.health import healthz

# Business routes are generated from core.operations.registry, never written per model.
api: list = []

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),
    path(settings.AC_CONTRACT["api_base"].lstrip("/"), include(api)),
]
