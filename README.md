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

**Status: foundation, design system and the first seventeen features are live.** The four foundation features (organization accounts `SM-F-01`, seller onboarding `SM-F-02`, public product pages `SM-F-22`, notifications `SM-F-21`), the six Core CRUD features (category contracts `SM-F-03`, catalogue management `SM-F-04`, search and facets `SM-F-08`, comparison `SM-F-09`, cart `SM-F-10`, buyer reorder `SM-F-20`) and the seven Integrated features (media pipeline `SM-F-05`, price books `SM-F-06`, quote requests `SM-F-11`, purchase approval `SM-F-12`, order lifecycle `SM-F-15`, seller analytics `SM-F-19`, delivery tracking `SM-F-17`) run against the API with seeded demo data; every other component is live on the `/design-system` page. Features land one requirement at a time in the order below; the inventory ledger (`SM-F-07`) is next.

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
backend models / policies / limits / locales / rich-text allow-list
        │  python manage.py contract export   (enforces the semantic version bump)
        ▼
contract/ac-contract.json   ◀── committed, reviewed, versioned (0.6.0)
        │  pnpm contract:gen
        ▼
web/lib/contract/generated.ts   (types, Zod schemas, limits, uploads, roles, locales, rich-text policy)
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
| Backend | Python 3.13, Django 6.1 (ASGI), Channels, PostgreSQL 17, Redis 7, nh3 (HTML sanitising), Brevo (email), uv |
| Web | Next.js 16 (App Router, Cache Components, React Compiler), React 19, TypeScript, Tailwind CSS 4, Radix primitives, Tiptap (rich text), Zod 4, TanStack Query, pnpm |
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
| **Photography** | Real product photographs cut out of their backgrounds and set on a theme-aware ground, so one file works in light and dark; scene photographs of shops, warehouses, roads and fields, graded as one set, lead every MARKET page |
| **Modes** | MARKET (buyers, photography-led), LEDGER (sellers and admins, dense and numeric), FLOW (checkout and warehouse, state-heavy) |

The live inventory at **`/design-system`** renders all 161 catalogued pieces from the real components: 11 foundations, 19 primitives, 26 field widgets, 20 kernel pieces, 10 blocks, 33 commerce extensions, 3 divergent surfaces, 14 marketing sections and 25 page templates, each in every state the specification names, in both themes. The binding rules are in the [design constitution](docs/design/constitution.md); how they landed in code is in [DESIGN.md](DESIGN.md).

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
- [x] List-query grammar in the backend kernel and the contract: declared search, filters and ordering, bounded keyset pages with signed cursors, and a web client that sends the same table state
- [x] Two-way keyset pages (each page returns `next` and `previous` cursors), resource-declared filters for one request (a category contract's facets) and facet counts beside the page (with `SM-F-08`)
- [x] Operation registry in the backend kernel: one resource declaration generates the routes, the contract model (fields, commands, API path), the commands each record permits and its list endpoint (with `SM-F-01`); command inputs are input-only fields, so every command dialog is projected (with `SM-F-15`)
- [ ] Changesets and idempotency keys for writes (checkout is protected by locking and converting the cart; keys land with payments)
- [ ] Outbox, event relay and WebSocket gateway (order changes notify in-app and by email until live order and stock topics land)
- [x] Upload policy: file types checked from their contents, per-kind size limits published in the contract (`uploads`), seller documents served only to their organization and the marketplace reviewers (with `SM-F-02`)
- [x] Email: Brevo's transactional API when `BREVO_API_KEY` is set, Mailpit in development, in-memory in tests
- [ ] S3-compatible object storage and virus scanning (uploads and product photographs go through `default_storage`, on local disk until a deployment target is chosen)
- [ ] Production deployment target, images and deploy workflow

### Design system

- [x] Projection kernel: recipes (intent, density, tone, surface), semantic slots including the price `figure`, field registry, projected forms, list, detail, stats, filters, activity and chat blocks
- [x] UI primitives: buttons, inputs, selects, combobox, date picker, dialogs, sheets, tables, toasts, stamps, threads, charts, theme switch
- [x] Every commerce component in the specification (stock, pricing, cart, checkout, orders, catalogue, admin, notifications)
- [x] 25 page templates composed live from the real blocks
- [x] Dark mode for every component, with the reader's choice applied before first paint
- [x] Trade-infrastructure remodel: warm neutral grounds, square containers, joined grids, Archivo type system, ribbon motif, three-tier public header
- [x] Product photography: eight open-licence photographs cut out by a reproducible script, with generated credits
- [x] Storefront layouts after the reference sites: two-door photographic hero, photographic category tiles, product rows of square wells, an oversized statement, photographic stories, a catalogue page with one filter and sort bar, and a two-column product page with a sticky buying column; eleven graded Unsplash scene photographs
- [x] Every table searches, filters and pages live through one tested query engine (word search ignoring case and accents, facet chips with live counts, contract-bounded page sizes)
- [x] Notification language preference driven by the contract's locales
- [x] SellaPay confirmation rule reflected in the payment interface
- [x] Rich-text document editor (CKEditor 5 style): headings, emphasis, links, lists with indent, quotes, captioned images, YouTube and Vimeo video, tables, undo and word count, on an allow-list the backend owns and sanitises
- [x] URL list controls: filters, search, sort, products per page and previous/next written to the address as the contract's list grammar, so every filtered page is server-rendered, shareable and crawlable
- [ ] Accessibility test pass (axe) on every projected page
- [ ] Visual regression captures of the design-system page

### Features, in build order

Each feature is done when its UI is designed, its backend models, rules and permissions publish to the contract, and its live pages run against the API with tests.

- [x] **1. `SM-F-01` Organization accounts**
  - [x] UI designed: sign-in and registration, organization settings, member lists
  - [x] Organization, Membership and Address models, permissions and contract
  - [x] Live pages and tests: registration confirmed by an emailed code, sign-in with the seeded demo accounts, profile with photo, settings, organization details, team invitations and roles, addresses
- [x] **2. `SM-F-02` Seller onboarding**
  - [x] UI designed: seller application, document evidence, onboarding review
  - [x] Backend and contract: seller profile with a rich-text description, private documents, submission, review decisions with reasons; activation only once the registration and KRA PIN certificates are verified
  - [x] Live pages and tests: seller application and marketplace review
- [x] **3. `SM-F-22` Public product pages**
  - [x] UI designed: landing page, product detail, public header and footer
  - [x] Backend and contract: only published products from approved sellers; canonical URL, schema.org JSON-LD and breadcrumbs derived by the backend
  - [x] Live pages and tests: landing, catalogue, category and product pages, server-rendered
- [x] **4. `SM-F-21` Notifications**
  - [x] UI designed: notification list and bell, preferences by event, channel and language
  - [x] Backend, sender and translated templates: in-app and email, per-event preferences, deduplicated delivery, English and Kiswahili wording
  - [x] Live pages and tests: bell, inbox, preferences and language
- [x] **5. `SM-F-03` Category contracts**
  - [x] UI designed: category contract builder with live derived surfaces
  - [x] Backend and contract: versioned contracts (attributes, units and normalisation, buyer filters, comparison rows, display hints, rich-text guidance for sellers and buyers); drafts are checked, published versions are immutable, publishing retires the previous version and renames the category
  - [x] Live pages and tests: administrators list versions, edit drafts in the builder, publish and start new drafts
- [x] **6. `SM-F-04` Catalog management**
  - [x] UI designed: product editor, variant matrix
  - [x] Backend and contract: products with category details validated against their contract (field-level messages), sellable variants with SKUs unique per seller, packs the category is sold by, minimum orders, prices and reported stock; drafts may be incomplete, publishing needs an approved seller, every required detail and a variant on sale
  - [x] Live pages and tests: the seller's product list (filters, search, page size), new product, editor with generated category details and the variant matrix, publish, take off sale, archive and restore
- [x] **7. `SM-F-08` Search and facets**
  - [x] UI designed: facet filter panel, category results, cursor pagination
  - [x] Backend and contract: a search document per product rebuilt whenever it changes; search over titles, descriptions, SKUs and attribute values; filters by category, seller, price and stock, plus each category contract's buyer filters, with live counts; unpublished products never reach results
  - [x] Live pages and tests: catalogue and category pages with filters, sort, products per page and previous/next, all in the URL
- [x] **8. `SM-F-09` Comparison**
  - [x] UI designed: product comparison of two to four products, normalised prices
  - [x] Backend and contract: a comparison projection on the category contract's comparable attributes, prices per normalised unit, buyer-visible stock and explicit gaps; one category at a time
  - [x] Live pages and tests: compare toggles on product cells and pages, a comparison tray, and the comparison page with add to cart
- [x] **9. `SM-F-10` Cart**
  - [x] UI designed: cart grouped by seller
  - [x] Backend and contract: one server-backed cart per buyer and organization, lines grouped by seller, minimum order and stock checked on every change, price snapshots with explicit acceptance of new prices, a version per change
  - [x] Live pages and tests: buy box on product pages, cart page, cart link in the public header
- [x] **10. `SM-F-20` Buyer reorder**
  - [x] UI designed: reorder difference view
  - [x] Backend and contract: immutable order history (snapshots of each line), a reorder preview and command that copies what can be ordered into a fresh cart at today's prices and reports every price, stock, minimum-order and discontinued difference
  - [x] Live pages and tests: order list, order detail with the reorder preview, copy to a new cart
- [x] **11. `SM-F-05` Media pipeline**
  - [x] UI designed: media manager with upload, processing and rejection states
  - [x] Backend, storage and image workers: uploads checked by their bytes, size and count per product, duplicates refused; a bounded background job measures each photograph, refuses ones too large or too small, strips location and camera metadata without decoding, and publishes the display copy; originals only through short-lived signed links; `process_media` is the worker
  - [x] Live pages and tests: photographs on the product editor (upload, checking, ready or rejected with the reason, alt text, order, remove), served on product pages from the API once ready
- [x] **12. `SM-F-06` Price books**
  - [x] UI designed: price book editor, price tier table
  - [x] Backend and contract: quantity tiers, buyer-group prices and dated promotions per variant with priorities, one deterministic price with a reason buyers may read, overlapping rules flagged, buyer groups per seller
  - [x] Live pages and tests: price book on the product editor (add, edit, switch off and on), buyers and price groups for sellers, the quantity ladder and a buyer's own price on product pages, the reason on cart, checkout and order lines
- [x] **13. `SM-F-11` Quote request**
  - [x] UI designed: quote request sheet, quote decision panel
  - [x] Backend and contract: a quote from one seller's cart lines with a validity date, seller offers per line or decline with a note, buyer accepts (placing the order at the offered prices) or declines, expiry on read and by command
  - [x] Live pages and tests: ask for a quote from the cart, quote lists and pages for buyers and sellers
- [x] **14. `SM-F-12` Purchase approval**
  - [x] UI designed: approval flow
  - [x] Backend and contract: approval policies (threshold, approver roles, approvals needed) copied onto each order; never approved by the person who placed it; rejection needs a reason and cancels; sellers see an order only once it is approved
  - [x] Live pages and tests: approvals tab on the organization page, approval block on the order page
- [x] **15. `SM-F-15` Order lifecycle**
  - [x] UI designed: order timeline and order detail
  - [x] Backend and transitions: checkout revalidates every line and places one order per seller; confirm, pick, short-ship, ship, deliver, cancel and dispute guarded by side and state; an append-only history with actor and reason; notifications to the other side (live push comes later)
  - [x] Live pages and tests: checkout, order lists and pages for buyers and sellers with the commands each may run
- [x] **16. `SM-F-19` Seller analytics**
  - [x] UI designed: seller analytics grid and revenue chart with a table view
  - [x] Backend and contract: versioned metric definitions (revenue, orders, average order, fill rate, cancellations, stock at risk, product revenue) evaluated on read with the previous period, daily series and top products; CSV export from the same calls
  - [x] Live pages and tests: analytics page with 7, 30 and 90 day periods in the URL and the export
- [x] **17. `SM-F-17` Delivery tracking**
  - [x] UI designed: delivery tracking with delays and proof of delivery
  - [x] Backend and contract: shipments from the ship command, carrier and window, appended events, delayed and stale states, proof of delivery as a private document both sides may open; buyers told of delays and the last mile
  - [x] Live pages and tests: delivery on the order page with updates and confirm delivery for the seller
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

- [x] Demo data seeded (`seed_demo`): ten organizations (four approved sellers, and two buyers without logins who trade with Mwangaza), six people with portraits prepared for the light and dark themes; the sign-in page lists the demo accounts in development
- [x] Six category contracts seeded, two with version history (flour has a retired v1, tea an open draft), and 37 products (34 published) with category details and 42 variants, some low or out of stock
- [x] A buyer cart that needs repricing (to a key-account price) and past orders with price, stock, minimum-order and discontinued differences to reorder from
- [x] Price books (tiers, a key-account group, a future and an expired promotion, a switched-off rule), an approval policy, four quotes in each state, and 53 orders with their full history: one awaiting approval, one new, one being picked, one in transit and late, one gone quiet, and three months of Mwangaza sales (one in nine short-shipped, some cancelled) for analytics
- [x] Two photographs through the real media pipeline: one published, one refused as too small
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

Seed the demo data, then open `/login` and choose one of the listed demo accounts to fill the form:

```bash
cd backend && uv run python manage.py seed_demo
```

Each account shows a different side: Brian (buyer purchaser) has a cart waiting for the key-account price, an order waiting for Grace's approval, quotes and an order history to reorder from; Grace (buyer owner) approves or rejects it and sets approval policies; Faith (seller manager) confirms new orders, answers quote requests, manages photographs, price books and price groups, and reads analytics; Peter (warehouse operator) picks, ships and records delivery; Amina (administrator) edits category contracts and reviews sellers. `seed_demo --reset` puts everything back.

Two management commands run beside the API in production: `process_media` (the photograph worker; uploads are also processed in a small pool inside the API) and `expire_quotes` (for a scheduler; quotes also expire when read).

Emails go to Mailpit at http://localhost:8025 unless `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` (a sender verified in Brevo) are set in `.env`; then they are sent through Brevo. Tests never use the database in `DATABASE_URL`: they use `TEST_DATABASE_URL`, or the local Docker Postgres.

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
- [Code tour](docs/code-tour.md): every file of the foundation and the first seventeen features, in reading order
- [Contract changelog](contract/CHANGELOG.md)

## Credits

Demo product photographs are open-licence images from Wikimedia Commons, cut out for the interface; authors and licences are listed in [`web/public/images/products/README.md`](web/public/images/products/README.md). CC BY-SA cut-outs are shared under the same licence as their source. Scene photographs are from Unsplash (Unsplash Licence), credited in [`web/public/images/scenes/README.md`](web/public/images/scenes/README.md). The six demo portraits are Unsplash photographs prepared by `design/photography/people.py` in light-theme and dark-theme versions, credited in [`backend/apps/demo/avatars/README.md`](backend/apps/demo/avatars/README.md). Photographs and videos in the seeded product listings are Unsplash photos and YouTube videos referenced by address, each credited where it appears (listed in [`backend/apps/demo/products.py`](backend/apps/demo/products.py)); they show the kind of product, not the invented brands.
