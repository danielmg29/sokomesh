"""`python manage.py expire_quotes`: mark open quotes past their validity as expired (for a scheduler).

Reads also expire due quotes as they happen (apps.quotes.resources.expire_due); this keeps lists that
nobody opens accurate too.
"""

from typing import Any

from django.core.management.base import BaseCommand

from apps.quotes.resources import expire_due


class Command(BaseCommand):
    help = "Expire open quotes whose validity has passed."

    def handle(self, *args: Any, **options: Any) -> None:
        self.stdout.write(self.style.SUCCESS(f"Expired {expire_due()} quotes."))
