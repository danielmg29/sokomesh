"""Audit trail, transactional outbox and request correlation (SM-F-24; manual 3.3, 5.3).

Model-agnostic kernel: business apps call `core.events.record.audit()` and `emit()` inside their own
transactions, so an audit row and an outbox event commit (or roll back) with the change they describe.
Resources are named by type and id strings and organizations by id, so this package imports no business app.
`RequestContextMiddleware` gives every request a request id and a correlation id; `bound()` ties work on one
order (reservation, payment, fulfilment, returns) to that order's correlation id.
"""
