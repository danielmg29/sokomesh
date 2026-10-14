"""HTTP entry point. The WebSocket gateway (manual 5.3) is added as
`websocket_application` with the first real-time topic."""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

application = get_asgi_application()
