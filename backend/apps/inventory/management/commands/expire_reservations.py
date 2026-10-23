"""The reservation expiry worker (SM-F-13): `python manage.py expire_reservations [--once]`.

Releases holds past their time in bounded batches and cancels unpaid orders left with nothing on hold. With
--once it drains what is due and exits (for a scheduler); without, it keeps polling (for a worker process).
"""

import time
from typing import Any

from django.core.management.base import BaseCommand

from apps.inventory.services import expire_due

IDLE_SECONDS = 15


class Command(BaseCommand):
    help = "Release expired stock holds and cancel unpaid orders that have none left."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--once", action="store_true", help="Drain what is due, then exit.")

    def handle(self, *args: Any, once: bool = False, **options: Any) -> None:
        released = cancelled = 0
        while True:
            run = expire_due()
            released += run.expired
            cancelled += run.orders_cancelled
            if run.claimed < run.batch_size:  # nothing more due right now
                if once:
                    break
                time.sleep(IDLE_SECONDS)
        self.stdout.write(self.style.SUCCESS(f"Released {released} holds; cancelled {cancelled} unpaid orders."))
