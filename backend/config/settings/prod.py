"""Production. Every secret and host comes from the environment; nothing defaults."""

# django-environ types every default as NoValue; settings are the narrowing boundary.
# pyright: reportArgumentType=false

from .base import *  # noqa: F403
from .base import env

SECRET_KEY = env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS")
# Options in the URL (a managed database's `?sslmode=require`, say) are kept; the connection pool is added.
_database = env.db("DATABASE_URL")
DATABASES = {"default": _database | {"OPTIONS": {**_database.get("OPTIONS", {}), "pool": True}, "CONN_MAX_AGE": 0}}

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31_536_000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
