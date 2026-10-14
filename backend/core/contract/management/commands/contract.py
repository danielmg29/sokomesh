import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.contract.build import build_contract, dump
from core.contract.compat import RANK, bump_made, classify_changes, required_bump


class Command(BaseCommand):
    help = "Export or verify the Adaptive Convergence contract (contract/ac-contract.json)."

    def add_arguments(self, parser):
        parser.add_argument("action", choices=["export", "check"])

    def handle(self, *args, action: str, **opts):
        out: Path = settings.AC_CONTRACT["path"]
        fresh = build_contract()
        committed = json.loads(out.read_text(encoding="utf-8")) if out.exists() else None

        if action == "export":
            # Enforce the version bump here: after export, committed == fresh and `check`
            # can no longer see what changed.
            if committed is not None:
                self._require_bump(committed, fresh)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(dump(fresh), encoding="utf-8", newline="\n")
            self.stdout.write(self.style.SUCCESS(f"wrote {out} ({fresh['meta']['contractVersion']})"))
            return

        if committed is None:
            raise CommandError(f"{out} is missing: run `python manage.py contract export`")
        if committed == fresh:  # parsed comparison: immune to line-ending differences
            self.stdout.write(self.style.SUCCESS("contract up to date"))
            return
        for c in classify_changes(committed, fresh):
            self.stderr.write(f"[{c.kind.name.lower()}] {c.path}: {c.detail}")
        raise CommandError("contract is stale: run `python manage.py contract export`")

    def _require_bump(self, committed: dict, fresh: dict) -> None:
        changes = classify_changes(committed, fresh)
        needed = required_bump(changes)
        old, new = committed["meta"]["contractVersion"], fresh["meta"]["contractVersion"]
        made = bump_made(old, new)
        if needed is None or RANK[made] >= RANK[needed]:
            return
        for c in changes:
            self.stderr.write(f"[{c.kind.name.lower()}] {c.path}: {c.detail}")
        raise CommandError(f"these changes need a {needed.value} bump of AC_CONTRACT['version'] ({old} -> {new})")
