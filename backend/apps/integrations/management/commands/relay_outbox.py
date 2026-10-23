"""The outbox relay (SM-F-23, SM-F-24): `python manage.py relay_outbox [--once]`.

Turns committed outbox events into webhook deliveries, then posts the deliveries that are due, signed, with
backoff between attempts. With --once it does one pass and exits (for a scheduler); without, it keeps going.
"""

import time
from typing import Any

from django.core.management.base import BaseCommand

from apps.integrations.services import deliver_due, fan_out

IDLE_SECONDS = 5


class Command(BaseCommand):
    help = "Publish outbox events to webhook endpoints and deliver what is due."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--once", action="store_true", help="One pass, then exit.")

    def handle(self, *args: Any, once: bool = False, **options: Any) -> None:
        made = sent = 0
        while True:
            new, done = fan_out(), deliver_due()
            made, sent = made + new, sent + done
            if once:
                break
            if not new and not done:
                time.sleep(IDLE_SECONDS)
        self.stdout.write(self.style.SUCCESS(f"Queued {made} deliveries; attempted {sent}."))
