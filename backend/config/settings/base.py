"""Settings shared by every environment. Environment modules override, never fork."""

# django-environ types every default as NoValue; settings are the narrowing boundary.
# pyright: reportArgumentType=false

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
REPO_DIR = BASE_DIR.parent

env = environ.Env()
# The repository-root .env is shared with docker compose and the justfile.
environ.Env.read_env(REPO_DIR / ".env")

# SECRET_KEY is set per environment (dev.py has a local default; prod.py requires it).
DEBUG = False
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "channels",
    "core",
    "core.contract",
    "apps.accounts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.csp.ContentSecurityPolicyMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://sokomesh:sokomesh@localhost:5433/sokomesh")
    | {"OPTIONS": {"pool": True}, "CONN_MAX_AGE": 0}
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_URL}}
# Bounded channel layer: per-channel capacity and message expiry (Pillar 4).
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL], "capacity": 1500, "expiry": 30},
    }
}
# Built-in django.tasks (Django 6.0+). A durable worker backend is chosen with the
# first slice that enqueues work; see docs/architecture/decisions.md.
TASKS = {"default": {"BACKEND": "django.tasks.backends.immediate.ImmediateBackend"}}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
SECURE_CSP = {"default-src": ["'self'"], "frame-ancestors": ["'none'"]}

LANGUAGE_CODE = "en-us"
# Languages SokoMesh writes to people in (product owner, 2026-10-13): Kenya's two official languages.
# Labels are endonyms so each reads in its own language in a picker. Exported as the contract's `locales`.
AC_LOCALES = {
    "default": "en-KE",
    "supported": [("en-KE", "English"), ("sw-KE", "Kiswahili")],
}
TIME_ZONE = "UTC"  # stored in UTC; organisations carry their own IANA timezone
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# --- Adaptive Convergence: backend-owned facts exported into the contract ---------

AC_CONTRACT = {
    # Bump with every contract change: major = breaking, minor = additive, patch = presentational.
    "version": "0.2.0",
    "api_base": "/api/v1/",
    "path": Path(env("AC_CONTRACT_PATH", default=str(REPO_DIR / "contract" / "ac-contract.json"))),
}

AC_AUTH = {
    "mode": env("AC_AUTH_MODE", default="multi"),  # "single" | "multi"
    "verification": env.list("AC_VERIFY", default=["email"]),  # [], ["email"], ["sms"], ["email", "sms"]
    "session": "cookie",
}

AC_LIMITS = {
    "default_page_size": 25,
    "max_page_size": 100,
    "max_request_bytes": 1_048_576,
    "max_upload_bytes": 26_214_400,
    "stream_chunk": 500,
    "max_bulk": 500,
}

DATA_UPLOAD_MAX_MEMORY_SIZE = AC_LIMITS["max_request_bytes"]
