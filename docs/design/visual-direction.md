# SokoMesh — visual direction

**Status: superseded (2026-10-12).** The binding direction is now [constitution.md](constitution.md) (the SokoMesh Design Constitution), and the shipped system is described in [DESIGN.md](../../DESIGN.md). This file is kept as the record of the first proposal. Where the two disagree, the constitution and DESIGN.md win. Notable changes since: corner radii are 2 / 4 / 8 / 14 px (stamp / control / panel / media), warning is burnt orange `#9A4A12`, and density, motion and status-tone tokens now exist.

## Design fingerprint

| Dimension | Direction | Source |
|---|---|---|
| Personality | Grounded, warm, resourceful, trustworthy | from kit |
| Voice | Plain commercial language; show quantities and money explicitly; explain every unavailable or delayed action | from kit |
| Character | A working market ledger, not a SaaS dashboard. Storefront surfaces lean warm and merchandised; seller and warehouse surfaces lean utilitarian and dense | proposed |
| Density | Buyers: comfortable. Sellers and warehouse: compact. Expressed as `density.*.json` tokens, not per-screen CSS | proposed (the brief asks for buyer and seller density variables) |
| Typography | Plus Jakarta Sans for headings, Inter for product text. Money and quantities use tabular numerals and always carry a unit or currency | from kit; numerals proposed |
| Colour temperature | Warm. Off-white surface with a green tint (`#F6F8F2`), green-black ink (`#13251D`), forest-green primary (`#145C43`), amber accent (`#F5B63C`) | from kit |
| Shape language | Geometric and faceted, like the mark (a market canopy over an open crate). UI corners are soft but never pill-shaped: 8 / 14 / 24 px | from kit |
| Surfaces | Flat fills, no gradients or glass. Separate regions with tone and thin rules rather than wrapping every section in a card | proposed |
| Signature motifs | Alternating amber and green canopy bands; the white seam line through the crate | from kit (mark) |
| Iconography | Not defined. Should match the mark's angular geometry (squared terminals, consistent stroke) | open |
| Imagery | Product photography on neutral ground, cropped to the rendered slot; no decorative stock imagery | proposed |
| Data visualisation | Not defined. Seller analytics must reconcile cards, charts and exports to one metric definition | open |
| Motion | Restrained and utilitarian: short opacity and transform changes with low travel and no overshoot. State changes (reserved, repriced, shipped) are announced, not animated for flair. Honour `prefers-reduced-motion` | proposed |

## Colour roles and contrast

Semantic roles live in `design/tokens/color.light.json` and alias the brand primitives in `brand-tokens.json`.

| Pair | Ratio | Use |
|---|---|---|
| ink on surface | 14.98:1 | body text |
| primary on surface | 7.43:1 | links, primary text accents |
| white on primary | 7.95:1 | primary buttons |
| ink on accent | 8.88:1 | accent badges and highlights |
| accent on primary | 4.41:1 | large text or graphics only |
| **accent on surface** | **1.69:1** | **never text, never a lone indicator** |

**Focus.** The brand `focus` colour is amber, which reaches only 1.69:1 on the surface and fails WCAG 1.4.11 (3:1). The implemented focus style is two-tone: an amber ring inside an ink outline (`ring` + `ring-contrast`, in `web/app/globals.css`). The ink outline carries the contrast and the amber keeps the brand. *Proposed: confirm with design.*

## Avoid

- Blue or purple SaaS gradients, glowing blobs, glassmorphism.
- Putting every section in a rounded, shadowed card.
- Amber text or amber-only status on the light surface.
- Money or quantities without a currency or unit; floats in price display.
- Metric cards that no seller decision depends on.
- Identical mobile and desktop compositions. Storefront is designed at mobile width first; seller tables at desktop width first.

## Open questions

1. **Status tones.** `success`, `warning`, `danger` and `info` are not in the kit. Order, stock and payment states need them. Success must stay distinct from the green primary, and warning from the amber accent.
2. **Neutrals.** Border, muted surface and muted text are not defined.
3. **Dark mode.** Not defined. `color-scheme` is pinned to light until a `color.dark.json` exists.
4. **Lockup wordmark.** `logo-horizontal.svg` sets "SokoMesh" and the tagline as live SVG text in DejaVu Sans/Arial, so it renders in whatever system font is installed. Outlining the text in the source artwork would make it consistent.
5. **Lockup tagline legibility.** The tagline is 38/1600 of the lockup width, so it only reaches 12 px when the lockup is at least about 505 px wide. Below that, use the mark next to live text set in the brand fonts.
