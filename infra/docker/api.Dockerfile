# One image for every backend process (api now; gateway, relay and worker as they land),
# so they always run the same code against the same contract. Build context: repo root.
FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv
WORKDIR /app

FROM base AS deps
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project

FROM base AS runtime
RUN useradd --create-home app
# The virtualenv lives outside /app so a dev bind mount of backend/ cannot hide it.
COPY --from=deps /opt/venv /opt/venv
COPY backend/ ./
COPY contract/ /contract/
ENV PATH="/opt/venv/bin:$PATH" DJANGO_SETTINGS_MODULE=config.settings.prod
RUN DJANGO_SECRET_KEY=build-only DJANGO_ALLOWED_HOSTS=build DJANGO_CSRF_TRUSTED_ORIGINS=https://build \
    DATABASE_URL=postgres://build@localhost/build python manage.py collectstatic --noinput
USER app
EXPOSE 8000
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers"]
