# SokoMesh — brand asset usage

Rules from the kit's `ASSET_USAGE.md` (Adaptive Convergence Portfolio Project Kit, `assets/web/02_sokomesh/`), and where each asset lives in this repository.

## Rules

- **Clear space.** Keep clear space equal to one quarter of the mark width on every side. Do not place the mark on a background that reduces contrast.
- **Minimum size.** Mark in interfaces: 20 px. Horizontal lockup on screen: 160 px wide.
- **Monochrome mark.** Use it only when a single colour is required.
- **Colour.** Primary `#145C43`, accent `#F5B63C`, ink `#13251D`, surface `#F6F8F2`. These are defined once, in `design/tokens/brand-tokens.json`.
- **Preferred files.** `logo-mark.svg` is the scalable symbol, `logo-horizontal.svg` the full lockup, `favicon.svg` the modern favicon, `social-card-1200x630.png` the Open Graph preview, and `brand-tokens.json` the source for Figma and code variables.
- **Legal.** The name and identity are portfolio concept work. Complete trademark and domain checks before commercial use.

## How the rules are enforced in code

- `web/lib/brand.ts` is the only module that names files in `public/brand/`. It also records each logo's minimum width and the mark's share of the asset width.
- `web/components/ui/BrandLogo.tsx` renders a logo at no less than its minimum width, with padding equal to one quarter of the rendered mark width.
- `web/tests/unit/brand.test.ts` fails if a registered file is missing, or if the size and clear-space rules stop holding.
- Brand colours reach the site only through tokens: `design/tokens/*.json` → `web/app/tokens.generated.css` and `web/lib/design/tokens.generated.ts`.

## Where every kit file went

Served files keep the kit's folder names, so `logo/logo-mark.svg` in ASSET_USAGE is `/brand/logo/logo-mark.svg` on the site.

| Kit file | Location | Used for |
|---|---|---|
| `logo/logo-mark.svg` | `web/public/brand/logo/` | `BrandLogo variant="mark"` |
| `logo/logo-horizontal.svg` | `web/public/brand/logo/` | Source for the trimmed lockup below; kept as delivered |
| (derived 2026-10-17, awaiting brand-owner approval) `logo-lockup.svg`, `logo-lockup-reversed.svg` | `web/public/brand/logo/` | `BrandLogo variant="lockup"`: the kit lockup with its artboard trimmed to the artwork (the 1600 × 400 board left about a third of its width empty, so the name and tagline rendered a third smaller than their box). Nothing inside changes. Auth pages and the footer, at 264 px and up, where the tagline is readable |
| (derived 2026-10-17, awaiting brand-owner approval) `logo-wordmark.svg`, `logo-wordmark-reversed.svg` | `web/public/brand/logo/` | `BrandLogo variant="wordmark"`: the kit mark with the name set beside it at 150 units, centred on the mark, and no tagline. The public header and app navigation, at about 200 px, where the kit lockup's tagline was under 4 px |
| (derived, approved 2026-10-13) `logo-horizontal-reversed.svg`, `logo-mark-reversed.svg` | `web/public/brand/logo/` | Dark grounds: brand-surface wordmark, lifted-forest tagline `#44A77B` (5.6:1), the mark forest raised one lightness step in its own hue to `#3B7E63` (3.5:1); amber and the white seam unchanged. `BrandLogo` swaps them in on the dark theme, and `ground="dark"` forces them on chrome |
| `icons/favicon.svg` | `web/public/brand/icons/` | `<link rel="icon" type="image/svg+xml">` |
| `icons/favicon.ico` | `web/public/brand/icons/` | `<link rel="icon">`; `/favicon.ico` is rewritten here in `next.config.ts` |
| `icons/apple-touch-icon-180.png` | `web/public/brand/icons/` | `<link rel="apple-touch-icon">` |
| `icons/icon-192.png`, `icon-512.png` | `web/public/brand/icons/` | Web app manifest icons |
| `icons/mask-icon.svg` | `web/public/brand/icons/` | Safari pinned tab (`rel="mask-icon"`, primary colour) |
| `social/social-card-1200x630.png` | `web/public/brand/social/` | Open Graph and Twitter card |
| `tokens/brand-tokens.json` | `design/tokens/brand-tokens.json` | Token source; not served |
| `web/site.webmanifest` | not copied | Replaced by `web/app/manifest.ts`, which builds the same manifest from tokens |
| `web/browserconfig.xml` | not copied | Legacy Windows tiles (IE11 and legacy Edge); no current browser reads it |
| `web/ASSET_PLACEMENT.md`, `ASSET_USAGE.md` | not copied | Folded into this document |
| `icons/favicon-16.png`, `-32.png`, `-48.png` | not copied | `favicon.ico` already contains 16, 32 and 48 px |
| `logo/logo-mark-512.png`, `-1024.png`, `logo-horizontal-1600x400.png` | not copied | Raster exports for non-web use; the site uses SVG |
| `logo/logo-mark-monochrome.svg` | not copied | No single-colour context on the site yet |
| `social/project-cover-1600x900.png` | not copied | Portfolio case-study cover, not a site asset |

Files that were not copied remain in the kit. Bring one in, and register it in `lib/brand.ts`, only when the site uses it.

## Not brand assets

- Authored marketing images go in `web/public/images/` when they exist.
- User uploads (product media, seller documents) never go in `public/` or Git. They go through the backend to S3-compatible storage, with metadata and access policy in PostgreSQL.
- Next.js scaffold assets (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`, the default `app/favicon.ico`) were removed.
