# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A multi-vendor wholesale market with five roles, each doing a different job:

- **Buyer purchaser** at an independent retail shop: searches permitted products, requests quotes, builds carts that mix sellers, and submits orders once they are approved. Often on a phone, in the shop.
- **Buyer owner**: controls company members, approval thresholds, credit rules and delivery addresses.
- **Seller manager** at a regional wholesaler: manages the catalogue, stock, price books, orders and fulfilment. Desk work, dense tables.
- **Warehouse operator**: picks, packs, short-ships, substitutes and records handover evidence. Task-driven, often on a handheld.
- **Marketplace administrator**: approves sellers, governs category contracts, monitors risk and resolves disputes.

## Product Purpose

Replace phone orders, spreadsheet price lists and stale stock figures with one authoritative catalogue and inventory record. Buyers, sellers and administrators each see that record presented for their own job. Success: a buyer commits to an order against stock that really exists, at a price the backend can explain, and the order changes state exactly once per real event.

## Positioning

Category contracts define product attributes, validation, facets, comparison fields and seller form sections once, so a new category reaches seller entry, buyer filters, comparison and exports without bespoke pages. Price and inventory are backend-owned and immutable-ledger-backed. Reservations prevent oversell, and idempotent payment handling makes repeated confirmations change an order once.

## Operating Context

- Market: **Kenya**. Money in **KES**, always shown with currency and two decimals, held as decimal strings and never floats. Phones in +254 format; addresses use Kenyan counties and towns.
- Languages: **English (`en-KE`)** by default and **Kiswahili (`sw-KE`)**, Kenya's two official languages. The backend owns the list and publishes it as the contract's `locales`; notifications are written in the language each person chooses.
- Payments go through **SellaPay** (`https://pay.sellapay.co.ke/api/v1`, docs: github.com/silvavalleyafrica/sellapay-api-docs). Buyers pay by M-Pesa STK push (`requestStkPush`): the prompt appears on the buyer's Safaricom phone (local format `7xx`/`1xx`), and the API answers `status: "pending"` with a `TXN-…` transaction ID. Refunds can use `sendFundsToMobile`; seller payouts can use `sendFundsToLocalBank` (bank SWIFT code, pending with an estimated arrival).
- Buyers mostly use phones; sellers and administrators use desktops; warehouse operators use handhelds in bright warehouses.
- Built with the Adaptive Convergence method: the backend owns every business fact and publishes a versioned contract (`contract/ac-contract.json`); web UI is projected from it.

## Capabilities and Constraints

- 24 requirements (SM-F-01 to SM-F-24), built in the order in `docs/project-context.md`. Requirement IDs are traceability keys.
- Rich text is allowed only for seller profile description, category seller/buyer guidance and product description. All other long text is plain.
- Stock reservations have a bounded TTL; concurrent checkout must never produce negative availability.
- **Payment confirmation rule** (product owner, 2026-10-13). A payment is confirmed only after the buyer has acted on the M-Pesa prompt on their own phone and the result is a success. A cancelled prompt, a wrong PIN, insufficient funds, an expired prompt or no result at all leaves the payment unconfirmed and the order unpaid; the buyer may send the prompt again while the reservation holds.
- **Open: how the result arrives.** SellaPay v1 still documents no callback, webhook or transaction-status endpoint (checked 2026-10-13) and lists webhook signature verification as planned for v2.0. How SokoMesh receives the phone result and verifies it (SM-F-14) is undecided. Interfaces show "awaiting approval on phone" and "not confirmed yet" honestly rather than assume a result.
- SellaPay limits: references at most 20 characters; 100 requests per minute per token.

## Brand Commitments

- Name **SokoMesh**, tagline "Trade without the tangle". *Soko* is Swahili for market.
- Brand kit in `web/public/brand/` and `design/tokens/brand-tokens.json`; usage rules in `docs/design/brand-assets.md`. Primary `#145C43`, signal `#F5B63C`, ink `#13251D`, surface `#F6F8F2`. The kit surface stays in the brand files; since the 2026-10-13 remodel the interface canvas is warm stone `#F3F2EE` (see the constitution's amendment).
- **The SokoMesh Design Constitution (`docs/design/constitution.md`) is binding**: concept WOVEN TRADE (UNIT, THREAD, STAMP), experience modes MARKET, LEDGER and FLOW, its motion grammar, anti-slop rules and required states.
- Voice: plain commercial language; show quantities and money explicitly; explain every unavailable or delayed action.
- Name and identity are portfolio concept work; trademark and domain checks are needed before commercial use.

## Evidence on Hand

- Brand assets and tokens (above). Product brief, requirements and budgets: Adaptive Convergence Portfolio Project Briefs (SokoMesh) and the SokoMesh Feature Build Order and Field Specification v1.1.
- **No real customers, sellers, orders, prices, reviews, testimonials or performance metrics exist.** Demonstration content must be labelled as demo data and never presented as real commercial evidence.

## Product Principles

1. The backend is the authority. The UI may mirror a rule for fast feedback; it never originates one.
2. Show the commercial truth: quantities with units, money with currency, stock and reservation state, and why an action is unavailable.
3. Every repeated event changes the order once, and the interface says which event it is waiting for.
4. One category contract drives every surface that shows a product attribute.
5. Operational information outranks decoration.

## Accessibility & Inclusion

WCAG 2.2 AA. Keyboard and screen-reader operable throughout; status is never conveyed by colour alone; large-text and narrow-screen use must keep meaning intact; `prefers-reduced-motion` is honoured.
