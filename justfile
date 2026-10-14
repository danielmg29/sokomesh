# One command per task (manual 8.6). Requires just, uv, pnpm and Docker; on Windows run from Git Bash.
set dotenv-load

compose := "docker compose -f infra/compose.yaml"

default:
    @just --list

# first-time setup: env file, dependencies, git hooks, backing services
bootstrap:
    cp -n .env.example .env || true
    cd backend && uv sync
    cd web && pnpm install
    uvx pre-commit install
    {{compose}} up -d db redis mailpit

# full stack in containers: web :3000, api :8000, mail :8025
up:
    {{compose}} up --build

down:
    {{compose}} down

# API on the host (services from bootstrap): http://localhost:8000
api:
    cd backend && uv run uvicorn config.asgi:application --reload --port 8000

# web app on the host: http://localhost:3000
web:
    cd web && pnpm dev

migrate:
    cd backend && uv run python manage.py makemigrations && uv run python manage.py migrate

# export the contract from the backend and regenerate every client
contract:
    cd backend && uv run python manage.py contract export
    cd web && pnpm contract:gen

# regenerate web tokens from design/tokens
tokens:
    cd web && pnpm tokens:gen

test:
    cd backend && uv run pytest -q
    cd web && pnpm test

e2e:
    cd web && pnpm e2e

# everything CI runs, locally
check:
    cd backend && uv run ruff check . && uv run ruff format --check . && uv run pyright
    cd backend && uv run python manage.py contract check && uv run pytest -q
    cd web && pnpm verify
