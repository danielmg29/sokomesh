"""Database tests run wherever Postgres runs: always in CI, locally once `just bootstrap` has started it.

Outside CI, if the configured database does not answer within two seconds, tests that need it are
skipped with a reason instead of failing on a connection error. In CI (`CI` is set) nothing is skipped,
so a missing database fails the run.
"""

import os

import psycopg
import pytest
from django.conf import settings


def _database_answers() -> bool:
    db = settings.DATABASES["default"]
    try:
        params = {"dbname": db["NAME"], "user": db["USER"], "password": db["PASSWORD"], "host": db["HOST"]}
        psycopg.connect(**params, port=db["PORT"], connect_timeout=2).close()
    except psycopg.OperationalError:
        return False
    return True


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    needs_db = [item for item in items if item.get_closest_marker("django_db")]
    if not needs_db or os.environ.get("CI") or _database_answers():
        return
    skip = pytest.mark.skip(reason="Postgres is not running locally (`just bootstrap` starts it); CI runs these.")
    for item in needs_db:
        item.add_marker(skip)
