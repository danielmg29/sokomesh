@AGENTS.md

# web/ — local rules

The root `CLAUDE.md` governs architecture. These are the exceptions this directory owns.

- Generated, never edited: `lib/contract/generated.ts` (from `contract/ac-contract.json` via `tools/gen-contract.mts`), `app/tokens.generated.css` and `lib/design/tokens.generated.ts` (from `design/tokens/*.json` via `tools/gen-tokens.mts`). Change the source and run `pnpm gen`.
- Brand files live only in `public/brand/` and are named only in `lib/brand.ts`; render logos through `components/ui/BrandLogo.tsx` so the minimum-size and clear-space rules hold (`docs/design/brand-assets.md`).
- Tailwind's default palette and radii are cleared in `app/globals.css`; only token utilities exist (`bg-primary`, `rounded-md`, `p-4`). If a design needs a value that is not a token, add it to `design/tokens/` first.
- Import tiers are enforced by `eslint-plugin-boundaries`: `lib` ← `ui` ← `layout` ← `kernel` ← `commerce` ← `features` ← `app`.
- `components/commerce/` holds the spec's kernel extensions (stock, pricing, cart, checkout, orders, catalogue, admin): commerce-aware, reused across features, never model-name branching.
- Every component the app uses has a row in `features/design-system/catalogue.ts` and a live specimen under `features/design-system/specimens/`. Add both when you add a component; `tests/unit/registry.test.ts` checks the field widgets.
- If a design shows a field, action or role that is not in the contract, stop and report it.
