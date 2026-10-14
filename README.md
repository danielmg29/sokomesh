<p align="center"><img src="web/public/brand/logo/logo-horizontal.svg" alt="SokoMesh: Trade without the tangle" width="480"></p>

<p align="center"><strong>Multi-vendor wholesale ordering and inventory for Kenyan retailers and wholesalers.</strong><br>
One authoritative record of catalogue, stock, price and order, shown to every buyer, seller and administrator for their own job.</p>

<p align="center">
  <a href="#screenshots">Screenshots</a> ·
  <a href="#what-it-does">What it does</a> ·
  <a href="#how-it-is-built">How it is built</a> ·
  <a href="#design-system">Design system</a> ·
  <a href="#progress">Progress</a> ·
  <a href="#run-it-locally">Run it locally</a>
</p>

---

**Status: foundation and design system complete; features are being built in the order below.** The contract and design-token pipelines run end to end, and every component the app needs is live on the `/design-system` page with Kenyan demo data. Backend features land one requirement at a time, from `SM-F-01` onwards.

> *Soko* is Swahili for market; *mesh* is the connected network of buyers, sellers, catalogue rules, stock, orders and fulfilment events. SokoMesh is a portfolio project: the name and identity are concept work and are not cleared for commercial use, and every organization, person, price and figure in the demo is invented.

## Screenshots

> Screenshots will be added here once the project is complete. Each slot below is reserved for a light and a dark capture of a real, running screen (files go in [`docs/screenshots/`](docs/screenshots/)).

| Screen | Light | Dark |
|---|---|---|
| Landing page | *To be added* | *To be added* |
| Category search with facets | *To be added* | *To be added* |
| Product detail with price tiers | *To be added* | *To be added* |
| Mixed-seller cart and checkout | *To be added* | *To be added* |
| M-Pesa payment and confirmation | *To be added* | *To be added* |
| Seller dashboard and analytics | *To be added* | *To be added* |
| Inventory ledger | *To be added* | *To be added* |
| Warehouse pick, pack and hand over | *To be added* | *To be added* |
| Marketplace administration | *To be added* | *To be added* |
| Design system inventory (`/design-system`) | *To be added* | *To be added* |

## What it does

Wholesale trade in Kenya still runs on phone orders, spreadsheet price lists and stock figures that are out of date before a buyer commits. SokoMesh replaces them with one catalogue and inventory record that the backend owns, and lets every role see that record in the form their work needs.

**Success looks like:** a buyer commits to an order against stock that really exists, at a price the backend can explain, and the order changes state exactly once for every real event.

| Who | What they do in SokoMesh |
|---|---|
| **Buyer purchaser**, at an independent shop, usually on a phone | Searches permitted products, compares, requests quotes, builds one cart across several wholesalers and pays by M-Pesa |
| **Buyer owner** | Manages members, approval limits, credit rules and delivery addresses |
| **Seller manager**, at a regional wholesaler | Manages catalogue, stock, price books, orders and fulfilment from dense desktop tables |
| **Warehouse operator**, on a handheld | Picks, packs, short-ships, substitutes and records handover evidence |
| **Marketplace administrator** | Approves sellers, governs category contracts, monitors risk, resolves disputes |

### The journeys it has to get right

1. An administrator publishes a **category contract**, and its attributes immediately drive seller entry forms, buyer filters, product comparison and export columns, with no bespoke pages.
2. A buyer builds a **mixed-seller cart**, gets approval, and orders against inventory **reservations**.
3. **Two buyers try to buy the last 24 bales at the same moment.** One reservation wins; the other buyer gets a useful way forward, never a negative stock figure.
4. A seller confirms, short-ships or rejects lines, and the buyer sees each change in order.
5. **A payment confirmation arrives several times but changes the order once.** A SellaPay M-Pesa payment counts as confirmed only after the buyer approves the prompt on their own phone and the result is a success.

### Market facts built in

- Money in **KES**, held as decimal strings (never floats) and always shown with currency and two decimals: `KES 1,740.00`.
- Times in **East Africa Time**; phones in **+254** format; addresses by Kenyan county and town.
- Payments by **M-Pesa STK push through SellaPay**.
- Languages **English (`en-KE`)** and **Kiswahili (`sw-KE`)**, published by the backend in the contract.

## How it is built

SokoMesh follows the **Adaptive Convergence** method: the backend owns every business fact, publishes it once as a versioned machine-readable contract, and the web client derives its types, validation and interface from that contract instead of restating it.

```text
backend models / policies / limits / locales
        │  python manage.py contract export   (enforces the semantic version bump)
        ▼
contract/ac-contract.json   ◀── committed, reviewed, versioned (0.2.0)
        │  pnpm contract:gen
        ▼
web/lib/contract/generated.ts   (types, Zod schemas, limits, roles, locales)
        │
        ▼
Projection kernel: recipes × slots × field registry → every list, card, form and detail view

design/tokens/*.json (DTCG) ── pnpm tokens:gen ──▶ app/tokens.generated.css + lib/design/tokens.generated.ts
```

- **One source per fact.** Fields, permissions, limits and choices live in the backend; colours, type, spacing, radii and motion live in `design/tokens/`. Generated files are never edited by hand, and CI fails if any of them drifts from its source.
- **Derived, then configured, then divergent.** Repeated UI is projected from contract metadata (a product card, a price, a stock stamp). Only genuinely bespoke surfaces, such as the category contract builder, product comparison and warehouse pick-pack, are hand-built, each with a written justification.
- **Bounded by design.** Lists paginate by cursor, reservations have a time limit, uploads and bulk actions have contract-published limits, and payments are idempotent.

### Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13, Django 6.1 (ASGI), Channels, PostgreSQL 17, Redis 7, uv |
| Web | Next.js 16 (App Router, Cache Components, React Compiler), React 19, TypeScript, Tailwind CSS 4, Radix primitives, Zod 4, TanStack Query, pnpm |
| Tests | pytest, pytest-django, Hypothesis; Vitest, Testing Library, Playwright |
| Delivery | Docker Compose, GitHub Actions, pre-commit, just |

## Design system

The visual language is **WOVEN TRADE**: a wholesale market drawn as one connected commercial record, built to read as modern trade infrastructure rather than a SaaS dashboard.

- **UNIT** is a bounded commercial object, drawn as a square cell in a ruled grid.
- **THREAD** is movement between states, drawn as a connector whose stroke says how far it has gone.
- **STAMP** is an authoritative state (available, reserved, paid, shipped), drawn as a small rectangle with a mark and a word, never colour alone.

| | |
|---|---|
| **Blend** | Clean and minimalist 40%, geometric 25%, professional 20%, organic 10%, flat 5% |
| **Colour** | Warm stone by day, warm graphite at night; restrained forest green (`#145C43`) for action and brand; trade yellow (`#F5B63C`) only for signals such as reserved stock and applied filters |
| **Type** | Archivo in two widths: normal for interface text, SemiExpanded for headings and prices so quantities read like trade signage. JetBrains Mono for SKUs and IDs |
| **Shape** | Containers and images are square; what you press or what labels a state has a 2px corner |
| **Depth** | Borders over shadows; joined grid cells instead of floating cards |
| **Photography** | Real product photographs cut out of their backgrounds and set on a theme-aware ground, so one file works in light and dark |
| **Modes** | MARKET (buyers, photography-led), LEDGER (sellers and admins, dense and numeric), FLOW (checkout and warehouse, state-heavy) |

The live inventory at **`/design-system`** renders all 150 catalogued pieces from the real components: 11 foundations, 18 primitives, 26 field widgets, 18 kernel pieces, 10 blocks, 28 commerce extensions, 3 divergent surfaces, 11 marketing sections and 25 page templates, each in every state the specification names, in both themes. The binding rules are in the [design constitution](docs/design/constitution.md); how they landed in code is in [DESIGN.md](DESIGN.md).

## Progress

Requirement IDs (`SM-F-xx`) come from the SokoMesh Feature Build Order and Field Specification v1.1 and are used in issues, tests, contract keys and commits. Features are built in the specification's order, from foundation to hardest.

### Foundation

- [x] Monorepo layout (`contract/`, `backend/`, `web/`, `design/`, `infra/`, `docs/`) with `just` commands for every routine task
- [x] Django 6.1 ASGI backend with split settings, health checks, a custom user model, role policies and an error registry
- [x] Versioned contract export with automatic semantic-version enforcement and a CI drift check
- [x] Generated web client: types, Zod schemas, limits, roles and supported locales from the contract
- [x] Design-token pipeline from DTCG JSON to OKLCH CSS and TypeScript, with light and dark themes
- [x] Contrast tests for every colour pairing in both themes, plus copy rules (no dashes as separators)
- [x] Import-tier lint rules (`lib` ← `ui` ← `layout` ← `kernel` ← `commerce` ← `features` ← `app`)
- [x] Docker Compose development stack (Postgres, Redis, Mailpit), Dockerfiles, pre-commit hooks and a GitHub Actions workflow
- [x] Brand kit integrated, with an approved reversed logo and mark for dark grounds
- [ ] Operation registry, keyset pagination, changesets and idempotency keys in the backend kernel (lands with `SM-F-01`)
- [ ] Outbox, event relay and WebSocket gateway (lands with the first real-time topic, `SM-F-15`)
- [ ] Object storage and upload policy (lands with `SM-F-02` and `SM-F-05`)
- [ ] Production deployment target, images and deploy workflow

### Design system

- [x] Projection kernel: recipes (intent, density, tone, surface), semantic slots including the price `figure`, field registry, projected forms, list, detail, stats, filters, activity and chat blocks
- [x] UI primitives: buttons, inputs, selects, combobox, date picker, dialogs, sheets, tables, toasts, stamps, threads, charts, theme switch
- [x] Every commerce component in the specification (stock, pricing, cart, checkout, orders, catalogue, admin, notifications)
- [x] 25 page templates composed live from the real blocks
- [x] Dark mode for every component, with the reader's choice applied before first paint
- [x] Trade-infrastructure remodel: warm neutral grounds, square containers, joined grids, Archivo type system, ribbon motif, three-tier public header
- [x] Product photography: eight open-licence photographs cut out by a reproducible script, with generated credits
- [x] Notification language preference driven by the contract's locales
- [x] SellaPay confirmation rule reflected in the payment interface
- [ ] Accessibility test pass (axe) on every projected page
- [ ] Visual regression captures of the design-system page

### Features, in build order

Each feature is done when its UI is designed, its backend models, rules and permissions publish to the contract, and its live pages run against the API with tests.

- [ ] **1. `SM-F-01` Organization accounts**
  - [x] UI designed: sign-in and registration, organization settings, member lists
  - [ ] Organization, Membership and Address models, permissions and contract
  - [ ] Live pages and tests
- [ ] **2. `SM-F-02` Seller onboarding**
  - [x] UI designed: seller application, document evidence, onboarding review
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **3. `SM-F-22` Public product pages**
  - [x] UI designed: landing page, product detail, public header and footer
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **4. `SM-F-21` Notifications**
  - [x] UI designed: notification list and bell, preferences by event, channel and language
  - [ ] Backend, sender and translated templates
  - [ ] Live pages and tests
- [ ] **5. `SM-F-03` Category contracts**
  - [x] UI designed: category contract builder with live derived surfaces
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **6. `SM-F-04` Catalog management**
  - [x] UI designed: product editor, variant matrix
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **7. `SM-F-08` Search and facets**
  - [x] UI designed: facet filter panel, category results, cursor pagination
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **8. `SM-F-09` Comparison**
  - [x] UI designed: product comparison of two to four products, normalised prices
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **9. `SM-F-10` Cart**
  - [x] UI designed: cart grouped by seller
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **10. `SM-F-20` Buyer reorder**
  - [x] UI designed: reorder difference view
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **11. `SM-F-05` Media pipeline**
  - [x] UI designed: media manager with upload, processing and rejection states
  - [ ] Backend, storage and image workers
  - [ ] Live pages and tests
- [ ] **12. `SM-F-06` Price books**
  - [x] UI designed: price book editor, price tier table
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **13. `SM-F-11` Quote request**
  - [x] UI designed: quote request sheet, quote decision panel
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **14. `SM-F-12` Purchase approval**
  - [x] UI designed: approval flow
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **15. `SM-F-15` Order lifecycle**
  - [x] UI designed: order timeline and order detail
  - [ ] Backend, transitions and real-time updates
  - [ ] Live pages and tests
- [ ] **16. `SM-F-19` Seller analytics**
  - [x] UI designed: seller analytics grid and revenue chart with a table view
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **17. `SM-F-17` Delivery tracking**
  - [x] UI designed: delivery tracking with delays and proof of delivery
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **18. `SM-F-07` Inventory ledger**
  - [x] UI designed: inventory ledger, stock availability indicator
  - [ ] Immutable movement ledger, balances and contract
  - [ ] Live pages and tests
- [ ] **19. `SM-F-16` Fulfillment**
  - [x] UI designed: warehouse pick, pack and hand over
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **20. `SM-F-18` Returns and disputes**
  - [x] UI designed: return and dispute case
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **21. `SM-F-23` Integration API**
  - [x] UI designed: API tokens and webhook endpoints
  - [ ] Backend, tokens and webhook delivery
  - [ ] Live pages and tests
- [ ] **22. `SM-F-24` Audit and reconciliation**
  - [x] UI designed: reconciliation trace by correlation ID
  - [ ] Backend and contract
  - [ ] Live pages and tests
- [ ] **23. `SM-F-13` Stock reservation**
  - [x] UI designed: reservation indicator and countdown, checkout summary
  - [ ] Concurrency-safe reservations with a time limit and expiry worker
  - [ ] Concurrent-checkout test proving no oversell
- [ ] **24. `SM-F-14` Payment sandbox**
  - [x] UI designed: SellaPay M-Pesa payment states, confirmed only on a successful phone result
  - [ ] Payment intents, idempotent confirmation, and the result delivery path from SellaPay
  - [ ] Live pages and tests

### Portfolio release

- [ ] Two demo organizations and two category contracts seeded (`seed_demo`)
- [ ] End-to-end tests for the core journeys (Playwright)
- [ ] Performance budgets met: storefront LCP ≤ 2.5 s on mid-tier mobile, search p95 < 500 ms
- [ ] Deployed demo
- [ ] Screenshots added above

## Run it locally

Needs [uv](https://docs.astral.sh/uv/), Node 24 with pnpm (via Corepack), Docker, and [just](https://just.systems/). On Windows, run `just` from Git Bash.

```bash
just bootstrap   # .env, dependencies, git hooks, Postgres/Redis/Mailpit
just migrate
just api         # http://localhost:8000/healthz
just web         # http://localhost:3000, design system at /design-system
```

Or run the whole stack in containers with `just up`.

### Checks

`just check` runs what CI runs: ruff, pyright, contract check and pytest for the backend; generation drift, typecheck, ESLint (including import tiers) and Vitest for the web. Without `just`:

```bash
cd backend && uv run python manage.py contract check && uv run pytest
cd web && pnpm verify && pnpm build
```

## Repository layout

```text
contract/       ac-contract.json (generated, committed, reviewed) and CHANGELOG.md
backend/        Django 6.1 ASGI API (uv)
  config/         settings/{base,dev,ci,prod}.py, asgi.py, urls.py
  core/           fixed kernel: result, http, policies, contract/, operations/, events/, auth/
  apps/           business apps: models, commands, domain rules only
web/            Next.js 16 App Router (pnpm)
  app/            routes and layouts only
  components/     ui/ (primitives), layout/, kernel/ (projection), commerce/ (shared commerce)
  features/       declarative overrides and justified divergent UI only
  lib/            contract/ (generated + types), design/ (generated tokens), brand.ts
  tools/          contract and token generators
  public/         brand/ (logo kit), images/products/ (demo photographs)
design/
  tokens/         brand primitives and the semantic token layer (light, dark, density, type, shape, motion)
  photography/    photo sources and the cut-out script
infra/          compose.yaml, docker/{api,web}.Dockerfile
docs/           project context, design constitution, brand assets, architecture decisions
```

## Documentation

- [Product](PRODUCT.md): users, purpose, operating context, constraints and principles
- [Project context](docs/project-context.md): roles, entities, build order, budgets, commands
- [Design constitution](docs/design/constitution.md): the binding design brief and its 2026-10-13 amendment
- [DESIGN.md](DESIGN.md): the shipped design system, token by token
- [Brand assets](docs/design/brand-assets.md): logo usage rules and where every kit file lives
- [Architecture decisions](docs/architecture/decisions.md): deliberate deviations and deferred work
- [Contract changelog](contract/CHANGELOG.md)

## Credits

Demo product photographs are open-licence images from Wikimedia Commons, cut out for the interface; authors and licences are listed in [`web/public/images/products/README.md`](web/public/images/products/README.md). CC BY-SA cut-outs are shared under the same licence as their source.
