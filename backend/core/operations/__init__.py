"""Reusable list/get/create/update/archive/bulk/stream operations (manual 4.3).

`listing` holds the list-query grammar every list endpoint uses (search, declared filters, allow-listed
ordering, bounded keyset pages). The operation registry, changesets and idempotency land with the first
registered model (SM-F-01 Organization accounts), which also mounts the first list endpoint on `listing`.
Models never get bespoke views.
"""
