"""Settings shared by every environment. Environment modules override, never fork."""

# django-environ types every default as NoValue; settings are the narrowing boundary.
# pyright: reportArgumentType=false

import os
from pathlib import Path
from urllib.parse import parse_qsl, urlparse

import environ
from dotenv import load_dotenv

load_dotenv()

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
    "core.events",
    "apps.accounts",
    "apps.media",
    "apps.organizations",
    "apps.notifications",
    "apps.sellers",
    "apps.catalog",
    "apps.carts",
    "apps.orders",
    "apps.quotes",
    "apps.delivery",
    "apps.analytics",
    "apps.inventory",
    "apps.payments",
    "apps.fulfillment",
    "apps.returns",
    "apps.integrations",
    "apps.reconciliation",
    "apps.demo",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "core.events.middleware.RequestContextMiddleware",
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

# Replace the DATABASES section of your settings.py with this
tmpPostgres = urlparse(os.getenv("DATABASE_URL"))

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": tmpPostgres.path.replace("/", ""),
        "USER": tmpPostgres.username,
        "PASSWORD": tmpPostgres.password,
        "HOST": tmpPostgres.hostname,
        "PORT": 5432,
        "OPTIONS": dict(parse_qsl(tmpPostgres.query)),
    }
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
# The only HTML the four rich-text fields may store (spec p.5; widened by the product owner on
# 2026-10-14 to carry underline, strikethrough, inline code, quotes, rules, captioned images, video
# embeds and simple tables). core/richtext.py sanitises against it on every write; it is exported as
# the contract's `richText`, which the web editor and its preview mirror. Tags map to their allowed
# attributes. Images load over https or from this origin; video is stored as an oEmbed reference to
# an allow-listed provider, never as an iframe, and the client builds the player from `player`.
AC_RICH_TEXT = {
    "tags": {
        "p": [],
        "br": [],
        "h3": [],
        "h4": [],
        "strong": [],
        "em": [],
        "u": [],
        "s": [],
        "code": [],
        "ul": [],
        "ol": [],
        "li": [],
        "blockquote": [],
        "hr": [],
        "a": ["href"],
        "figure": ["class"],
        "figcaption": [],
        "img": ["src", "alt"],
        "oembed": ["url"],
        "table": [],
        "thead": [],
        "tbody": [],
        "tr": [],
        "th": [],
        "td": [],
    },
    "classes": {"figure": ["image", "media"]},
    "link_schemes": ["https", "http", "mailto"],
    "image_schemes": ["https"],
    "same_origin_images": True,
    "embeds": [
        {
            "name": "YouTube",
            "url": r"^https://www\.youtube\.com/watch\?v=([A-Za-z0-9_-]{11})$",
            "player": "https://www.youtube-nocookie.com/embed/{id}",
        },
        {
            "name": "Vimeo",
            "url": r"^https://vimeo\.com/(\d{6,12})$",
            "player": "https://player.vimeo.com/video/{id}?dnt=1",
        },
    ],
}

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
    "version": "1.0.0",
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

# One parameter grammar for every list endpoint (core/operations/listing.py), exported as `listQuery` so
# clients build the same parameters. A filter is one parameter per field and operator, `<field>__<op>`;
# `in` takes a comma-separated list and a range is sent as `__gte` plus `__lte`. A date-only bound on a
# datetime field is a whole calendar day in `date_timezone` (prices and times are shown in EAT).
AC_LIST_QUERY = {
    "search": "q",
    "ordering": "ordering",
    "page_size": "page_size",
    "cursor": "cursor",
    "operator_separator": "__",
    "list_separator": ",",
    "operators": ["eq", "in", "contains", "gte", "lte", "isnull"],
    "max_search_length": 200,
    "max_search_terms": 8,
    "max_list_values": 50,
    "count_cap": 10_000,
    "date_timezone": "Africa/Nairobi",
}

DATA_UPLOAD_MAX_MEMORY_SIZE = AC_LIMITS["max_request_bytes"]

# Uploaded files (apps.media). Documents are private and served only through GET /files/<id> after a
# permission check; nothing under MEDIA_ROOT is published directly. Types are checked by content.
MEDIA_ROOT = Path(env("AC_MEDIA_ROOT", default=str(BASE_DIR / "media")))
MEDIA_URL = "/media/"
AC_UPLOADS = {
    "document": {"types": ["application/pdf", "image/jpeg", "image/png"], "max_bytes": 10 * 1_048_576},
    "avatar": {"types": ["image/jpeg", "image/png", "image/webp"], "max_bytes": 2 * 1_048_576},
    "product_image": {"types": ["image/jpeg", "image/png", "image/webp"], "max_bytes": 15 * 1_048_576},
}
# SM-F-05 media jobs: an in-process pool of `workers` with at most `queue` waiting (the rest stay queued for
# `manage.py process_media`); `eager` processes at upload (tests). Photographs above `max_pixels` or with a
# longer side under `min_long_side` are refused.
AC_MEDIA = {"workers": 2, "queue": 8, "eager": False, "max_pixels": 40_000_000, "min_long_side": 600}
# SM-F-17: a shipment with no news for this long is shown as stale (last known state, with its time).
AC_DELIVERY = {"stale_hours": 24}
# SM-F-13: checkout holds stock this long for payment; the expiry worker releases holds in batches.
AC_RESERVATIONS = {"ttl_minutes": 15, "batch_size": 100}
# SM-F-14: "sandbox" simulates the buyer's phone and signs its results; "sellapay" sends real STK pushes
# (SellaPay v1 has no result callback, so those payments cannot be confirmed automatically yet).
AC_PAYMENTS = {
    "provider": env("AC_PAYMENT_PROVIDER", default="sandbox"),
    "sandbox": env.bool("AC_PAYMENT_SANDBOX", default=True),
    "sandbox_secret": env("AC_PAYMENT_SANDBOX_SECRET", default=""),
    "stale_minutes": 3,
    "signature_tolerance_seconds": 300,
    "sellapay_base": env("SELLAPAY_BASE_URL", default="https://pay.sellapay.co.ke/api/v1"),
    "sellapay_key": env("SELLAPAY_API_KEY", default=""),
    "sellapay_secret": env("SELLAPAY_API_SECRET", default=""),
}
# SM-F-18: cases may be opened this many days after delivery, with at most this many evidence files.
AC_RETURNS = {"window_days": 14, "max_evidence": 10}
# SM-F-23: token requests per minute; webhook timeouts. Private addresses only in tests.
AC_INTEGRATIONS = {"requests_per_minute": 100}
AC_WEBHOOKS = {"timeout_seconds": 5, "allow_private": False}
FILE_UPLOAD_MAX_MEMORY_SIZE = 2_621_440

# The public site, for links in emails (verification, invitations, notifications).
AC_SITE_URL = str(env("NEXT_PUBLIC_SITE_URL", default="http://localhost:3000")).rstrip("/")

# Seeded demo accounts are listed on the sign-in page, password included, only where this is on.
AC_DEMO_ACCOUNTS = env.bool("AC_DEMO_ACCOUNTS", default=False)
AC_THROTTLE = True

# Email. With BREVO_API_KEY set, mail goes through Brevo's transactional API from BREVO_SENDER_EMAIL
# (a sender verified in Brevo). Without it, environments choose their own mailer (dev: Mailpit).
BREVO_API_KEY = env("BREVO_API_KEY", default="")
DEFAULT_FROM_EMAIL = env("BREVO_SENDER_EMAIL", default="SokoMesh <no-reply@sokomesh.local>")
if BREVO_API_KEY:
    MAILERS = {
        "default": {
            "BACKEND": "core.mail.BrevoBackend",
            "OPTIONS": {"api_key": BREVO_API_KEY, "sender_email": DEFAULT_FROM_EMAIL, "sender_name": "SokoMesh"},
        }
    }

SESSION_COOKIE_AGE = 14 * 24 * 3600
SESSION_COOKIE_HTTPONLY = True
