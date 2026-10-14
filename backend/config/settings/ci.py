"""Automated tests and CI. Same services as dev, faster hashing."""

from .dev import *  # noqa: F403

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
TASKS = {"default": {"BACKEND": "django.tasks.backends.dummy.DummyBackend"}}
