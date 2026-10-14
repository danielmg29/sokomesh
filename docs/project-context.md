# SokoMesh — project context

**Trade without the tangle.** A multi-vendor wholesale ordering and inventory platform. *Soko* is Swahili for market; *mesh* is the connected network of buyers, sellers, catalogue rules, stock, orders and fulfilment events.

## Product

B2B commerce often runs on phone orders, spreadsheet price lists and stock figures that are already out of date when a buyer commits. SokoMesh treats catalogue and inventory data as authoritative on the backend and shows it differently to buyers, sellers and administrators. Reservation and payment algorithms prevent contradictory orders.

**Adaptive Convergence thesis.** Category contracts define product attributes, validation, comparison fields, filter facets, merchandising slots and seller form sections. Price and inventory remain backend-owned and are projected differently to buyers, sellers and administrators.

## Actors and roles

Roles are declared once in `backend/core/policies.py` and exported to the contract. Permission sets are added slice by slice.

| Actor | Role key | Outcome |
|---|---|---|
| Marketplace administrator | `marketplace_admin` | Approves sellers, governs categories, monitors risk, resolves disputes |
| Seller manager | `seller_manager` | Manages catalogue, stock, price books, orders and fulfilment |
| Warehouse operator | `warehouse_operator` | Picks, packs, short-ships and records handover evidence |
| Buyer owner | `buyer_owner` | Controls company members, approvals, credit rules and delivery addresses |
| Buyer purchaser | `buyer_purchaser` | Searches, requests quotes, builds carts and submits approved orders |

## Core journeys

1. An administrator publishes a category contract, and its attributes immediately drive seller entry, buyer filters, product comparison and export columns.
2. A buyer builds a mixed-seller cart, requests approval, and places an order against inventory reservations.
3. Two buyers try to buy the last units at the same time. One reservation succeeds; the other buyer sees a useful alternative.
4. A seller confirms, short-ships or rejects line items, and buyers receive status updates in sequence.
5. A payment webhook is delivered several times but changes the order exactly once.

## Core entities

Organization, Membership, Address, SellerProfile, SellerDocument, BuyerProfile, CategoryContract, Product, Variant, MediaAsset, PriceRule, InventoryMovement, InventoryBalance, Reservation, Cart, CartLine, Quote, Approval, Order, OrderLine, OrderTransition, PaymentIntent, PaymentEvent, Shipment, ReturnCase, Notification, AuditEvent, OutboxEvent.

Representative domain events: `category.published`, `product.published`, `inventory.reserved`, `reservation.expired`, `quote.accepted`, `order.submitted`, `payment.confirmed`, `order.shipped`, `return.opened`.

## Build order

Build in the order of the feature specification, from easiest to hardest. Requirement IDs are traceability keys: use them in issues, PRs, tests, contract keys and Figma annotations.

| Step | ID | Feature | Difficulty |
|---|---|---|---|
| 1 | SM-F-01 | Organization accounts | Foundation |
| 2 | SM-F-02 | Seller onboarding | Foundation |
| 3 | SM-F-22 | Public product pages | Foundation |
| 4 | SM-F-21 | Notifications | Foundation |
| 5 | SM-F-03 | Category contracts | Core CRUD |
| 6 | SM-F-04 | Catalog management | Core CRUD |
| 7 | SM-F-08 | Search and facets | Core CRUD |
| 8 | SM-F-09 | Comparison | Core CRUD |
| 9 | SM-F-10 | Cart | Core CRUD |
| 10 | SM-F-20 | Buyer reorder | Core CRUD |
| 11 | SM-F-05 | Media pipeline | Integrated |
| 12 | SM-F-06 | Price books | Integrated |
| 13 | SM-F-11 | Quote request | Integrated |
| 14 | SM-F-12 | Purchase approval | Integrated |
| 15 | SM-F-15 | Order lifecycle | Integrated |
| 16 | SM-F-19 | Seller analytics | Integrated |
| 17 | SM-F-17 | Delivery tracking | Integrated |
| 18 | SM-F-07 | Inventory ledger | Advanced |
| 19 | SM-F-16 | Fulfillment | Advanced |
| 20 | SM-F-18 | Returns and disputes | Advanced |
| 21 | SM-F-23 | Integration API | Advanced |
| 22 | SM-F-24 | Audit and reconciliation | Advanced |
| 23 | SM-F-13 | Stock reservation | Hard |
| 24 | SM-F-14 | Payment sandbox | Hard |

Portfolio MVP: two organizations, two category contracts, catalogue with responsive media, search and facets, inventory ledger, cart and reservation, payment sandbox, order lifecycle, seller dashboard, Docker Compose and CI.

Rich text (WYSIWYG) is allowed only on `SellerProfile.description`, `CategoryContract.seller_guidance`, `CategoryContract.buyer_guidance` and `Product.description`. Every other long-text field stays plain text.

## Budgets

| Budget | Target |
|---|---|
| Storefront | LCP ≤ 2.5 s on a mid-tier mobile profile; preload the product image only when it is the LCP candidate |
| Search | p95 < 500 ms on the portfolio data set; bounded facets, cursor pagination |
| Checkout | Client sends each submit once; server is idempotent; repeated taps create one payment intent |
| Inventory | No oversell under the concurrent-checkout test; reservations have a TTL and cleanup metrics |
| Memory | Feeds virtualise or paginate; decoded images capped; abandoned requests cancelled |
| Workers | Image, search, notification and expiry queues have concurrency caps, retry ceilings and dead-letter visibility |

## Stack

| Layer | Technology (installed) |
|---|---|
| Backend | Python 3.13, Django 6.1 (ASGI, uvicorn), Channels 4.3, PostgreSQL 17, Redis 7; uv |
| Web | Next.js 16.4 (App Router, Cache Components, React Compiler, typed routes), React 19.3, TypeScript 5.9, Tailwind CSS 4.3, Zod 4, TanStack Query 5, Jotai 3; pnpm 11 |
| Tests | pytest, pytest-django, Hypothesis; Vitest 5, Testing Library, Playwright |
| Delivery | Docker Compose (dev), GitHub Actions CI, pre-commit, just |

## Environments

| Environment | How | Settings |
|---|---|---|
| Local, host processes | `just api`, `just web`, with services from `just bootstrap` | `config.settings.dev` |
| Local, containers | `just up`: web :3000, api :8000, Mailpit :8025, Postgres :5433, Redis :6379 | `config.settings.dev` |
| CI | `.github/workflows/ci.yml` | `config.settings.ci` |
| Production | Not chosen yet. Images build from `infra/docker/` | `config.settings.prod` |

## Canonical commands

| Task | Command |
|---|---|
| First-time setup | `just bootstrap` |
| Everything CI runs | `just check` |
| Export contract and regenerate clients | `just contract` |
| Regenerate web tokens | `just tokens` |
| Tests | `just test` |
| Migrations | `just migrate` |

Without `just`: `cd backend && uv run python manage.py contract export|check`, `uv run pytest`; `cd web && pnpm gen`, `pnpm verify`, `pnpm build`.

## Sources

- Adaptive Convergence v3 Web Manual: the architecture, layout and workflow followed here.
- Adaptive Convergence Portfolio Project Briefs, SokoMesh section: product brief, requirements and budgets.
- SokoMesh Feature Build Order and Field Specification v1.1: build order, proposed field inventory and component catalogue. Field names in that document are recommendations; the requirement IDs and intent are authoritative.
- Portfolio kit `assets/web/02_sokomesh/`: brand assets and tokens (see `docs/design/brand-assets.md`).
