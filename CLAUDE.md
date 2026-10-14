# Adaptive Convergence — Claude Code Project Instructions

This file is intended to be named **`CLAUDE.md`**.

Treat it as shared project memory for Claude Code. Repository reality and the user's current request override stale text in this file. Keep project-specific facts in durable docs/code rather than turning `CLAUDE.md` into an encyclopedia.

## Claude Code usage behavior

- Use this file as a map of architectural invariants and validation rules.
- Claude Code can discover nested `CLAUDE.md` files. More local instructions should describe only the directory-specific exceptions they own.
- If this project uses imported memory files, keep imports targeted to durable docs; do not import huge logs or generated files.
- Read only the docs required for the current task. A typo fix should not trigger a full architecture audit.
- Before creating a new file, use the placement rules below.
- When an ambiguity could alter architecture, data shape, permissions, or visual direction, call it out rather than inventing a hidden assumption.
- For routine details already established by code/tests, proceed using the repository pattern.

**Platform profile:** Web / Next.js + Django

## Adaptive Convergence operating laws

Treat Adaptive Convergence as an architectural method, not as a package or a visual theme.

1. **Single authoritative source.** Define each business fact once on the side that owns it.
2. **Versioned contract.** Clients consume a versioned machine-readable contract; they do not invent backend facts.
3. **Zero-redundancy derivation.** Generate or resolve repeated behavior instead of copying it across models/features.
4. **Bounded resources.** Every list, stream, cache, queue, image, worker, socket, and parallel task has a limit and an owner.
5. **Universal projection.** Repeated UI is resolved from contract metadata through design recipes, semantic slots, page blocks, and actions.
6. **Converged lifecycle.** Design tokens, contract artifacts, generated code, tests, CI, and release/deployment must not drift.

### Ownership rules

- **Backend owns:** data shape, constraints, cross-field/domain validation, permissions, roles, domain workflows/commands, business limits, canonical labels/choices by default.
- **Client owns:** presentation, accessibility, responsive/adaptive layout, temporary interaction state, focus, animation, local view state, and platform-specific interaction details.
- **Design system owns:** color roles, typography, spacing, radii, elevation/surfaces, density, icon treatment, imagery treatment, and motion recipes.
- **Generated code owns nothing:** it mirrors a source of truth and must never be hand-edited.
- A client may mirror a server rule for immediate feedback, but the server result always wins.
- If a field, action, role, status, permission, or validation rule exists only in client code, treat that as a defect unless it is explicitly presentation-only.

### Derived, configured, divergent

Classify every UI change before implementing it.

- **Derived:** the contract + recipe system can render it with no feature-specific code.
- **Configured:** the generic projection remains, but a small declarative override changes slots, recipe variants, block order, copy, or visibility allowed by the contract.
- **Divergent:** truly bespoke interaction or media surface that the projection model cannot express cleanly.

Prefer **derived → configured → divergent**. Do not force a highly visual or genuinely unique interaction into generic projection just to reduce file count. Conversely, do not create a divergent component merely because it is faster than extending metadata or a recipe.

## Web reference architecture

The reference stack is Django/ASGI + PostgreSQL + Redis/Valkey on the backend and Next.js App Router + React + TypeScript + Tailwind on the frontend, with generated validation/types and contract-driven UI. Respect the repository's installed versions; do not upgrade, downgrade, or replace core libraries unless the task asks for it.

For a new Adaptive Convergence web project, prefer this shape:

```text
repo/
├─ contract/
│  ├─ ac-contract.json          # generated, committed, reviewed
│  └─ CHANGELOG.md
├─ backend/
│  ├─ config/
│  ├─ core/                     # fixed kernel; does not grow per model
│  │  ├─ operations/
│  │  ├─ contract/
│  │  ├─ policies.py
│  │  ├─ tenancy.py
│  │  ├─ events/
│  │  └─ auth/
│  ├─ apps/                     # business apps: models, commands, domain rules
│  └─ tests/
├─ frontend/
│  ├─ app/                      # routes/layouts/composition only
│  ├─ components/
│  │  ├─ ui/                    # primitives
│  │  ├─ layout/                # Stack/Cluster/Split/Grid/Shell equivalents
│  │  └─ kernel/
│  │     ├─ fields/
│  │     ├─ recipes/
│  │     ├─ blocks/
│  │     ├─ actions/
│  │     ├─ feedback/
│  │     └─ Projection.tsx
│  ├─ features/                 # overrides + justified divergent UI only
│  ├─ lib/
│  │  ├─ contract/              # generated types/metadata + resolvers
│  │  ├─ server/
│  │  └─ client/
│  └─ tests/
├─ design/
│  ├─ tokens/                   # exported variables, generated inputs
│  └─ references/               # optional visual references; never a code source of truth
├─ docs/
│  ├─ project-context.md
│  ├─ design/visual-direction.md
│  └─ architecture/
├─ infra/
└─ .github/workflows/
```

Do not restructure an established repository merely to match this tree. Preserve a compatible existing layout and apply the same ownership boundaries.

### Web file-placement decision

Before creating a file, decide where the responsibility belongs:

| Question | Put it here |
|---|---|
| Generated client contract/type/validator? | `web/lib/contract/` or the repo's generated directory; edit the generator/source instead |
| Backend business field/rule/permission/limit? | `backend/apps/...` model/rule/command or backend policy registry |
| Cross-model backend operation? | `backend/core/operations/` |
| Cross-model UI behavior? | `web/components/kernel/` or `web/lib/` |
| Primitive visual control? | `web/components/ui/` |
| Layout primitive? | `web/components/layout/` |
| Recipe/variant/slot/block? | `web/components/kernel/{recipes,fields,blocks,...}` |
| One model's declarative visual difference? | a small `features/<feature>/overrides.ts` entry |
| Truly bespoke interaction? | clearly named divergent component under `features/<feature>/` with a short justification |
| Route/page? | `app/`; compose blocks and data, do not duplicate model-specific UI |
| Design token? | `design/tokens/` source/export path; never hard-code a second copy |

Avoid feature-folder sprawl such as `features/x/components/`, `hooks/`, and `utils/` containing generic code. If code is reusable beyond one divergent feature, move it to the kernel/lib layer.

### Web server/client boundary

- Keep pages, layouts, and non-interactive blocks server-rendered when the framework allows it.
- Push client boundaries down to the smallest interactive islands: forms, action bars, realtime list bodies, chat composers, media controls, etc.
- Do not add `"use client"` at a high level just to make an API easier to call.
- URL-addressable state such as filters, sort, cursor, selected/open record, and tabs should live in the URL when appropriate.

## Non-generic UI protocol

A reusable agent guide must not become a reusable aesthetic. **Do not encode one visual style into every project.** Use the same architecture, not the same look.

### Establish a project-specific design fingerprint before high-fidelity UI work

Use existing design artifacts first. If the project has Figma, screenshots, brand guidelines, moodboards, existing production screens, or reference images, inspect them before styling. Record or infer a concise design fingerprint with these dimensions:

- brand/personality adjectives;
- editorial vs utilitarian vs playful vs technical vs premium vs brutalist vs organic, etc.;
- grid/composition and information density;
- typography voice, hierarchy, width, case, and rhythm;
- color roles and temperature, not just hex values;
- shape language: square/soft/round/asymmetric/geometric;
- surface treatment: flat/bordered/elevated/inset/glass/textural;
- spacing rhythm and whitespace behavior;
- icon style and stroke weight;
- image/illustration treatment: crop, masking, duotone, grain, border, captioning;
- data visualization character;
- motion character: restrained, elastic, cinematic, mechanical, immediate;
- signature motifs that make this product recognizable;
- explicit things to avoid.

If no visual direction exists, do not silently default to a fashionable SaaS dashboard. For a greenfield product, produce a brief visual-direction proposal before polishing major screens, or keep the initial UI structurally neutral until a direction is selected.

### Using reference images as inspiration

When an image/screenshot is supplied:

1. Analyze **principles**, not pixels: hierarchy, proportions, rhythm, type behavior, surface language, image treatment, motion cues, and interaction density.
2. Translate those principles into this project's tokens and recipes.
3. Preserve the project's own content, brand, accessibility, and platform conventions.
4. Do not copy proprietary logos, illustrations, text, or a screen one-for-one.
5. Introduce deliberate project-specific decisions rather than recreating the reference exactly.
6. If references conflict, state which traits are being taken from which reference.
7. Store long-lived conclusions in the project's design-direction doc; do not keep re-reading every reference for routine code edits.

### Generic-UI warning signs

Treat these as suspicious defaults, not absolute bans:

- every section placed inside a rounded card;
- default shadcn/Material styling left largely untouched;
- blue/purple gradient + glowing blobs regardless of brand;
- oversized hero copy followed by three equal feature cards;
- excessive `rounded-xl/2xl`, shadows, glassmorphism, pills, and gradient borders without design rationale;
- repeated icon-in-circle motifs for unrelated concepts;
- arbitrary dashboard metric cards when the product does not need them;
- identical desktop/mobile composition with only width changes;
- Lorem Ipsum or invented product data when contract/seed/product content exists;
- random microanimations added because they look "premium."

A familiar pattern is fine when the design fingerprint calls for it. The problem is accidental sameness.

### Recipes, slots, and tokens

- Content comes from contract metadata and semantic slots; appearance comes from tokens and recipes.
- A **visual difference should first be modeled as a recipe variant**, not as a new model-specific component.
- New recipe values must be represented in both design artifacts and code.
- Kernel code must not hard-code project/domain model names to select appearance.
- Avoid raw colors, radii, spacing, and typography values in kernel components when a token/recipe can express them.
- Primitives are implementation foundations, not the final brand aesthetic.

## Web interaction and motion rules

Motion is part of the recipe system. It must reinforce the visual direction and interaction semantics.

### Choose the lightest capable mechanism

- Use CSS transitions/animations or the platform's View Transition capabilities for simple state, hover, focus, reveal, and page transitions when sufficient.
- Use **Motion for React** (or the repository's existing equivalent) for presence, shared-layout transitions, spring-based movement, gesture-driven interaction, and orchestrated component motion.
- Use **GSAP** only when the product genuinely needs complex timelines, scroll choreography, or sequencing that is awkward with lighter tools.
- Use Rive/Lottie only for authored brand/illustration motion supplied or approved for the product.
- Do not install multiple animation libraries for overlapping jobs.
- Before adding a dependency, check the repository's current framework versions, maintenance status, bundle/runtime cost, SSR/client implications, and license.

### Derive motion from style

Examples of translation, not universal presets:

- **Minimal / utilitarian:** short opacity/transform transitions, low travel, little or no overshoot.
- **Editorial / premium:** deliberate reveals, controlled staggering, subtle scale/depth, longer but sparse emphasis moments.
- **Playful:** spring response, small overshoot, expressive hover/press feedback, but avoid constant motion.
- **Brutalist / industrial:** immediate or sharply eased state changes, restrained interpolation, strong spatial cuts.
- **Futuristic / immersive:** layered depth and shared transitions only where performance and readability remain strong.

Define motion tokens/recipes for duration, easing/spring, distance, and stagger rather than scattering values across components.

### Motion quality gates

- Honor `prefers-reduced-motion`.
- Never animate large layout regions continuously while the user is reading.
- Prefer transform/opacity for high-frequency motion.
- Avoid animation that delays a required action or obscures system status.
- Realtime list updates should be coalesced/bounded; do not trigger a page-wide animation per event.
- Focus, keyboard navigation, screen-reader announcements, and motion-reduced behavior must still work.

### Web visual review checklist

Before marking a UI task complete, verify:

- no kernel component branches on a model name for appearance;
- new visual differences are represented by recipe/token/slot/block changes or a justified divergence;
- Figma/reference variants map to recipe axes rather than one-off classes;
- every displayed field/action is real according to the contract;
- layouts are tested at narrow mobile, intermediate/tablet, and wide desktop container widths;
- light/dark modes are checked when supported;
- keyboard/focus/semantics and contrast remain valid;
- projected motion respects reduced motion;
- content is not hidden solely as a client-side permission check;
- the change does not introduce a new per-model page/component that generic routes/blocks already cover.

## Web code accuracy and quality gates

### Before editing

- Inspect the files directly involved, the nearest tests, the contract metadata, and relevant package/config files.
- Use the repository's actual scripts and installed versions. Do not generate syntax for a library version you have not verified.
- For a small fix, read only the context needed. Do not perform a full-repo architecture tour unless the task affects architecture.
- Search for an existing operation, component, recipe, utility, or test pattern before creating a new abstraction.

### Correctness rules

- Never invent API fields, model keys, role names, actions, statuses, error codes, or permissions.
- Never manually edit generated contract/types/token files.
- No model/field/role/action string literals in the generic kernel unless they are part of a registry/generator designed to consume them.
- Prefer typed boundaries. Avoid `any`; if an untyped external boundary is unavoidable, validate/narrow it immediately.
- Backend filters/sorts/includes must be allow-listed from the contract; do not pass arbitrary client strings into ORM queries.
- Authorization belongs on the server. Hiding a button is not security.
- Use server-issued record versions/idempotency semantics for writes when the project supports them; do not silently fall back to last-write-wins.
- Tenant/user-specific data must not leak through shared caches.
- Session/auth secrets must not be exposed to browser storage or logs.
- Events should carry the minimum safe payload; refetch through authorized API paths when required.
- Every async fan-out has a concurrency limit; every stream/sink has backpressure/bounds; every cache has an invalidation/eviction rule.
- Every effect/resource has cleanup: abort, unsubscribe, close, terminate, stop, or dispose.
- Keep domain rules out of `overrides.ts`; overrides are presentation/configuration only.

### Organization rules

- Small cohesive functions over giant route/components.
- Prefer composition and registries to `switch(model)` branches.
- Route files compose; kernel files generalize; feature files only configure or implement justified divergence.
- If two features need the same helper, promote it to a shared layer rather than copying it.
- Do not create speculative abstractions for a single use. Extend the kernel when repeated evidence exists or the contract requires it.
- Keep comments for invariants, intent, and non-obvious tradeoffs; do not narrate obvious syntax.

### Validation after changes

Use the repository's canonical commands. For a new reference project, establish commands equivalent to:

```text
contract generation + drift check
backend checks/tests
frontend lint
TypeScript typecheck
unit tests
contract compatibility tests
accessibility tests for affected projected pages
production build
targeted e2e/integration tests when behavior crosses layers
```

If the project provides `just check`, `pnpm verify`, or equivalent, prefer that single supported entry point.

Never claim a check passed unless it was actually run. If a check cannot run, report exactly which one and why.

## New-project startup protocol

For the first substantial task in a new repository:

1. **Inventory, do not assume.** Identify the actual stack, package manager, framework versions, test runner, contract path, token source, CI commands, and existing architecture.
2. **Find the authorities.** Locate backend models/rules/policies, the versioned contract, design tokens/Figma source, and any ADR/product requirements.
3. **Establish project context.** If missing, create a small `docs/project-context.md` with product purpose, primary users, roles, core domain entities, environments, and canonical commands.
4. **Establish visual direction.** If high-fidelity UI is in scope and no durable design note exists, create `docs/design/visual-direction.md` from the brand brief/Figma/reference images. Do not invent a permanent aesthetic silently.
5. **Confirm the contract loop.** Ensure a backend change can regenerate the committed contract and client artifacts; ensure CI can detect drift.
6. **Confirm design convergence.** Ensure tokens/recipe names have one canonical source and generated client outputs.
7. **Create the smallest viable kernel.** Do not scaffold hundreds of speculative files. Add generic infrastructure only when required by the current product slice.
8. **Define validation commands.** Make lint/type/test/generation checks easy to run through one documented command if the repository lacks one.
9. **Build one vertical slice first.** Prove model → contract → generated types → projection → write/realtime/offline behavior before multiplying features.
10. **Record exceptions.** Any deliberate divergent UI, duplicated rule, or temporary bypass must have a reason and follow-up path.

### Per-task change protocol

For each task:

1. Restate the requested behavior internally and identify affected source(s) of truth.
2. Classify the change as backend/contract, generated, recipe/token, override, or divergent.
3. Determine the minimum set of files to touch.
4. Read relevant code/tests only.
5. Implement the smallest coherent change.
6. Regenerate artifacts if their source changed.
7. Run targeted tests, then the project-level verification gate.
8. Review the diff for duplicated rules, model literals in kernel code, hard-coded styling, unbounded resources, leaked secrets, and unused files.
9. Summarize what changed, what was verified, and any remaining risk. Do not report unrun checks as passed.

## Completion standard

A change is complete only when:

- behavior matches the authoritative requirements/contract;
- file placement respects ownership;
- no avoidable duplication was introduced;
- generated artifacts are regenerated rather than patched;
- UI changes have a project-specific visual rationale rather than a generic default;
- motion is semantic, accessible, and bounded;
- relevant tests/checks were run and their results are reported truthfully;
- the final diff is smaller and easier to reason about than an equivalent per-feature/per-model implementation.

When a requested change conflicts with an Adaptive Convergence invariant, do not silently break the invariant. Explain the conflict in the implementation summary and use the smallest deliberate exception if the user still requires it.
