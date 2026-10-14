"""Local development: plain HTTP on localhost, verbose errors."""

# django-environ types every default as NoValue; settings are the narrowing boundary.
# pyright: reportArgumentType=false

from .base import *  # noqa: F403
from .base import env

DEBUG = True
SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-only-insecure-key-change-me")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "api"])

# Local HTTP: secure-only cookies would never be sent.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=["http://localhost:3000"])

# Mailpit captures every outgoing email locally (http://localhost:8025).
MAILERS = {
    "default": {
        "BACKEND": "django.core.mail.backends.smtp.EmailBackend",
        "OPTIONS": {"host": env("EMAIL_HOST", default="localhost"), "port": env.int("EMAIL_PORT", default=1025)},
    }
}
