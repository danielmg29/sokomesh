"""The media worker (SM-F-05): `python manage.py process_media [--once]`.

Takes queued photographs in small batches (and requeues any a stopped worker left half done). With
--once it empties the queue and exits, for schedulers; without, it keeps polling, for a worker process.
"""

import time
from typing import Any

from django.core.management.base import BaseCommand

from apps.catalog.media import process, requeue_stuck
from apps.catalog.models import MediaAsset

BATCH = 20
IDLE_SECONDS = 2


class Command(BaseCommand):
    help = "Process queued product photographs (verify, measure, strip metadata, publish the display copy)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--once", action="store_true", help="Empty the queue, then exit.")

    def handle(self, *args: Any, once: bool = False, **options: Any) -> None:
        done = 0
        while True:
            requeue_stuck()
            batch = list(
                MediaAsset.objects.filter(processing_status=MediaAsset.Processing.QUEUED)
                .order_by("created_at")
                .values_list("pk", flat=True)[:BATCH]
            )
            for pk in batch:
                process(pk)
                done += 1
            if not batch:
                if once:
                    break
                time.sleep(IDLE_SECONDS)
        self.stdout.write(self.style.SUCCESS(f"Processed {done} photographs."))
