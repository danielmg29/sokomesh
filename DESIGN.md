---
name: SokoMesh
description: Trade without the tangle. Multi-vendor wholesale ordering and inventory for Kenyan retailers and wholesalers.
colors:
  canvas-stone: "#F3F2EE"
  surface-white: "#FFFFFF"
  sunken-stone: "#EAE8E2"
  well-stone: "#EEECE7"
  ink: "#13251D"
  muted-stone: "#585A53"
  rule-stone: "#DDDAD2"
  rule-strong: "#7A786F"
  scrim-ink: "#13251D99"
  forest-primary: "#145C43"
  forest-deep: "#0E4733"
  forest-soft: "#E2EEE7"
  on-primary: "#FFFFFF"
  brand-forest: "#145C43"
  on-brand: "#FFFFFF"
  signal-amber: "#F5B63C"
  signal-hover: "#E9A82A"
  signal-soft: "#FDF0D3"
  signal-stamp: "#F5B63C"
  on-signal-stamp: "#13251D"
  on-signal: "#13251D"
  signal-border: "#13251D"
  inverse-ink: "#13251D"
  on-inverse: "#FFFFFF"
  inverse-muted: "#B8C4BC"
  chrome-ink: "#13251D"
  on-chrome: "#FFFFFF"
  chrome-muted: "#B8C4BC"
  ring-amber: "#F5B63C"
  ring-contrast: "#13251D"
  shadow-ink: "#13251D"
  tone-neutral: "#585A53"
  tone-neutral-bg: "#ECEAE4"
  tone-info: "#2A557F"
  tone-info-bg: "#E3ECF6"
  tone-success: "#145C43"
  tone-success-bg: "#E2EEE7"
  tone-warning: "#9A4A12"
  tone-warning-bg: "#FBEADB"
  tone-danger: "#A92A20"
  tone-danger-bg: "#FBE3DF"
  night-canvas: "#131311"
  night-surface: "#1B1B18"
  night-sunken: "#252521"
  night-well: "#21211D"
  night-foreground: "#E8E7E1"
  night-muted: "#A8A79E"
  night-rule: "#30302B"
  night-rule-strong: "#7A796F"
  night-scrim: "#050504B8"
  night-primary: "#44A77B"
  night-primary-hover: "#58BB8E"
  night-primary-soft: "#133223"
  night-on-primary: "#0A1208"
  night-signal-hover: "#F8C55E"
  night-signal-soft: "#3A2D10"
  night-signal-stamp: "#3A2D10"
  night-on-signal-stamp: "#F5B63C"
  night-signal-border: "#F5B63C"
  night-inverse: "#E8E7E1"
  night-on-inverse: "#131311"
  night-inverse-muted: "#4E4D46"
  night-chrome: "#0C0D0B"
  night-on-chrome: "#F2F1EC"
  night-chrome-muted: "#A8A79E"
  night-ring-contrast: "#E8E7E1"
  night-shadow: "#030303"
  night-tone-neutral: "#A8A79E"
  night-tone-neutral-bg: "#2A2A25"
  night-tone-info: "#8EB8E6"
  night-tone-info-bg: "#172E48"
  night-tone-success: "#6CC69A"
  night-tone-success-bg: "#113424"
  night-tone-warning: "#EDA06A"
  night-tone-warning-bg: "#412614"
  night-tone-danger: "#F28B7D"
  night-tone-danger-bg: "#4E1E18"
typography:
  display:
    fontFamily: "Archivo SemiExpanded (wdth 112.5), Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 680
    lineHeight: "44px"
    letterSpacing: "-0.02em"
  display-market:
    fontFamily: "Archivo SemiExpanded (wdth 112.5), Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 680
    lineHeight: "68px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo SemiExpanded (wdth 112.5), Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: "36px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "-0.01em"
  figure:
    fontFamily: "Archivo SemiExpanded (wdth 112.5), Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 680
    lineHeight: "36px"
    fontFeature: "\"tnum\", \"lnum\""
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  body-reading:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "26px"
  data:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    fontFeature: "\"tnum\", \"lnum\""
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.06em"
  code:
    fontFamily: "JetBrains Mono, ui-monospace, Cascadia Mono, Consolas, SF Mono, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  stamp: "2px"
  control: "2px"
  panel: "0px"
  media: "0px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "7": "28px"
  "8": "32px"
  density-compact-gap: "8px"
  density-comfortable-gap: "12px"
  density-spacious-gap: "16px"
components:
  button-primary:
    backgroundColor: "{colors.forest-primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.forest-deep}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.sunken-stone}"
  button-signal:
    backgroundColor: "{colors.signal-amber}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  button-signal-hover:
    backgroundColor: "{colors.signal-hover}"
  button-danger:
    backgroundColor: "{colors.tone-danger}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  button-disabled:
    backgroundColor: "{colors.sunken-stone}"
    textColor: "{colors.muted-stone}"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  input-invalid:
    backgroundColor: "{colors.tone-danger-bg}"
  chip:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  chip-on:
    backgroundColor: "{colors.inverse-ink}"
    textColor: "{colors.on-inverse}"
  stamp-success:
    backgroundColor: "{colors.tone-success-bg}"
    textColor: "{colors.tone-success}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "2px 8px"
  stamp-warning:
    backgroundColor: "{colors.tone-warning-bg}"
    textColor: "{colors.tone-warning}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "2px 8px"
  stamp-danger:
    backgroundColor: "{colors.tone-danger-bg}"
    textColor: "{colors.tone-danger}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "2px 8px"
  stamp-signal:
    backgroundColor: "{colors.signal-stamp}"
    textColor: "{colors.on-signal-stamp}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "2px 8px"
  segmented-item:
    textColor: "{colors.muted-stone}"
    rounded: "{rounded.stamp}"
    padding: "0 12px"
    height: "32px"
  segmented-item-on:
    backgroundColor: "{colors.inverse-ink}"
    textColor: "{colors.on-inverse}"
  table-header:
    backgroundColor: "{colors.sunken-stone}"
    textColor: "{colors.muted-stone}"
    typography: "{typography.label}"
    padding: "8px 14px"
  panel:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.panel}"
    padding: "16px"
  masthead:
    backgroundColor: "{colors.chrome-ink}"
    textColor: "{colors.on-chrome}"
  bulk-action-bar:
    backgroundColor: "{colors.chrome-ink}"
    textColor: "{colors.on-chrome}"
    rounded: "{rounded.panel}"
    padding: "10px 12px"
  cta-band:
    backgroundColor: "{colors.brand-forest}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.panel}"
    padding: "40px 24px"
---

# Design System: SokoMesh

The binding authority is `docs/design/constitution.md` (WOVEN TRADE) with its 2026-10-13 amendment (the trade infrastructure remodel). This file records how that constitution landed in the shipped code. Where they differ, the constitution decides intent and the code decides fact; reconcile the two rather than edit one silently. Token values have one source, `design/tokens/*.json`, rendered by `web/tools/tokens.mts` into `web/app/tokens.generated.css` (OKLCH custom properties) and `web/lib/design/tokens.generated.ts` (hex copies, `colorHex` and `colorHexDark`). The frontmatter above mirrors those files: plain keys are the light theme, `night-*` keys are the dark theme's value for the same role where it differs. Never edit the generated outputs or this frontmatter by hand without changing the token source first.

## Overview

**Creative North Star: "Woven Trade", built as trade infrastructure**

SokoMesh draws a wholesale market as one connected commercial record. Three structural ideas carry the whole system. A **UNIT** is a bounded commercial object (product, quantity, order, shipment), drawn as a square cell in a ruled grid. A **THREAD** is movement between states, drawn as a connector whose stroke pattern (solid, dashed, dotted) says how far it has gone. A **STAMP** is an authoritative state, drawn as a small uppercase rectangle with a drawn mark. None of these is skeuomorphic: no fabric, no rubber-stamp texture, no woven backgrounds.

The interface should read as modern trade infrastructure, not a SaaS dashboard. Grounds are warm neutrals at very low chroma: warm stone by day, warm graphite at night, so the forest green and the trade yellow are the only saturated colours on the page. Content sits in **containers, not floating cards**: grid cells share one rule, sections sit between full-width rules, and nothing on the canvas casts a shadow. Corners follow one rule: containers, cells, dialogs and photo wells are square; what you press or what labels a state has a 2px corner. Commercial quantities (prices, holds, minimum orders, totals) are set large in the display width so they can be compared at a glance.

Forest green has two jobs kept apart: **primary** is the interactive green (actions, links, selection, chart columns) and lifts on the dark ground, while **brand** is the constant forest used for regions and illustration (the CTA band, the ribbon, the masthead band). Signal amber is the colour of trade attention: the applied filter, reserved stock, "your price", the held quantity, the unread mark, the inner focus ring. It is never a status. Type is one grotesque in two widths: **Archivo** at its normal width for every interface string, and its SemiExpanded width for headings and money figures, with JetBrains Mono for identifiers.

The system has three experience modes over the same primitives and tokens. **MARKET** (buyer discovery and purchase) is photography-led and comfortable. **LEDGER** (seller and admin work) is dense, numeric and ruled. **FLOW** (checkout, reservations, fulfilment, warehouse) is directional, state-heavy and compact, with large primary actions. Modes are set through density and recipe variants; themes through tokens. Components never branch on mode or theme.

**Key Characteristics:**
- Modular rectangular composition: joined grid cells and full-width section rules, not gapped cards.
- Square containers and media; 2px corners on controls and stamps; radios stay round.
- Warm stone and warm graphite neutrals; restrained forest; amber held back for trade signals.
- Borders over shadows: cells and panels are flat, only overlays cast a short shadow.
- Prices and quantities large, tabular and labelled: "KES 1,740.00", "Price per pack".
- Product photography as cut-outs on the theme's well; operational surfaces stay systematic and dense.
- Six-verb motion grammar, 120 to 340 ms, no bounce, no large travel.

### Theme composition

The product owner's blend (2026-10-13) is **Clean & Minimalist 40%, Geometric 25%, Professional/Corporate 20%, Organic/Natural 10%, Flat 5%**. Each share has a concrete home:

| Share | What it is here | Where it lives |
|---|---|---|
| 40% Clean & Minimalist | Few colours, quiet grounds, hierarchy from type and rules rather than boxes; whitespace in MARKET, density in LEDGER | Warm stone and graphite grounds, `HeaderBlock`, section rules on the landing, the hero's single headline |
| 25% Geometric | Square cells on a ruled grid, rectangles for state, the faceted mark | `ListBlock` card grids, `CategoryShowcase`, `StatsBlock`, `WholesaleMetricsStrip`, `MediaManager`, stamps and thread nodes |
| 20% Professional/Corporate | Disciplined measure, tabular figures, a semi-expanded type voice, ruled terms rows, plain commercial copy | Archivo two-width system, hero terms row, the `figure` slot, ledger tables, the three-tier public header |
| 10% Organic/Natural | Warmth from photography, one flowing ribbon, slightly warm grounds. Never rustic, never in the components | Cut-out product photographs on `well`, `TradeRibbon` (at most twice a page), the warm neutral hue |
| 5% Flat | Solid fills, no gradients, no blur depth | Every fill; `shadow-raised` is a flat 1px edge |

The shares are a check on balance, not a quota per screen. If a MARKET page reads as a dashboard, a component grows a rounded floating card, or the ribbon appears in an operational surface, the blend has drifted.

### Market facts the visuals must carry

- **Money:** KES, held as decimal strings, shown with currency and two decimals: "KES 1,740.00". Negatives use the true minus sign U+2212 ("−KES 120.00"), never a hyphen. Formatting lives in `web/lib/money.ts`. A figure never breaks between currency and amount.
- **Time:** Africa/Nairobi (EAT, UTC+3), from `web/lib/format.ts`. Phones in +254 format.
- **Languages:** English (`en-KE`, default) and Kiswahili (`sw-KE`), from the contract's `locales` (0.2.0). Pickers show endonyms.
- **Payment:** SellaPay M-Pesa STK push. A payment is confirmed only after the buyer acts on the prompt on their own phone and the result is a success (decision 27). Every payment surface therefore has "awaiting approval on phone" and "not confirmed yet" states, says plainly not to pay again, and never draws a payment as confirmed on the strength of the push alone.

### Motion grammar

Every animation names one of six meanings (constitution). If it has none, remove it. Values from `design/tokens/motion.json`, exposed as `motion-*` transition utilities and `animate-*` keyframe utilities in `web/app/globals.css`.

| Verb | Meaning | Duration | Easing | Shipped use |
|---|---|---|---|---|
| REVEAL | Expose more information | 200ms | cubic-bezier(0.16, 1, 0.3, 1) | Row expansion, disclosure; `animate-reveal` rises 4px |
| BIND | Reserve, select, approve, commit | 140ms | cubic-bezier(0.2, 0, 0, 1) | Button, input, chip, segmented and toggle state changes; chart column colour |
| TRANSFER | Move through a workflow | 280ms | cubic-bezier(0.65, 0, 0.35, 1) | Step changes; `animate-transfer` enters 8px from the side |
| REFLOW | Respond to filter, sort, grouping | 240ms | cubic-bezier(0.16, 1, 0.3, 1) | Ledger and recipe re-layout, applied filter tokens |
| STAMP | Confirm authoritative state | 180ms | cubic-bezier(0.2, 0, 0, 1) | Fresh stamp, current thread node, radio dot; scales in from 1.06 |
| THREAD | Show process progression | 340ms | cubic-bezier(0.4, 0, 0.2, 1) | Connector draws left to right into the current step; flow-story rules turn primary behind the current step and signal on it |
| Exit | Leave (faster than entering) | 120ms | cubic-bezier(0.7, 0, 0.84, 0) | Overlays and toasts closing |

Travel is capped at 4px (`motion-distance-sm`) and 8px (`motion-distance-md`). `prefers-reduced-motion` collapses every animation and transition to 0.01ms globally. Theme changes are instant: no cross-fade. The ribbon is static.

**The Named Meaning Rule.** An animation without a verb from this table is a defect, not a flourish. Hover does not scale anything.

**The Loading Exception Rule.** Two continuous animations exist and are bounded to loading status only: the spinner (`animate-spin`, 0.8s linear) and the skeleton pulse (`animate-skeleton`, 1.4s). They report system status, run only while work is pending, and are stopped by reduced motion.

### Open gaps

- **Demo photography is commodity, not packaging.** The eight cut-outs in `web/public/images/products/` (from `design/photography/sources.json`) show the goods themselves (flour, sugar, oil, tea, rice, soap, milk powder) because no open-licence packshots of these staples exist without real brands on them. The milk powder source is 400 by 400 px and reads soft on dense screens. Seller photography goes through the backend media pipeline (SM-F-05), never into `public/`.
- **Payment result delivery** is open: the confirmation rule is decided (decision 27), but how the phone result reaches SokoMesh (SellaPay v1 has no callback or status endpoint) is not.

## Colors

A warm, very low-chroma neutral system with one authoritative green in two roles, one held-back amber signal, a chrome layer for mastheads, a photo well, and five semantic tones, each a foreground plus a pale ground. Every role exists in both themes under the same name.

### Primary
- **Forest Primary** (`forest-primary`, night `night-primary`): the interactive green. Primary actions, links, selected and completed states, chart columns, caret and accent colour. White on it reads 7.95:1 in light; in dark it lifts to a brighter forest with ink on it, because white fails on the lifted green.
- **Forest Deep** (`forest-deep`, night `night-primary-hover`): hover and pressed primary; the active chart column.
- **Forest Soft** (`forest-soft`, night `night-primary-soft`): selected rows and active navigation.
- **Brand Forest** (`brand-forest`, the same value in both themes) with **On Brand** white (7.95:1): brand regions and illustration only: the CTA band, the ribbon, the 6px band under the masthead. It is not an interactive colour and does not lift at night.

### Secondary
- **Signal Amber** (`signal-amber`, unchanged in both themes): trade attention only: applied filter tokens, reserved stock and the held-quantity strip, featured, "your price", the current flow step, the unread mark, text selection, the inner tone of the focus ring, the ribbon's thread. Text on it is always ink (8.88:1). It is never text on the light canvas.
- **Signal Hover**, **Signal Soft**, **Signal Border**, **Signal Stamp** (with `on-signal-stamp`): hover fill; grounds of signal-marked regions; their edge (ink in light, amber in dark); the signal STAMP (solid amber with ink in light, amber-edged soft ground in dark).

### Tertiary (semantic tones)
Each tone is a pair: a foreground used for text, border and mark, and a pale ground. Stamps, alerts and tinted surfaces always use the pair together.
- **Neutral** (`tone-neutral` on `tone-neutral-bg`): draft, inactive, not started, cancelled on phone.
- **Info** (`tone-info`, slate blue): informational notices, awaiting approval, processing context.
- **Success** (`tone-success`): paid, approved, shipped, available. Brand green by design; lifted at night.
- **Warning** (`tone-warning`, burnt orange): low stock, reservation expiring, payment not confirmed yet, delayed, the shown-once secret.
- **Danger** (`tone-danger`, brick red): out of stock, not paid, rejected, destructive actions.

### Neutral
- **Canvas Stone** (`canvas-stone`, night `night-canvas`): the page ground behind everything; OKLCH hue about 95 at chroma 0.005, a neutral that leans warm without turning cream.
- **Surface White** (`surface-white`, night `night-surface`): grid cells, ledgers, fields. At night cells sit one step above the canvas.
- **Sunken Stone** (`sunken-stone`, night `night-sunken`): table heads, inset regions, hover rows, disabled controls. In light it is darker than the surface; in dark it is lighter, so hover always lifts.
- **Well Stone** (`well-stone`, night `night-well`): the ground under product photographs. Cut-outs sit on it, so one file shows the product on light stone or dark graphite with the colour mode.
- **Ink** (`ink`, night `night-foreground`): body text.
- **Muted Stone** (`muted-stone`, night `night-muted`): secondary text and labels (7.0:1 on surface in light, 7.1:1 in dark).
- **Rule Stone** (`rule-stone`, night `night-rule`): grid rules between cells and regions.
- **Rule Strong** (`rule-strong`, night `night-rule-strong`): control boundaries; at least 3.5:1 on every ground in both themes (WCAG 1.4.11).
- **Scrim** (`scrim-ink`, night `night-scrim`): behind dialogs and sheets.
- **Inverse** (`inverse-ink` with `on-inverse` and `inverse-muted`): the opposite of the ground. On-state chips and Segmented items, tooltips.
- **Chrome** (`chrome-ink` with `on-chrome` and `chrome-muted`): mastheads, the public header's terms strip and the bulk-action bar. Regions on chrome take the `on-chrome` utility, which switches the outer focus outline to the chrome foreground.
- **Shadow** (`shadow-ink`, night `night-shadow`) with `shadow-weight` (1 light, 3 dark): the base and strength of the overlay shadow.

### Dark theme
`design/tokens/color.dark.json` ("warm graphite") defines exactly the roles `color.light.json` defines; `web/tests/unit/contrast.test.ts` fails if either side gains a role, and checks every text pair at 4.5:1 and every boundary at 3:1 in both themes, including text and rules on the well. `web/tools/tokens.mts` emits the dark block under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])`, and again for `:root[data-theme="dark"]`. The reader's choice (`system`, `light`, `dark`) is stored by `web/lib/theme.ts` under `sokomesh-theme`; a script in `<head>` applies it before first paint, and `ThemeSwitch` (P-18) changes it. The `dark:` variant exists only for assets that cannot take a variable (the logo files).

Dark neutrals sit on OKLCH hue about 107 at chroma under 0.01: a warm graphite, never a pure black and no longer green-tinted, so the forest reads as the brand rather than as the ground.

### Named Rules
**The Signal Is Not a Warning Rule.** Amber marks what the trader is attending to; it never means "caution" or "done". Warning is burnt orange; success is green.

**The Two Greens Rule.** Primary is for things you press or select and lifts with the theme; brand is for regions and illustration and stays constant.

**The Same Roles Rule.** A theme is a second value for each existing role, never a new role used by one theme only.

**The Paired Tone Rule.** A tone is used as its foreground-on-ground pair with a mark and a label. A coloured dot or tint alone never carries state (WCAG 1.4.1).

**The Token-Only Rule.** Tailwind's default palette, radii, text sizes, tracking and shadows are cleared in `globals.css`; only SokoMesh tokens exist as utilities. Components contain no raw hex.

## Typography

**Interface and Display Font:** Archivo, loaded through `next/font` as `--font-archivo` with its width axis (`axes: ['wdth']`). `font-sans` is Archivo at width 100. `font-display` is the same family at the SemiExpanded width: Tailwind's `--font-display--font-variation-settings` sets `"wdth" var(--type-display-width)` (112.5), and h1 and h2 take that width by default.
**Identifier Font:** JetBrains Mono (400, 500, 600; `--font-jetbrains`), behind `font-mono`, used only for identifiers: SKUs, item codes, order, quote, transaction and request ids.

**Character:** One grotesque in two widths. The normal width is a plain, engineered interface face for dense tables and forms; the SemiExpanded width gives headings and money figures the broad, level stance of trade signage and shipping labels. Plus Jakarta Sans and Inter were replaced on 2026-10-13: the pair is the most common template pairing and Jakarta's soft geometry read as generic SaaS. Headings are tight (-0.01em on h1 to h4, `tracking-display` -0.02em on page titles and the hero) and balanced; paragraphs wrap pretty.

**Weight ladder.** Display weight is a token, `display-weight`: 680 in light and 640 in dark, where light text on a dark ground blooms. It drives `font-extrabold`. Extrabold is for page titles, the MARKET hero and money figures (the `figure` slot, the amount to pay, stat values, hero terms). Semibold (600) is for section headings on MARKET pages, buttons, labels and emphasis. Bold (700) remains for block and panel titles inside operational surfaces.

**Tracking tokens.** `type-caps-tracking` (0.06em), `type-display-tracking` (-0.02em) and `type-normal-tracking` (0em). Tailwind's default tracking scale is cleared.

### Hierarchy
The scale is fixed in `design/tokens/type.json`: 12/16, 13/18, 14/20, 16/26, 18/28, 20/28, 24/32, 30/36, 38/44, 52/56, 64/68.
- **Display** (display weight, display width, 38/44, -0.02em): page titles; 30/36 below `sm`, 24/32 in compact headers. 52/56 and 64/68 are for the MARKET hero at wide containers only.
- **Headline** (600, display width, 30/36): section H2 on MARKET pages ("Shop by category"), 38/44 in the CTA band on wide containers.
- **Title** (700, 20/28; 18/28 for panel names): panel and block titles.
- **Figure** (display weight, display width, tabular, never wrapping): the `figure` slot at 18/28 in rows, 24/32 in cards and 38/44 in detail; stat values; the amount to pay at 30/36; hero terms at 30/36.
- **Body** (400, 14/20): default interface text. **Body Reading** (400, 16/26): MARKET body and rich text, capped at 68ch. **Data** (13/18, tabular): dense LEDGER cells.
- **Label** (600, 12/16, 0.06em, uppercase): the `caps` utility. Column heads, definition terms, group captions. 12px is the smallest text anywhere.

### Named Rules
**The Visible Quantity Rule.** A record's commercial quantity is its loudest line. The projection's `figure` slot takes the first money field in the list fields (from the `currency` widget, never a field name), sets it in the display width with its field label underneath ("Price per pack"), and removes it from the meta list.

**The Tabular Truth Rule.** Tables, inputs, outputs and anything marked `data-numeric` use tabular lining numerals.

**The Identifier Face Rule.** Mono means "an identifier you could type back". Never set prose, prices or labels in it.

**The Label Is Not a Kicker Rule.** The uppercase label style names data. It never sits above a heading as an eyebrow.

### Copy rules
- **No em or en dashes in visible text.** Ranges read "10 to 49 bales". Enforced by `web/tests/unit/copy.test.ts`.
- **Empty values are drawn and spoken, not dashed** (`Empty` in `web/components/kernel/fields/views.tsx`).
- **One middle dot per line at most.** The public header's terms strip uses spacing, not dots.
- **No arrow glyphs as separators.** Comparisons say better or worse in words.
- **One label per call-to-action intent**, from the `cta` map in `web/features/marketing/Marketing.tsx`.
- **Payments say "not confirmed"** in every state that is not a successful phone result.

## Layout

Spacing is a 4px grid (`--spacing` is bound to `space-unit`). Layout primitives in `web/components/layout/primitives.tsx` respond to **container queries**, not the viewport. Split collapses to one column below `@3xl`; its ratios are `sidebar`, `wide-aside`, `half`, `media-first` and `aside-first` (an 18rem facet column). Marketing sections lay out by container too (decision 20).

**MARKET pages after the references.** The landing opens on two photographic doors (buy, sell) with the trade terms as a ruled row beneath; then photographic category tiles, a product row, one oversized statement, two photographic stories and a CTA with a photograph. Sections are held apart by space (80 to 112px) rather than rules, and each rises in once on scroll. The category page names the category large beside its photograph, puts filters and sort in one bar and gives the grid the full width. The product page scrolls its photographs on the left while the buying column stays in view on the right.

**Containers over floating cards.** Repeated records sit in one container whose cells share rules: the list has a top and left rule, each cell a right and bottom rule, so a short last row leaves open ground instead of an empty grey cell. `ListBlock` (card intent), `RelatedBlock`, `CategoryShowcase`, `MediaManager`, the hero shelf and the trust proofs all use it. Sections of a page sit between full-width rules (`divide-y`) at a 48px rhythm.

Density is a region property, set with `data-density`:

| Density | Control | Row padding Y | Cell padding X | Gap | Text | Icon | Mode |
|---|---|---|---|---|---|---|---|
| compact | 32px | 6px | 10px | 8px | 13px | 16px | LEDGER, FLOW |
| comfortable | 40px | 10px | 14px | 12px | 14px | 18px | default |
| spacious | 48px | 14px | 18px | 16px | 15px | 20px | MARKET on phones |

Page templates L-01 to L-25 are composed live in `web/features/design-system/specimens/templates.tsx` from the real blocks. The landing (L-01) runs header, hero, category discovery, a product row, the statement and the two stories, then the mechanisms (mesh, flow, trust) and the CTA over a chrome footer: commerce before explanation.

**Account and organization pages (LEDGER).** Profile, settings, organization, seller application and the review pages are built from `PageSection` (`web/components/layout/section.tsx`): a ruled section with its title and a one-line purpose on the left (17rem) and the controls on the right, stacking below the container's medium width. Sections are separated by the strong rule, never boxed, so a settings page reads as one ledger rather than a stack of cards (after the editorial splits of Bélanger and Joonbyrd, kept to the brief's square rules). Each page has one `h1` (`HeaderBlock level={1}`); section titles are `h2` at 20px display weight.

**Live storefront.** The public pages (`/`, `/catalogue`, `/catalogue/[slug]`, `/products/[slug]`) use the L-01 to L-03 sections with live data. The landing keeps the two doors, then a figures strip counted from the published catalogue (products, approved wholesalers, categories), the photographic categories, the newest products, the statement, the two stories and the close; the mesh, flow and trust sections stay in the design system because they need fixture records. The product page's sticky buying column says online ordering is not open yet and gives the seller's number instead of an order button; below the two-column width the scene photograph drops so the price stays near the top.

**The Colour Ground Rule.** Large areas are either photography or the warm neutral ground; forest and amber live in type, rules, buttons, stamps and the woven thread. No full-width colour slabs on MARKET pages (decision 52).

**The Coarse Pointer Rule.** Under `pointer: coarse`, control height rises to the 44px `touch-target`.

**The Different Composition Rule.** Narrow screens get a different arrangement, not a squeezed one: the public header moves search, sections and categories into a sheet; ledger columns drop out by container width; stat strips take as many columns as they have metrics.

## Elevation & Depth

Flat. Depth comes from tonal layering (canvas, surface, sunken, well) and 1px rules. Two shadow tokens exist, both mixed from `shadow` at a strength multiplied by `shadow-weight`:
- **Raised** (`0 1px 0` at 10% of `shadow`): a flat bottom edge, not a blur. The `raised` recipe surface (with the strong rule); rare.
- **Overlay** (`0 6px 16px` at 12% and `0 1px 3px` at 8%): only things that sit above the page rather than in its grid: dialogs, popovers, selects, menus, the notification panel, toasts, the command palette, chart tooltips.

**The Borders Carry Structure Rule.** Resting content is separated by rules and grounds. Nothing on the canvas casts a shadow to look important.

## Shapes

One rule, from `design/tokens/shape.json`:
- **Square** (0): containers, grid cells, panels, ledgers, stat strips, dialogs, sheets, the bulk-action bar, the CTA band, photo wells and marketing imagery (`radius-panel`, `radius-media`).
- **2px** (`radius-control`, `radius-stamp`): what you press or what labels a state: buttons, inputs, selects, chips, Segmented strips and items, stamps, thread nodes, filter tokens, checkboxes, chart column data ends.
- **Round**: only the radio control and its dot, kept for native recognisability.
- **Stamp border** (1.5px) on stamps and thread nodes; 1px everywhere else; thread connectors are 2px.

**The Rectangle Rule.** States, chips and filters are rectangles, never pills. No oversized rounded cards anywhere.

### Ribbon
`TradeRibbon` (M-11, `web/features/marketing/Marketing.tsx`) is the organic accent: one flowing band in brand forest with a 2px amber thread along its centre line (on the brand ground the band is chrome). It appears at most twice a page, always behind a grid or a block so square cells cut it into segments, never behind running text, and never in operational surfaces. It is static and `aria-hidden`.

## Imagery

**Scene photographs** (`design/photography/scenes.py`, from `scenes.json`) lead MARKET pages: shops, warehouses, roads and fields from Unsplash. Every one gets the same treatment so a page reads as one shoot: a crop to its slot, one warm matte grade (saturation 0.9, warmth 2.5%, blacks lifted to 10, highlights to 247), and where text sits on the photograph a baked darker lower part (white text) or a light veil in the photograph's own top colour (dark text). Text contrast is measured on the file. Files have content-hashed names, a blur placeholder and a focal point that the interface applies as `object-position`. Below the two-column width, hero text moves under the photograph onto a solid ground.

Product photographs are **cut-outs**: `design/photography/cutout.py` keys each photograph against its own border colour (only ground connected to the edge is removed, so a white product in a white bowl survives), removes the ground's colour from edge pixels so no halo glows on the dark well, trims, adds a short black contact shadow at low alpha, and writes WebP with alpha to `web/public/images/products/`. The web layer sets them on `well` with 6% padding (10% in category cells), so the theme decides the ground. Per-photo options (crop, erase, ground mode, key thresholds, speck removal) live in `design/photography/sources.json`; the ground can be the frame's median colour, a graded column field for studio sweeps, colourfulness (to drop a neutral plate) or one channel (to drop a dark cloth). The script also writes `credits.json` and `README.md` beside the files from the same manifest; the design-system page lists the credits under the ledger. CC BY-SA cut-outs are shared under the same licence. Alt text describes what the photograph shows and says it is a demo photograph; category tiles use empty alt because the category name is the link text.

## Components

Components come in tiers. Put new work in the lowest tier that can express it: derived, then configured, then divergent.

| Tier | Path | Holds |
|---|---|---|
| Tokens | `design/tokens/` | Every value. Generated to CSS and TS. |
| Primitives | `web/components/ui/` | Button, Input, chip recipe, choice, ThemeSwitch, Select, Combobox, Dialog, Table, table controls (TableSearch, FacetChips, TablePager), Stamp, Thread, ColumnChart, Icon, Toast, BrandLogo |
| Layout | `web/components/layout/` | Stack, Cluster, Split, Grid, DensityRegion, Container, AppShell |
| Kernel | `web/components/kernel/` | Recipes (intent, density, tone, surface), slots (title, subtitle, badge, media, figure, meta, timestamp, owner, actions), field registry, feedback, actions, nav, blocks, ProjectedForm, Projection |
| Commerce | `web/components/commerce/` | Stock, pricing, cart, checkout, orders, catalog, admin, notifications |
| Divergent | `web/features/{categories,comparison,fulfillment,marketing,design-system}/` | Each justified in its file |

### Buttons
2px corner, 1px border, semibold. sm 32px; md follows density; lg 48px for FLOW primary actions. **Primary** forest; **Secondary** surface with the strong rule; **Ghost**; **Signal** amber with ink, for trade-attention actions only; **Danger** and outlines; **link**. BIND transitions, a 1px press settle, no scale on hover. Icon-only buttons require a label.

### Tables
Every table searches, filters and pages, live, through one engine (`web/lib/query.ts`, state in `web/lib/client/use-table-query.ts`), so the same words find the same rows everywhere:
- **Search** needs every word somewhere in the row, ignoring case and accents, at most 8 words and 200 characters. Contract lists search only `meta.search`.
- **Filters** follow the field's declared operators (`in`, `eq`, `contains`, `range`, `gte`, `lte`, `isnull`); distance (`near`) needs the server and is not offered client-side. Typed commerce tables use **facet chips** whose counts say what each choice would show beside the other filters; a chip that would show nothing is disabled.
- **Sorting** is stable and type-aware (numbers by value, dates by instant, text by `en-KE` collation with numbers in order); blanks sort last both ways. Contract lists sort only over `meta.ordering`.
- **Pages** are numbered (first, last and a window around the current page, with gaps), "Showing 1 to 10 of 27, from 34" when filtered, rows per page from 10, 25, 50, 100 up to `limits.maxPageSize`. Changing what matches returns to page 1; changing the page size keeps the first visible row. Narrow containers keep previous and next with "Page 2 of 3".
- No match shows the no-results empty state with one "Clear search and filters" action, inside the table's own frame.

**Server lists.** `ListBlock query="server"` keeps the same controls but sends them to a `source` as the contract's `listQuery` parameters (`toListParams`): `q`, one `<field>__<op>` per declared filter (a range as `__gte` and `__lte`), `ordering`, `page_size` and the server's `cursor`. Typing waits for a 250ms pause, a superseded request is aborted, and the rows on screen stay (dimmed, `aria-busy`) until the next ones arrive. Keyset pages have no numbers: the pager shows previous and next with "Page 2 of 5", and a total the server stopped counting reads "10,000+". The backend validates the same grammar against the model's metadata and refuses anything undeclared (`backend/core/operations/listing.py`).

**Page-owned controls.** A page with its own bar passes `controls` (from `useTableQuery` or `useServerList`) and the list renders no toolbar or pager of its own. The category page does this: `FacetFilterPanel` (controlled, with live counts), `SortSelect` and the crawlable `Pagination`, whose links keep their addresses while a click turns the page in place (`onNavigate`).

The price tier ladder, the product comparison matrix and tables inside rich-text content are not record lists and have no controls.

### Product cells (Projection, media intent)
The photo sits in its well at 4:3 with the stock STAMP pinned top left; below it the title, the seller (subtitle), the meta list (pack, minimum order) and, closing the cell at the same height across a row, the **figure** with its label. Actions follow. In row intent the figure sits right-aligned beside the timestamp; in detail it sits under the title at 38/44.

### Storefront sections
- **`StorySplit`** (M-12): a scene photograph on one half and the argument on the other, in one ruled container; photograph left or right, never three in a row.
- **`TradeStatement`** (M-13): one statement per page at `text-statement` (`clamp(3rem, 13cqw, 10.5rem)`, leading 0.9), two lines in ink and primary, with a product cut-out standing in front of the words; the words stay real text and the photograph is decorative.
- **`MarketMeshVisualization`** (M-03): one product's record. The parts of the market sit on the light ground and the record on the chrome ground, and each part shares a grid row with the entry it wrote, so rules and the lit band run straight across the seam (subgrid rows; no connector lines). Availability is set at `text-statement`, and the record closes on its own sum (in, out, available). Choosing a part lights its row on both sides and steps the other entries back. Below the two-column width the record stands alone and drops the running balance.
- **`TradeFlowStory`** (M-06): four numbered steps as one ruled thread (display-width numerals, 2px top rules: primary behind the current step, signal on it), then the step's argument beside its real component on the well, with a "Next" link.
- **`InventoryTrustProof`** (M-07): the argument and an index of the three guarantees hold their place on the left (sticky) while the proofs scroll past on the right, each on the well with the component that enforces it, after Not Another Bill's two-column page. No segmented control: all three proofs are on the page.
- **`MarketingFooter`** (M-10): the page close on the warm ground under a heavy ink rule, with the lockup in ink, ruled link columns and the theme switch (decision 52 retired the chrome slab).
- **`MarketingCTA`** (M-09): the close as an editorial split: the statement at up to 5.25rem with its second line in forest, both calls to action with an arrow that moves on hover and a pressed state, three numbered joining steps on a rule, and a scene photograph that settles from a slight zoom on scroll. The woven thread draws across the top.
- **`TradeRibbon`** (M-11): WOVEN TRADE's thread, two 2px strands (forest and amber) that cross like a weave and draw in from the left as their section enters, by clipping so strokes keep their width.
- **`ProductGallery`** (X-30): the product page's large picture. One photograph fills the frame; more add a thumbnail rail (88px squares, side on wide containers, below on narrow), previous and next, arrow keys, swipe, a counter, the credit line and a larger view. Cut-outs sit on the well, scene photographs fill the frame; photographs crossfade, already loaded.
- **`CategoryHero`** (X-29) and **`SortSelect`** (K-19): the catalogue header and the one sort control, whose options come from the contract's allow-listed `ordering` with labels from each field's label and type.
- **Product listings** (`ProductListing`, with the URL list controls K-20): filters in a 16.5rem sidebar on wide containers and a bottom sheet on narrow ones; above the grid a heavy ink rule carries the count, sort and products per page; below it the range and previous/next links. Category pages add the category's own filters and its buying guide (a signal-soft note with a stamp-width left rule). Each product cell closes with its stock stamp (out of stock only) and the Compare toggle, a square check that turns forest.
- **`BuyBox`** (X-31): every pack on sale as a square option row (a 1px border that turns ink when chosen), price at display size with the price per normalised unit beneath, the stock stamp, then a square stepper from the minimum order and the add button; people who cannot buy read why in place of the button.
- **`CompareTray`** (X-32): a slim bar fixed to the foot of storefront pages under a 2px ink rule, translucent warm ground, the picks as square removable chips and the primary Compare button; the page reserves its height so nothing is covered.

### Stamps
Uppercase 12px semibold at `tracking-caps`, 2px corner, 1.5px border, tone pair, tabular, each tone with a drawn mark; precise conditions override the mark (pending clock, processing spinner, partial, restricted lock, unavailable, unknown). `fresh` plays STAMP once.

### Threads
24px square nodes on 2px connectors: done forest with a check, current amber with a clock, failed danger, stale warning, upcoming muted; connectors solid once passed, dashed while awaiting, dotted when stale.

### Payment status
`PaymentStatusPanel` shows the amount in the figure style, a stamp, and from the moment the prompt is sent a three-step thread: prompt sent, your approval on the phone, confirmed by M-Pesa. Pending is "Awaiting approval on phone"; failed is "Not paid"; cancelled is "Cancelled on phone"; stale is "Not confirmed yet". Only a successful phone result reaches "Paid".

### Orders, approvals and delivery
An order page is one FLOW surface for both sides: the header's action bar carries the commands the record's `_can` allows (confirm, start picking, short-ship, ship, mark delivered, cancel, report a problem), and approval, reorder and delivery each have a block of their own. Order status labels and tones come from the contract's choices, never a second table in the client. `ApprovalFlowBlock` lists each decision, then the approvals still needed, and tells someone who cannot decide who can; rejecting needs a reason. `DeliveryTrackingBlock` degrades in two named ways: **delayed** (the window passed or the carrier reported a delay, warning tone) and **stale** (no news for the backend's limit, muted, "this is the last known state"); a window on one day reads "Tue, 13 Oct, 12:00 to 14:00 EAT", across days "between … and …", and no window says so. Proof of delivery is a private document both sides can open. The order history (`OrderTimelineBlock`) sits beside the summary under one rule, with its own heading.

### Checkout and quotes
`CheckoutSummaryBlock` runs delivery, review and done until payments open (`steps`); delivery fees read "Confirmed by each seller" and the total "Goods total" until a seller prices them. A blocked step stays current, and the reason is stated in the summary. Each seller's part of the cart offers its own quote request (`groupActions`): the sheet's fields are the quote model's from the contract, and sending it moves those lines into the quote. `QuoteDecisionPanel` offers list prices, a counter-offer per line or a decline (which needs the seller's note); an accepted quote shows as a locked snapshot.

### Price books and media
`PriceTierTable` shows the ladder the API resolves (quantity tiers, and a signed-in buyer's own group prices) with "Your price" on the active row and the reason under it. `PriceBookEditor` tabs rules by base, buyer group and quantity tier; the list price leads the base tab, locked ("change it with the pack"), and every rule carries its state (active, starts later, expired, switched off, conflict) and its commands. `MediaManager` uploads to the media pipeline, shows checking, ready and rejected (with the pipeline's reason once, under the stamp), saves alt text on blur and reorders by buttons; the cover is the first ready photograph.

### Analytics
`SellerAnalyticsGrid` keeps its period in the URL. A card's change against the period before is coloured by the metric definition's `better` (a rise in cancellations is bad news), and metrics of the present (stock at risk) or a previous period with nothing in it show no comparison. The footnote names the definitions version and what revenue counts, from the backend's own description.

### Chips and Segmented
`chipStyles` is the one on/off recipe: 32px rectangles, 2px corners, on is inverse. Segmented items take the same on-state. Applied filter tokens are signal soft with the signal border.

### Containers
Recipe surfaces: flat; bordered (surface, rule; the default); raised (surface, strong rule, flat edge); inset (sunken). Inside joined grids the projection is `flat` and the cell carries the surface. Padding: compact 12px, comfortable 16px, spacious 20px on media cells.

### Inputs / Fields
Surface, strong rule, 2px corner, height from density. Prefix and suffix sit inside the frame. Hover takes the foreground border; focus takes the two-tone ring; error a danger border and ground.

### Focus
**The Two-Tone Focus Rule.** Every `:focus-visible` gets a 2px outline in `ring-contrast` at 2px offset around a 2px amber ring.

### Navigation
- **Public header** (`MarketingHeader`): three ruled tiers: a chrome terms strip ("Prices in KES", "M-Pesa through SellaPay", "Times in East Africa Time"), a search-first main row (logo, search for products, SKUs or sellers, sections, CTAs), and the category row with an underline on the current category. Below `@3xl` the search, sections and categories move into a sheet.
- **Masthead** (design system): chrome band with the reversed mark, a command palette trigger and the ThemeSwitch, closed by a 6px brand band.
- **App nav**, **command palette**, **Pagination** (crawlable links, "Showing 1 to 24 of 312 products").

### Signed-in frame
`AppShell` with the server's navigation (`session.nav`) grouped Marketplace, Organization, You, the organization the session acts for (a select when the person has several) with its approval stamp, the notification bell and the account menu (portrait, Profile, Settings, Sign out). Profile photos use the `Avatar` dark-theme variant: seeded people have a second portrait prepared for the dark ground.

### Notifications
`NotificationBell` with an amber count stamp; `NotificationsBlock` as panel or page section; `NotificationPreferencesBlock` opens with the **language** select (from the contract's `locales`: English, Kiswahili) and its help line, then the ledger of events by channel with a switch per cell; every change saves on its own and says "Saving".

### Rich-text editor
`RichTextInput` lazy-loads `components/kernel/fields/rich-text/RichTextEditor.tsx` (Tiptap, CKEditor 5 classic layout) for the four rich-text fields only. One frame with a 2px corner and the strong rule; the toolbar band is `sunken` with 32px square tools (44px on coarse pointers), a "Text style" menu (Paragraph, Heading, Subheading) and 1px separators between groups: history, text style and marks, link, lists with indent, insert (image, video, table, quote, rule). The editor measures its own width: below 560px the extra marks and indent tools, and below 700px the insert group, fold into "Show more items" (a labelled menu). Pressed tools take `primary-soft` with primary ink; unavailable tools stay focusable with `aria-disabled`. The toolbar is one tab stop with arrow-key movement; Alt+F10 reaches it from the text and Esc returns. Forms for link, image, video and table open inline under the toolbar (REVEAL), not in floating balloons; the selected link, image, video or table gets a contextual bar with its own actions. A status bar gives the Alt+F10 hint, words, and characters against the field's limit (danger ink when over). Images need a text alternative or an explicit "Decorative image"; uploads wait for the media pipeline and say so. Video is a still card in the editor and a click-to-play card in the view (`VideoEmbed`), loading the provider only on press.

**The Server Allow-List Rule.** Rich text can contain only what the contract's `richText` lists; the editor's schema, the client preview and the server sanitiser all read that one policy.

### Icons
Lucide outlines through `Icon`: 1.75 stroke, square caps, mitred joins. No icon containers, no icons in circles.

### Charts
`ColumnChart`: single series, columns at most 24px with a 2px data end, hairline quarter grid, peak labelled, tooltip on every column, keyboard stops, a table view; nothing leaves the chart's box.

### Required states
Every interactive component considers default, hover, focus-visible, active, disabled, loading, empty, error, success and permission-restricted, in both themes. Commerce components also consider out-of-stock, low-stock, reserved, reservation-expired, repriced, approval-required, payment-pending, partially-fulfilled, delayed and webhook-stale. Unavailable actions say why.

### Reference surface
`/design-system` is the live inventory: 155 catalogue rows in `catalogue.ts` (11 foundations, 19 primitives, 26 fields, 19 kernel, 10 blocks, 29 kernel extensions, 3 divergent, 13 marketing, 25 templates), rendered from the real components with labelled Kenyan demo data.

## Do's and Don'ts

### Do:
- **Do** take every value from `design/tokens/`; add a token before adding a value, and give it a value in both colour files.
- **Do** compose repeated records as joined cells in one container, and pages as sections between full-width rules.
- **Do** keep containers and media square and controls at 2px.
- **Do** set the commercial quantity large through the `figure` slot, with its label.
- **Do** put product photographs on the `well` as cut-outs, and keep operational surfaces systematic and dense.
- **Do** reserve signal amber for trade attention, and use primary for what is pressed and brand for regions.
- **Do** show money as "KES 1,740.00" with tabular numerals, the U+2212 minus and no wrap.
- **Do** say "not confirmed" on every payment state that is not a successful phone result.
- **Do** name each animation's verb and stay within 120 to 340ms, with no bounce.
- **Do** check new colour pairs in `contrast.test.ts` for both themes.
- **Do** label demo data and demo photographs as demo, and credit every CC BY and CC BY-SA photograph.

### Don't:
- **Don't** add glassmorphism, gradient backgrounds, decorative 3D, glow or floating orbs.
- **Don't** use excessive pill shapes, oversized rounded cards or arbitrary bento layouts.
- **Don't** float cards on the canvas with gaps and shadows; join them.
- **Don't** make SokoMesh rustic: no textures, no hand-drawn ornament, no organic shapes in components. The organic share lives in photography and the ribbon.
- **Don't** use the ribbon more than twice a page, behind text, or in LEDGER and FLOW surfaces.
- **Don't** use amber or yellow for warnings or success.
- **Don't** branch a component on the theme or on a model name.
- **Don't** scale elements on hover or add continuous motion beyond the loading spinner and skeleton.
- **Don't** set the uppercase label above a heading as an eyebrow.
- **Don't** present demo SVG placeholders or demo photographs as real commerce.
