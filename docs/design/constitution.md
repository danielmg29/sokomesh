# SokoMesh Design Constitution

Binding design brief supplied by the product owner (2026-10-12). It overrides `visual-direction.md` wherever they differ.

## Concept
WOVEN TRADE

SokoMesh is a modern wholesale market represented as a connected commercial
system. Its visual language is based on three semantic ideas:

UNIT — a bounded commercial object such as a product, quantity, order or shipment.
THREAD — a relationship or movement between commercial states.
STAMP — an authoritative state such as available, reserved, approved, paid or shipped.

Never use these ideas as literal skeuomorphism. They are structural principles.

## Experience modes

MARKET
Buyer-facing discovery and purchasing.
Image-rich, warm, comfortable/spacious, editorial where useful.

LEDGER
Seller and administrative work.
Dense, numerical, bordered, systematic, compact/comfortable.

FLOW
Checkout, reservations, fulfillment and warehouse work.
Directional, state-heavy, task-oriented, compact.

All modes share the same primitives and tokens.

## Adaptive Convergence

Do not create per-model shared components.

Resolve differences through:
- contract metadata
- semantic slots
- recipe variants
- page blocks
- declarative overrides

Recipe axes remain:
intent
density
tone
surface

Do not invent model-specific recipe values.

## Visual rules

Use Plus Jakarta Sans for headings and Inter for interface text. *(Superseded 2026-10-13: Archivo in two widths; see the amendment below.)*

Brand primary: #145C43
Brand signal: #F5B63C

Yellow is a trade signal, not the warning semantic.

Favor borders over shadows.
Favor rectangles over pills.
Use restrained radii.
Use warm neutral surfaces.
Use tabular numerals for prices and quantities.

Operational information outranks decoration.

## Motion grammar

REVEAL — expose additional information.
BIND — reserve, select, approve or commit.
TRANSFER — move through a commercial workflow.
REFLOW — respond to filter, sort or grouping.
STAMP — confirm authoritative state.
THREAD — communicate process progression.

Every animation must use one of these meanings.
If it does not, remove the animation.

Product UI motion should generally finish in 90–340ms.
Avoid bounce.
Avoid large translations.
Avoid decorative continuous motion.
Respect prefers-reduced-motion.

## Anti-slop

Do not add gradients, glass, glow, large shadows, floating orbs,
3D decoration, random bento layouts or decorative icon containers
unless specifically justified by the concept.

Do not automatically scale every interactive element on hover.

Do not solve every content group using a card.

Do not introduce a new component where a recipe variant solves the problem.

Do not use placeholder commerce data when validating components.

## Required states

Every interactive component must consider:
default
hover
focus-visible
active
disabled
loading
empty
error
success
permission-restricted

Commerce components must additionally consider where relevant:
out-of-stock
low-stock
reserved
reservation-expired
repriced
approval-required
payment-pending
partially-fulfilled
delayed
webhook-stale

## Amendment: trade infrastructure remodel (product owner, 2026-10-13)

The product owner judged the first build generic and set a new blend: **Clean & Minimalist 40% + Geometric 25% + Professional/Corporate 20% + Organic/Natural 10% + Flat 5%**. SokoMesh should read as modern trade infrastructure, not a SaaS dashboard. This amendment overrides the visual rules above where they differ.

- **Composition.** Modular rectangular composition on strong grids. Containers over floating cards: grid cells share one rule (joined borders) instead of sitting apart with gaps and shadows. Sections sit between full-width rules. Visible commercial quantities (prices, holds, minimum orders) are set large.
- **Surfaces.** Warm neutral grounds at very low chroma: warm stone in the light theme (`#F3F2EE` canvas, white cells), warm graphite in the dark theme. The brand kit's `#F6F8F2` stays in the brand files. Forest green is restrained (primary actions, selection, one brand band); trade yellow marks signals only.
- **Shape.** One rule: containers, cells, dialogs and photo wells are square (0); what you press or what labels a state has a 2px corner. Radios stay round because roundness is their affordance.
- **Depth.** Borders over shadows. Cells and panels have no shadow; only overlays that sit above the page (menus, dialogs, toasts) cast a short one.
- **Typography.** *Replaces "Plus Jakarta Sans for headings and Inter for interface text".* One grotesque in two widths: **Archivo** at its normal width for interface text, and its SemiExpanded width (`type-display-width`, 112.5) for headings and money figures, so quantities read like trade signage. JetBrains Mono for identifiers. Jakarta's soft geometry and the Jakarta plus Inter pairing are the most common template pairing and read as generic; Archivo was drawn for both display and text use and has a width axis, so one family gives the system its contrast.
- **Organic 10%.** Not permission to make SokoMesh rustic. It lives in photography (warm, real products), in one flowing ribbon (`TradeRibbon`, at most twice a page, always behind a grid) and in slightly warmer grounds. Components stay geometric.
- **Photography.** Products are cut-out photographs on the theme's `well` colour, so one image file shows the product on light stone or dark graphite with the colour mode. Operational surfaces stay systematic and dense.
- **Never.** Glassmorphism, gradient backgrounds, decorative 3D, excessive pill shapes, oversized rounded cards, arbitrary bento layouts.

## Review question

Before accepting any design ask:

"Could this exact component appear unchanged in a generic AI SaaS template?"

If yes, reconsider the composition until it expresses SokoMesh's commercial
context without sacrificing usability.
