"""Automated tests and CI. Same services as dev, faster hashing, nothing leaves the machine."""

# django-environ types every default as NoValue; settings are the narrowing boundary.
# pyright: reportArgumentType=false

import os

from .dev import *  # noqa: F403
from .dev import env

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
TASKS = {"default": {"BACKEND": "django.tasks.backends.dummy.DummyBackend"}}

# Tests never touch the application database (which may be hosted): CI's service container in CI,
# the compose `db` container (just bootstrap) on a laptop, or TEST_DATABASE_URL when set.
_LOCAL_DB = "postgres://sokomesh:sokomesh@localhost:5433/sokomesh"
DATABASES = {
    "default": env.db("TEST_DATABASE_URL", default=os.environ["DATABASE_URL"] if os.environ.get("CI") else _LOCAL_DB)
}

# Mail stays in memory, the cache in process, and attempts are not throttled.
MAILERS = {"default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
AC_THROTTLE = False
AC_DEMO_ACCOUNTS = True
