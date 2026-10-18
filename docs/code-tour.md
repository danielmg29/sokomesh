# SokoMesh code tour

A guided read of everything built so far: the foundation (contract pipeline, design tokens, kernels, design system), the four foundation features (`SM-F-01`, `SM-F-02`, `SM-F-22`, `SM-F-21`), the six Core CRUD features (`SM-F-03`, `SM-F-04`, `SM-F-08`, `SM-F-09`, `SM-F-10`, `SM-F-20`) and the seven Integrated features (`SM-F-05`, `SM-F-06`, `SM-F-15`, `SM-F-12`, `SM-F-11`, `SM-F-19`, `SM-F-17`). Sections follow a sensible reading order; each lists the files, what each is for, and what to look for. Links are relative to this file.

**How to use it.** Read section 0 for the shape, then 1 (foundation) before any feature. Each feature section goes backend first (model, then resource declaration, then views), then web (data hooks, then pages). Read 6 (category contracts) before 7 to 11: every later catalogue surface derives from a contract. Read 14 (order lifecycle) before 15 to 18: approval, quotes and delivery all place or move orders through it. Section 23 has end-to-end traces to follow with the code open.

---

## 0. The shape in one picture

```text
Django models + rules ──► Resource declarations (core/operations/registry.py)
        │                         │
        │                         ├─► generated API routes  /api/v1/<path>, /<path>/<ref>, /<path>/<ref>/<action>
        │                         └─► contract "models" (fields, commands, path)
        ▼
python manage.py contract export ──► contract/ac-contract.json (versioned, committed)
        │
pnpm contract:gen ──► web/lib/contract/generated.ts (types, Zod schemas, *Meta objects, roles, locales…)
        │
        ▼
Projection kernel (ProjectedForm, ListBlock, ActionBar, fields…) renders from *Meta
Pages in web/app compose kernel blocks; features/ hold the few hand-built (divergent) surfaces.

Browser ──/api/*──► Next.js rewrite (next.config.ts) ──► Django on :8000   (same-origin cookies, CSRF header)
Public pages ──server fetch──► Django, cached with "use cache" (lib/server/storefront.ts)
```

Rules that run through everything (from the root `CLAUDE.md`): the backend owns every business fact; the client never invents fields, roles or rules; generated files are never edited; every list, upload and gallery has a bound.

---

## 1. Foundation (earlier commits)

### 1.1 The contract pipeline
| File | What it is for |
|---|---|
| [backend/core/contract/build.py](../backend/core/contract/build.py) | Assembles the contract from backend sources: settings (auth, limits, locales, rich text, list grammar), the error registry, role policies, and `export_models()` from the registry. Also derives the password rule text from Django's validators. |
| [backend/core/contract/compat.py](../backend/core/contract/compat.py) | Classifies changes between two contracts (additive, breaking, presentational) and works out the version bump each needs. Dropping a `required` or `readOnly` flag counts as relaxing (additive). |
| [backend/core/contract/management/commands/contract.py](../backend/core/contract/management/commands/contract.py) | `contract export` (refuses to write without the right version bump) and `contract check` (CI drift check). |
| [contract/ac-contract.json](../contract/ac-contract.json) | The generated, committed contract (0.6.0). Never edit by hand. |
| [contract/CHANGELOG.md](../contract/CHANGELOG.md) | What each contract version added. |
| [web/tools/contract.mts](../web/tools/contract.mts), [web/tools/gen-contract.mts](../web/tools/gen-contract.mts) | Turn the contract into TypeScript: constants (`auth`, `limits`, `listQuery`, `locales`, `richText`, `uploads`, `errors`, `roles`, `rolePermissions`) and, per model, a Zod schema, a write schema and a `*Meta` object (input-only command fields stay out of the schemas). |
| [web/lib/contract/generated.ts](../web/lib/contract/generated.ts) | The output. Look at `SellerProfileMeta` to see what the kernel reads. Never edit. |
| [web/lib/contract/types.ts](../web/lib/contract/types.ts) | Hand-written types for the metadata shape (`ModelMeta`, `FieldMeta`, `ActionMeta`, `Rec`, `AppError`). |

### 1.2 Design tokens
| File | What it is for |
|---|---|
| [design/tokens/](../design/tokens/) | The single source for colour (light, dark), type, shape, density and motion, in DTCG JSON. |
| [web/tools/tokens.mts](../web/tools/tokens.mts), [web/tools/gen-tokens.mts](../web/tools/gen-tokens.mts) | Generate `app/tokens.generated.css` and `lib/design/tokens.generated.ts`. |
| [web/app/globals.css](../web/app/globals.css) | Tailwind theme bound to the tokens, motion utilities (`motion-*`, `scroll-reveal`, `thread-weave`, `scroll-settle`), rich-text styles. |

### 1.3 Backend kernel
| File | What it is for |
|---|---|
| [backend/core/result.py](../backend/core/result.py), [backend/core/http.py](../backend/core/http.py) | `Ok`/`Err` results, the error codes and their HTTP status and default messages (e.g. `UNAUTHENTICATED` 401, `UNVERIFIED` 403). |
| [backend/core/api.py](../backend/core/api.py) | The `@endpoint(...)` decorator every view uses: method check, sign-in and verified-email checks, error mapping; `invalid()`, `fail()`, `throttle()`, `body()`, `text()`. |
| [backend/core/policies.py](../backend/core/policies.py) | Role → permission table (`ROLE_PERMISSIONS`) and `allowed(user, permission, organization)`. Exported into the contract. Roles come from `apps/organizations/tenancy.py`, which reads a user's memberships once per request (`held`, `forget`). |
| [backend/core/operations/listing.py](../backend/core/operations/listing.py) | The list-query grammar: parses `q`, `field__op` filters, `ordering`, `page_size`, signed keyset `cursor`; applies them to a queryset. `search_paths` map virtual fields (e.g. member name) to database paths. Pages go both ways: `run_list` returns `next` and `previous` cursors (`_after`/`_before`, `_order` reverses for reading back). `ListSpec.widen()` adds fields one request may filter on (a category contract's facets), `builders` match a field with a custom query (JSON list contains any chosen value), `narrow()` applies everything but one filter (for facet counts), and an `extra` callback adds to the response. |
| [backend/core/operations/registry.py](../backend/core/operations/registry.py) | **The heart of the features.** `Field` + `derive()` (field metadata from the model), `Action` (commands), `Resource` (one model's declaration: fields, permissions, commands, hooks, including `list_spec` and `list_extra` for lists), the generated views (`collection_view`, `item_view`, `action_view`), serialisation (`_can` per record), input checking (`clean_input`/`coerce`, including the Kenyan mobile rule and rich-text sanitising), and `urls()`. |
| [backend/core/richtext.py](../backend/core/richtext.py) | Sanitises rich text against the allow-list (nh3) and produces the plain-text copy. |
| [backend/core/mail.py](../backend/core/mail.py) | `BrevoBackend` (Brevo transactional API) and `send_email()` with the branded HTML template. |

### 1.4 Web data layer
| File | What it is for |
|---|---|
| [web/lib/client/api.ts](../web/lib/client/api.ts) | `api()`: same-origin fetch with the CSRF header and errors narrowed to `AppError`; `attempt()` for forms. |
| [web/lib/client/session.ts](../web/lib/client/session.ts) | The session (`useSession`), the active organization, `may()` (permission mirror for showing controls), `homeFor()`, `useSessionWrite()`. |
| [web/lib/client/resources.ts](../web/lib/client/resources.ts) | Hooks keyed by contract metadata: `useList`, `useRecord`, `useSave`, `useCommand`, `useSource` (server-paged list source that refreshes after writes). |
| [web/lib/client/records.ts](../web/lib/client/records.ts) | Shapes the API adds beyond the contract fields, shared by server pages and browser islands: seller profiles, products and variants (with price tiers), contract summaries, category contracts, photographs and price rules, carts, orders with their history, approval and shipments, quotes, analytics answers, reorder differences, the comparison state. |
| [web/lib/query.ts](../web/lib/query.ts), [web/lib/client/use-table-query.ts](../web/lib/client/use-table-query.ts), [web/lib/client/use-server-list.ts](../web/lib/client/use-server-list.ts) | One table query engine: in-memory for small lists, server-paged (same parameters as the backend grammar) for API lists. `toListParams`/`fromListParams` convert between table state and URL parameters; `apiListParams` turns a page's URL into API parameters (dropping the display-only page number, fixing a route's own filter). |
| [web/app/providers.tsx](../web/app/providers.tsx) | TanStack Query, tooltips and toasts around the whole app. |

### 1.5 Projection kernel (how pages are derived from metadata)
| File | What it is for |
|---|---|
| [web/components/kernel/forms/ProjectedForm.tsx](../web/components/kernel/forms/ProjectedForm.tsx) | Create/edit forms from field metadata: client mirror validation, the server's error summary, conflicts, sheet recipe (closes after saving). |
| [web/components/kernel/blocks/ListBlock.tsx](../web/components/kernel/blocks/ListBlock.tsx) | Tables and card lists with search, filters, sort and pages, in memory or server-paged. |
| [web/components/kernel/actions/ActionBar.tsx](../web/components/kernel/actions/ActionBar.tsx), [ConfirmAction.tsx](../web/components/kernel/actions/ConfirmAction.tsx), [model.ts](../web/components/kernel/actions/model.ts) | Commands from the contract, shown only if the record's `_can` allows them; confirmations and small input forms; menu dialogs open outside the menu; failed direct commands show a toast. |
| [web/components/kernel/fields/](../web/components/kernel/fields/) | The field registry: a view, input, filter and diff per widget (`registry.tsx`, `views.tsx`, `inputs.tsx`, `validate.ts`, `rich-text/`). |
| [web/components/kernel/Projection.tsx](../web/components/kernel/Projection.tsx), [recipes/recipes.ts](../web/components/kernel/recipes/recipes.ts), [slots/resolve.ts](../web/components/kernel/slots/resolve.ts) | A record projected as a card or row: which field fills which slot (title, media, price figure, badge) from metadata only. |
| [web/components/kernel/blocks/HeaderBlock.tsx](../web/components/kernel/blocks/HeaderBlock.tsx), [DataBlocks.tsx](../web/components/kernel/blocks/DataBlocks.tsx) | Page headers (with `level` for the page `h1`) and detail blocks. |
| [web/components/kernel/nav/AppNav.tsx](../web/components/kernel/nav/AppNav.tsx) | Grouped side navigation and the mobile sheet. |
| [web/components/kernel/blocks/UrlListControls.tsx](../web/components/kernel/blocks/UrlListControls.tsx), [nav/Pagination.tsx](../web/components/kernel/nav/Pagination.tsx) | Controls for a server-rendered list whose state lives in the URL: `UrlFilters` (FiltersBlock, search paused while typing), `UrlSort`, `UrlPageSize` and `UrlPager` (cursor links through `Pagination`, turning pages in place). They only rewrite the address; `MemoryUrl` is a stand-in address for the design-system specimen. |

### 1.6 Primitives and layout
[web/components/ui/](../web/components/ui/) holds the primitives (buttons, inputs, `password-input.tsx`, select, dialogs, menus with link items, stamps, threads, tabs, toasts, `BrandLogo.tsx`); [web/components/layout/](../web/components/layout/) holds `primitives.tsx` (Stack, Split, Grid), `shell.tsx` (AppShell) and `section.tsx` (`PageSection`, the ruled two-column section used by account pages).

### 1.7 The design system page
[web/app/design-system/page.tsx](../web/app/design-system/page.tsx) renders every catalogued component live. The inventory is [web/features/design-system/catalogue.ts](../web/features/design-system/catalogue.ts) (161 rows), the specimens are in [web/features/design-system/specimens/](../web/features/design-system/specimens/), the fixtures in [fixtures.ts](../web/features/design-system/fixtures.ts).

---

## 2. `SM-F-01` Organization accounts

**Backend**
| File | What it is for |
|---|---|
| [backend/apps/accounts/models.py](../backend/apps/accounts/models.py) | `User` (email sign-in, phone, avatar and dark avatar) and `EmailVerification` (hashed code, expiry, tries). |
| [backend/apps/accounts/services.py](../backend/apps/accounts/services.py) | Registration (organization + owner membership + seller profile for sellers), verification codes, invitations (signed tokens), password rules, the session answer (`session_json`) and server-decided navigation (`navigation`). |
| [backend/apps/accounts/views.py](../backend/apps/accounts/views.py) | Endpoints: session, register, sign in/out, verify and resend, profile (validated through the account resource), avatar, password, switch organization, invitations. |
| [backend/apps/accounts/resources.py](../backend/apps/accounts/resources.py) | The `account` model description for the contract (name, email, phone, photo limits); no generated routes. |
| [backend/apps/organizations/models.py](../backend/apps/organizations/models.py) | `Organization` (type, approval state), `Membership` (role, status), `Address` (location as `{lat, lng}`), `ROLES_FOR`, `OWNER_ROLE`. |
| [backend/apps/organizations/tenancy.py](../backend/apps/organizations/tenancy.py) | Which organizations a person acts for, the active one (from the session), and their roles there. |
| [backend/apps/organizations/resources.py](../backend/apps/organizations/resources.py) | Resources for organization (approve/reject/suspend), membership (invite, change role, resend, suspend, reactivate, remove, owner guards, nothing offered on your own row) and address. |
| [backend/apps/media/](../backend/apps/media/) | `FileAsset`, upload checking by file contents (`services.py`), private document downloads (`views.py`). |
| [backend/config/urls.py](../backend/config/urls.py) | Hand-written endpoints plus `registry.urls()`. |

**Web**
| File | What it is for |
|---|---|
| [web/features/auth/AuthForms.tsx](../web/features/auth/AuthForms.tsx) | Sign in (with the clickable demo accounts), register (buyer or seller), verify code, accept invitation. |
| [web/app/(auth)/](../web/app/(auth)/) | The split auth layout and the four routes. |
| [web/features/account/AppFrame.tsx](../web/features/account/AppFrame.tsx) | The signed-in shell: server navigation, organization switcher, notification bell, account menu, redirects. |
| [web/app/(app)/layout.tsx](../web/app/(app)/layout.tsx) | Wraps signed-in pages in the frame. |
| [web/features/account/ProfilePage.tsx](../web/features/account/ProfilePage.tsx) | Photo, name and phone (ProjectedForm on `AccountMeta`), sign-in details, organizations. |
| [web/features/account/SettingsPage.tsx](../web/features/account/SettingsPage.tsx) | Notification switches and language, theme, password change. |
| [web/features/organizations/OrganizationPage.tsx](../web/features/organizations/OrganizationPage.tsx) | Details, team and addresses tabs (URL `?tab=`), all projected from the contract. |

---

## 3. `SM-F-02` Seller onboarding

| File | What it is for |
|---|---|
| [backend/apps/sellers/models.py](../backend/apps/sellers/models.py) | `SellerProfile` (rich-text description, activation status), `SellerDocument`, `SellerStatusChange` (history). |
| [backend/apps/sellers/resources.py](../backend/apps/sellers/resources.py) | Profile commands: submit (needs documents and a description), activate (needs verified, in-date registration and KRA PIN certificates: `activation_blockers`), reject and suspend (reason required); document commands: verify, reject, expire, remove. Notifies the right people. |
| [web/features/sellers/SellerApplication.tsx](../web/features/sellers/SellerApplication.tsx) | The seller's page (`/sell`): progress thread, status notice, profile form with the rich-text editor, documents (upload then create), send for review, history. |
| [web/features/marketplace/AdminPages.tsx](../web/features/marketplace/AdminPages.tsx) | Admin seller list, seller review (wires the review block to the contract commands), buyer approvals. |
| [web/components/commerce/catalog.tsx](../web/components/commerce/catalog.tsx) | `SellerOnboardingReviewBlock`: documents, history, decisions, blockers from the API. |

---

## 4. `SM-F-22` Public product pages

| File | What it is for |
|---|---|
| [backend/apps/catalog/models.py](../backend/apps/catalog/models.py) | `Category` (the stable identity buyers browse), `Product` (merchandising: rich-text description, summary, brand, category details, `primary_image`, `gallery` of at most eight photos, listing window, publish rule). |
| [backend/apps/catalog/resources.py](../backend/apps/catalog/resources.py) | The public `product` resource (published products whose search document is published) and `category` (with its contract summary), and `product_page()`: canonical URL, schema.org JSON-LD with every image, breadcrumbs. A product's headline SKU, pack, price and minimum order are its cheapest active variant's. |
| [web/lib/server/storefront.ts](../web/lib/server/storefront.ts) | Server-side fetchers with `use cache`, `cacheLife` and `cacheTag`: a product page for exactly these list parameters (`productPage`), a product, categories, a comparison. |
| [web/app/(storefront)/](../web/app/(storefront)/) | Layout (header with live categories, footer, the comparison tray), landing, catalogue, category, product and compare routes (metadata, canonical links, Open Graph). |
| [web/features/storefront/Storefront.tsx](../web/features/storefront/Storefront.tsx) | Product grid (stock and compare per cell), the filterable paged `ProductListing`, catalogue and category pages, product detail (gallery, buy box, specifications, buying guide, related products) and the comparison page. |
| [web/features/storefront/StorefrontAccount.tsx](../web/features/storefront/StorefrontAccount.tsx) | Header corner: sign in and calls to action, or the buyer's cart (with its line count) and "Your account". |
| [web/components/commerce/gallery.tsx](../web/components/commerce/gallery.tsx) | `ProductGallery`: the large picture that adapts to the number of photos. |
| [web/features/marketing/Marketing.tsx](../web/features/marketing/Marketing.tsx), [MarketingInteractive.tsx](../web/features/marketing/MarketingInteractive.tsx) | Landing sections: hero doors, category showcase, product rail, statement, value stories, the close (`MarketingCTA`), the woven thread (`TradeRibbon`), header and footer. |

---

## 5. `SM-F-21` Notifications

| File | What it is for |
|---|---|
| [backend/apps/notifications/models.py](../backend/apps/notifications/models.py) | `Notification` (deduplicated per person, channel and event) and `NotificationPreference` (per event and channel, plus language). |
| [backend/apps/notifications/messages.py](../backend/apps/notifications/messages.py) | Every message in English and Kiswahili, role names per language, and the email's button and footer text. |
| [backend/apps/notifications/services.py](../backend/apps/notifications/services.py) | `notify()`: renders in the reader's language, writes one row per enabled channel, sends email after the transaction commits. |
| [backend/apps/notifications/resources.py](../backend/apps/notifications/resources.py), [views.py](../backend/apps/notifications/views.py) | Inbox and preferences resources; bell summary, mark all read, set language. |
| [web/components/commerce/notifications.tsx](../web/components/commerce/notifications.tsx) | Bell, inbox list and preference matrix. |
| [web/features/account/NotificationsPage.tsx](../web/features/account/NotificationsPage.tsx) | The inbox page. |

---

## 6. `SM-F-03` Category contracts

A contract version says what products in a category must state, and everything else is derived from it: seller fields, variant fields, buyer filters, comparison rows, product cards and prices per normalised unit.

| File | What it is for |
|---|---|
| [backend/apps/catalog/contracts.py](../backend/apps/catalog/contracts.py) | **Read this first.** What a contract may declare (`definition_errors`), and what it derives: `field_meta` (contract field metadata for an attribute), `facet_fields` (`attr.<key>` buyer filters), `value_errors`/`clean_values` (product and variant values, field-level messages keyed `attributes.<key>`), `pack_label` ("Bale of 12 × 2 kg"), `normalised_price` (KES per kg), `facet_values` (for search). |
| [backend/apps/catalog/models.py](../backend/apps/catalog/models.py) | `CategoryContract`: version (monotonic per category), status (draft, published, retired), the JSON definitions, rich-text guidance for sellers and buyers, predecessor, publisher. One published and one draft per category at most (database constraints). |
| [backend/apps/catalog/resources.py](../backend/apps/catalog/resources.py) | The `category_contract` resource: public reads of published versions, administrator drafts (`_create_contract`, `_update_contract` refuses published versions), `publish` (retires the previous version, renames the category, rebuilds the category's search documents) and `revise` (copies a published version into a new draft). `contract_summary()` is what storefront and seller forms read. |
| [web/features/categories/CategoryContractBuilder.tsx](../web/features/categories/CategoryContractBuilder.tsx) | The divergent schema editor: attributes with choices and flags, sale units and normalisation, buyer filters, comparison, card attributes, guidance; `draftFromRecord`/`definitionFromDraft` convert to and from the API; previews render through the kernel's field and filter renderers. Read-only for published versions. |
| [web/features/categories/ContractPages.tsx](../web/features/categories/ContractPages.tsx), [web/app/(app)/admin/categories/](../web/app/(app)/admin/categories/) | Administrators' list of versions and the version page (builder, publish and new-draft commands, history). |

---

## 7. `SM-F-04` Catalogue management

| File | What it is for |
|---|---|
| [backend/apps/catalog/models.py](../backend/apps/catalog/models.py) | `Product.clean()` (category details against the contract; drafts may be incomplete, published products must be complete; the publish rule) and `Variant` (SKU unique per seller, the unit the category sells by, units per pack, minimum order, price until price books, reported stock until the inventory ledger, on sale; `stock_state()`). |
| [backend/apps/catalog/resources.py](../backend/apps/catalog/resources.py) | `catalog_product` (a seller's own products, drafts included: create from a name and a published contract, edit, publish, take off sale, archive, restore; `publish_blockers` says what is missing) and `variant` (create and edit within the seller's own products). |
| [web/components/commerce/catalog.tsx](../web/components/commerce/catalog.tsx) | `ProductEditorBlock` (the product's own fields, status, commands, blockers), `CategoryDetailsForm` (one control per contract attribute, seller guidance beside, the API's field messages) and `VariantMatrixEditor` (rows edited in place and saved together, with each row's answer from the API). |
| [web/features/catalog/SellerCatalog.tsx](../web/features/catalog/SellerCatalog.tsx), [web/app/(app)/sell/products/](../web/app/(app)/sell/products/) | The seller's product list (filters, search, rows per page), new product, and the editor. |

---

## 8. `SM-F-08` Search and facets

| File | What it is for |
|---|---|
| [backend/apps/catalog/models.py](../backend/apps/catalog/models.py) | `SearchDocument`: one product as buyers search it (title, body text with summary, description, SKUs and attribute values, facet values, lowest price, stock, the cheapest variant for cards, the published gate). |
| [backend/apps/catalog/search.py](../backend/apps/catalog/search.py), [signals.py](../backend/apps/catalog/signals.py) | `index()` rebuilds a product's document from the database; signals call it whenever a product, a variant, a seller's standing or address changes. |
| [backend/apps/catalog/resources.py](../backend/apps/catalog/resources.py) | `_facet_spec` (accepts `attr.<key>` filters only within one category, from its published contract) and `_facet_counts` (seller, category, stock and attribute counts with every other filter applied, price bounds); `search_paths` read search, price and stock from the document. |
| [web/features/storefront/Storefront.tsx](../web/features/storefront/Storefront.tsx), [web/app/(storefront)/catalogue/](../web/app/(storefront)/catalogue/) | `ProductListing` composes the URL controls with the grid; the catalogue adds category, seller, price and stock filters (and a category's own filters when one is chosen); category pages add their contract's. Products per page: 12, 24, 48 or 96. |

---

## 9. `SM-F-09` Comparison

| File | What it is for |
|---|---|
| [backend/apps/catalog/resources.py](../backend/apps/catalog/resources.py) `comparable()`, [views.py](../backend/apps/catalog/views.py) | `GET compare?products=…`: up to four published products of one category on the contract's comparable attributes, each with its cheapest pack, price per normalised unit, stock and explicit missing values. Nothing is stored. |
| [web/components/commerce/compare.tsx](../web/components/commerce/compare.tsx) | The selection while browsing (`useCompare`, kept in this browser, one category and four products at most: `nextSelection`), `CompareToggle` and `CompareTray`. |
| [web/features/comparison/ProductComparisonBlock.tsx](../web/features/comparison/ProductComparisonBlock.tsx), [web/app/(storefront)/compare/](../web/app/(storefront)/compare/) | The comparison table (sticky labels, gaps stated, lowest price per unit marked, add to cart per column) and its page. |

---

## 10. `SM-F-10` Cart

| File | What it is for |
|---|---|
| [backend/apps/carts/models.py](../backend/apps/carts/models.py) | `Cart` (one active cart per person and buyer organization, a version per change) and `CartLine` (seller copied for grouping, quantity checked against minimum order and stock, the price it was added at). |
| [backend/apps/carts/services.py](../backend/apps/carts/services.py), [resources.py](../backend/apps/carts/resources.py) | Who may buy (`buyer_org`: an approved buyer organization), the cart grouped by seller with today's prices and each line's state (`cart_view`), explicit repricing (`accept_prices`); the `cart` and `cart_line` resources (adding a variant already in the cart raises its line). |
| [web/components/commerce/buy.tsx](../web/components/commerce/buy.tsx) | `BuyBox` and `AddToCart`: every pack with price, price per unit, minimum order and stock; a stepper; add to cart, or why this person cannot buy. |
| [web/components/commerce/cart.tsx](../web/components/commerce/cart.tsx), [web/features/cart/CartPage.tsx](../web/features/cart/CartPage.tsx) | `CartBlock` and `SellerCartGroup` (accept new prices, each price's reason, delivery confirmed by the seller, checkout blocked with its reason, a quote request per seller) and the cart page, which leads to checkout (section 14). |

---

## 11. `SM-F-20` Buyer reorder

| File | What it is for |
|---|---|
| [backend/apps/orders/models.py](../backend/apps/orders/models.py) | `Order` and `OrderLine` as immutable snapshots; how orders are placed and move is section 14. |
| [backend/apps/orders/services.py](../backend/apps/orders/services.py), [resources.py](../backend/apps/orders/resources.py) | `difference()` reads one historical line against today's catalogue (price, stock, minimum order, discontinued); `preview()` and the `reorder` command (sets the current cart aside, copies what can be ordered into a fresh cart at today's prices, returns the ReorderResult). |
| [web/components/commerce/pricing.tsx](../web/components/commerce/pricing.tsx) `ReorderDiffBlock`, [web/features/orders/OrderPages.tsx](../web/features/orders/OrderPages.tsx) | The difference view on the buyer's order page. |

---

## 12. `SM-F-05` Media pipeline

A seller's photograph goes from upload to a public, metadata-free display copy without the API ever decoding pixels.

| File | What it is for |
|---|---|
| [backend/apps/catalog/models.py](../backend/apps/catalog/models.py) | `MediaAsset`: the private original's storage key, type, size and hash (one photograph once per product), measured size, scan and processing status, `derivatives` (display copy and responsive widths), alt text and order; `MEDIA_LIMIT` per product. |
| [backend/apps/catalog/media.py](../backend/apps/catalog/media.py) | **Read this first.** `accept_upload` (type by signature, size, count, duplicates, then queued), `process` (dimensions from the header, too large or too small refused with a reason, `strip_metadata` rewrites the JPEG, PNG or WebP container, the display copy stored, the product reindexed), the bounded pool (`enqueue`), `requeue_stuck`, `remove`, and delivery: `display_url`, signed `original_url`, `image_value`. |
| [backend/apps/catalog/views.py](../backend/apps/catalog/views.py) | `upload_media` (multipart, refused before reading an oversized body), `media_display` (public and cacheable once the product is public, otherwise only the seller), `media_original` (signed link only). |
| [backend/apps/catalog/resources.py](../backend/apps/catalog/resources.py) | The `media_asset` resource (alt text, order, `remove`); `images_of()` makes ready photographs the product's images everywhere (cards, page, JSON-LD) in the seller's order. |
| [backend/apps/catalog/management/commands/process_media.py](../backend/apps/catalog/management/commands/process_media.py) | The production worker: empties the queue in batches, `--once` for schedulers. |
| [web/components/commerce/catalog.tsx](../web/components/commerce/catalog.tsx) `MediaManager`, [web/features/catalog/SellerCatalog.tsx](../web/features/catalog/SellerCatalog.tsx) `ProductMedia` | Upload (one at a time, the contract's `uploads.productImage` rule), checking, ready or rejected with the reason, alt text saved on blur, reorder by buttons, remove through the contract command; the page looks again every few seconds while photographs are being checked (bounded). |

---

## 13. `SM-F-06` Price books

| File | What it is for |
|---|---|
| [backend/apps/catalog/models.py](../backend/apps/catalog/models.py) | `PriceRule` (variant, label, buyer group, minimum quantity, price, priority, dates, on or off) and `BuyerGroupMember` (a seller puts a buyer organization in a named group). |
| [backend/apps/catalog/pricing.py](../backend/apps/catalog/pricing.py) | **Read this first.** `resolve(variant, buyer, quantity, at)` returns a `PriceResolution` (price, rule, reason) by a fixed order (priority, group over everyone, larger minimum, later start, id); `explain()` writes the reason ("Key accounts price from 10 bales until 31 Oct 2026"); `tiers()` is the ladder for a buyer; `state_of()` gives the editor's state and the conflict note. |
| [backend/apps/catalog/resources.py](../backend/apps/catalog/resources.py), [views.py](../backend/apps/catalog/views.py) | The `price_rule` and `buyer_group_member` resources; `GET prices` (a buyer's own price and ladder), `GET catalog/buyers` (trading partners and their groups); product variants carry `tiers`. |
| [backend/apps/carts/models.py](../backend/apps/carts/models.py), [services.py](../backend/apps/carts/services.py), [resources.py](../backend/apps/carts/resources.py) | Cart lines quote the resolved price and keep its rule; a quantity change requotes the line; `accept_prices` takes today's resolved prices. |
| [web/components/commerce/pricing.tsx](../web/components/commerce/pricing.tsx), [web/components/commerce/buy.tsx](../web/components/commerce/buy.tsx) | `PriceBookEditor` (rules by base, group and tier; the list price locked; states; per-rule commands; add a rule) and `PriceTierTable`; `BuyBox` asks `prices` for the chosen quantity and shows the ladder and the reason. |
| [web/features/catalog/SellerCatalog.tsx](../web/features/catalog/SellerCatalog.tsx) `ProductPrices`, [web/features/buyers/BuyersPage.tsx](../web/features/buyers/BuyersPage.tsx) | The price book on the product editor; buyers and price groups for sellers (`/sell/buyers`). |

---

## 14. `SM-F-15` Order lifecycle

Read this before 15 to 18: approval, quotes and delivery all place or move orders through it.

| File | What it is for |
|---|---|
| [backend/apps/orders/models.py](../backend/apps/orders/models.py) | `Order` (statuses including `pending_approval`, the delivery address copied, the quote it came from, the approval policy copied) and `OrderLine` (snapshots with the price's reason); `OrderTransition`, the append-only history. |
| [backend/apps/orders/checkout.py](../backend/apps/orders/checkout.py) | **Placing orders.** `checkout()` locks the cart, checks every line again (on sale, minimum, stock, price), places one order per seller with `place()` and converts the cart; `place()` applies the approval policy, writes lines and the first transition and tells the right people; `next_reference()` numbers orders and quotes. |
| [backend/apps/orders/lifecycle.py](../backend/apps/orders/lifecycle.py) | The transition table (`SELLER_MOVES`, who may cancel or dispute from which state), `side_of()` (is the viewer the buyer or the seller), `move()` and `record()`, `next_actions()`, and `tell()` for notifications. |
| [backend/apps/orders/resources.py](../backend/apps/orders/resources.py) | The `order` resource: input-only command fields, the commands, `_can` narrowed by side and state, sellers' visibility (only orders submitted to them), the detail's lines, history, approval, shipments and reorder preview; the `approval_policy` resource. `apps/carts/resources.py` adds the `checkout` command. |
| [backend/core/operations/registry.py](../backend/core/operations/registry.py) | `Field(input_only=True)` and `action_input()` (command inputs checked like fields), `organization_of` returning both organizations, `after_create`. |
| [web/features/checkout/CheckoutPage.tsx](../web/features/checkout/CheckoutPage.tsx), [web/components/commerce/checkout.tsx](../web/components/commerce/checkout.tsx) | Delivery, review and the placed orders, in `CheckoutSummaryBlock` without a payment step; the API's refusals shown in place. |
| [web/features/orders/OrderPages.tsx](../web/features/orders/OrderPages.tsx), [web/components/commerce/orders.tsx](../web/components/commerce/orders.tsx) | Order lists for buyers (`/orders`) and sellers (`/sell/orders`) and the order page: commands in the header, approval, reorder, delivery, lines with their price reasons, `OrderTimelineBlock`; status labels from the contract. |

---

## 15. `SM-F-12` Purchase approval

| File | What it is for |
|---|---|
| [backend/apps/orders/models.py](../backend/apps/orders/models.py) | `ApprovalPolicy` (threshold, approver roles, approvals needed, on or off) and `ApprovalDecision` (one per approver per order). |
| [backend/apps/orders/approvals.py](../backend/apps/orders/approvals.py) | `can_decide()` (a role in the copied policy, not the person who placed it, not decided yet), `decide()` (a rejection needs a reason and cancels; enough approvals submit the order to the seller), `approval_view()`. |
| [backend/apps/orders/checkout.py](../backend/apps/orders/checkout.py) `applicable_policy`, `place` | The strictest policy the total reaches is copied onto the order; an order nobody else could approve is refused. |
| [web/components/commerce/cart.tsx](../web/components/commerce/cart.tsx) `ApprovalFlowBlock`, [web/features/orders/OrderPages.tsx](../web/features/orders/OrderPages.tsx) `Approval`, [web/features/organizations/OrganizationPage.tsx](../web/features/organizations/OrganizationPage.tsx) `Approvals` | The approval block on the order page; policies on the organization page's Approvals tab; the cart warns when a seller's part will need approval. |

---

## 16. `SM-F-11` Quote request

| File | What it is for |
|---|---|
| [backend/apps/quotes/models.py](../backend/apps/quotes/models.py) | `Quote` (buyer, seller, who asked, where to deliver, notes from both sides, status, validity, version) and `QuoteLine` (snapshot with list and offered price). |
| [backend/apps/quotes/resources.py](../backend/apps/quotes/resources.py) | `_create` takes the buyer's cart lines for one seller (they move into the quote); `respond` (offers per line), `decline`, `accept` (places the order with `place_from_quote`), `decline_offer`, `cancel`; `expire_due()` on read; `_can` by side and state. |
| [backend/apps/quotes/management/commands/expire_quotes.py](../backend/apps/quotes/management/commands/expire_quotes.py) | Expires open quotes for a scheduler. |
| [web/components/commerce/cart.tsx](../web/components/commerce/cart.tsx) `QuoteRequestSheet`, `QuoteDecisionPanel`, [web/features/cart/CartPage.tsx](../web/features/cart/CartPage.tsx) `QuoteRequest`, [web/features/quotes/QuotePages.tsx](../web/features/quotes/QuotePages.tsx) | Ask a seller from the cart (fields from the contract's quote model); quote lists and pages for both sides; the seller's offer panel; accepting goes to the new order. |

---

## 17. `SM-F-19` Seller analytics

| File | What it is for |
|---|---|
| [backend/apps/analytics/models.py](../backend/apps/analytics/models.py), [migrations/0002_metric_definitions.py](../backend/apps/analytics/migrations/0002_metric_definitions.py) | `MetricDefinition`: key, version, aggregation, source, measure, filters, dimensions, unit, which way is better, and the first seven definitions. |
| [backend/apps/analytics/engine.py](../backend/apps/analytics/engine.py) | **Read this first.** The allow-listed sources and filters, `evaluate()` (value, filled daily series or top-ten breakdown, East Africa Time days). |
| [backend/apps/analytics/views.py](../backend/apps/analytics/views.py) | `GET analytics` (with the previous period, none for a metric of the present) and `GET analytics/export` (CSV from the same calls). |
| [web/features/analytics/SellerAnalytics.tsx](../web/features/analytics/SellerAnalytics.tsx), [web/components/commerce/admin.tsx](../web/components/commerce/admin.tsx) `SellerAnalyticsGrid` | Period in the URL, cards coloured by `better`, the daily revenue chart and its table, top products, the export link. |

---

## 18. `SM-F-17` Delivery tracking

| File | What it is for |
|---|---|
| [backend/apps/delivery/models.py](../backend/apps/delivery/models.py) | `Shipment` (carrier, reference, status, window, last event, proof of delivery) and `ShipmentEvent` (type, details, place, when, source, the carrier's event id). |
| [backend/apps/delivery/services.py](../backend/apps/delivery/services.py) | `start()` (from the ship command), `add_event()` (moves the shipment's status), `shipment_view()` (delayed and stale). |
| [backend/apps/delivery/resources.py](../backend/apps/delivery/resources.py) | The `shipment` resource: `add_event` (buyers told of delays, problems and the last mile) and `confirm_delivery` (proof of delivery, the order delivered); both sides may open the proof (`ACCESS_RULES` in `apps/media/services.py`). |
| [web/components/commerce/orders.tsx](../web/components/commerce/orders.tsx) `DeliveryTrackingBlock`, [web/features/orders/OrderPages.tsx](../web/features/orders/OrderPages.tsx) `Shipment` | Each shipment read from its own resource, so its commands are the API's; the proof file is uploaded as a private document before `confirm_delivery`. |

---

## 19. Demo data and photography

| File | What it is for |
|---|---|
| [backend/apps/demo/data.py](../backend/apps/demo/data.py) | Organizations (four approved sellers, and two buyers without logins who trade with Mwangaza), the six people, addresses, sellers, documents, categories, product cut-outs. |
| [backend/apps/demo/products.py](../backend/apps/demo/products.py) | The twelve full product listings (rich text with tables, captioned photos and videos) and their galleries; photographer credits. |
| [backend/apps/demo/catalogue.py](../backend/apps/demo/catalogue.py) | The six category contracts (flour with a retired v1, tea with an open draft) and their guidance, each product's category details and variants, 25 further products with shorter listings, Brian's cart, price rules and buyer groups, the approval policy, Wanjiru's orders (one at each step), the settings for generated Mwangaza history, quotes and photographs. |
| [backend/apps/demo/management/commands/seed_demo.py](../backend/apps/demo/management/commands/seed_demo.py) | `seed_demo [--reset]`: builds everything (contracts, products and variants, price books, the cart, quotes, orders numbered in the order placed with their transitions, shipments and approvals, generated history from a fixed seed, photographs through the real pipeline), attaches portraits, writes notifications. |
| [backend/apps/demo/views.py](../backend/apps/demo/views.py) | The demo-accounts list for the sign-in page (development only). |
| [design/photography/people.py](../design/photography/people.py), [people.json](../design/photography/people.json) | The portrait matting and grading script (light and dark versions) and its settings. |

---

## 20. Brand

[web/lib/brand.ts](../web/lib/brand.ts) registers the logo files (mark, trimmed lockup, compact wordmark, reversed versions) and their minimum sizes; [web/components/ui/BrandLogo.tsx](../web/components/ui/BrandLogo.tsx) renders them with clear space; the files are in [web/public/brand/logo/](../web/public/brand/logo/); the rules in [docs/design/brand-assets.md](design/brand-assets.md).

---

## 21. Settings, routing and tooling

| File | What it is for |
|---|---|
| [backend/config/settings/base.py](../backend/config/settings/base.py), [dev.py](../backend/config/settings/dev.py), [ci.py](../backend/config/settings/ci.py) | Apps (including `carts`, `orders`, `quotes`, `delivery` and `analytics`), database, upload limits (`AC_UPLOADS`, with product photographs), the media pool (`AC_MEDIA`), stale deliveries (`AC_DELIVERY`), Brevo, demo flag, throttling; development Mailpit; tests on the local or CI database, processing photographs at once. |
| [backend/core/policies.py](../backend/core/policies.py), [backend/apps/accounts/services.py](../backend/apps/accounts/services.py) `navigation` | Which roles hold the catalogue, cart, order, quote, approval, fulfilment and analytics permissions, and the navigation entries they open (Orders, Quotes, Products, Buyers and prices, Analytics for sellers; Cart, Orders, Quotes for buyers). |
| [web/next.config.ts](../web/next.config.ts) | The `/api` proxy, Unsplash images, Cache Components, typed routes. |
| [.env.example](../.env.example), [justfile](../justfile), [.claude/launch.json](../.claude/launch.json) | Environment names, one command per task, preview servers. |

---

## 22. Tests

| File | What it covers |
|---|---|
| [backend/tests/test_features.py](../backend/tests/test_features.py) | The four foundation features end to end through the API: registration and verification, sign-in, profile and phone rule, photo checks, organization scoping, invitations and role changes, addresses, seller application and review with blockers, private documents, public products and galleries, notifications in both languages, contract fields, demo gating, navigation. |
| [backend/tests/test_core_crud.py](../backend/tests/test_core_crud.py) | The six Core CRUD features: contract definitions and the draft, publish and revise cycle; product and variant validation with field messages, incomplete drafts, who may publish; search, contract facets with counts, price, seller and stock filters, two-way pages, unpublished products kept out; comparison with normalised prices and gaps; the cart's minimum order, stock, merging, repricing and access rules; reorder differences and a fresh cart with history untouched. |
| [backend/tests/test_integrated.py](../backend/tests/test_integrated.py) | The seven Integrated features: photographs checked, stripped, refused and served by visibility; price resolution, reasons, tiers, a buyer's own price and conflicts; checkout per seller, repeat submits, the lifecycle's guards, delivery events, delays and proof; approvals; quotes from cart lines to order, and expiry; analytics values, series, export and permissions; the demo seed telling each story, and reseeding. |
| [backend/tests/test_listing.py](../backend/tests/test_listing.py), [test_contract.py](../backend/tests/test_contract.py), [test_policies.py](../backend/tests/test_policies.py), [test_richtext.py](../backend/tests/test_richtext.py) | List grammar, contract drift and compatibility, policies, sanitising. |
| [web/tests/unit/](../web/tests/unit/) | Query engine, server lists, field registry coverage, rich text, tokens and contrast, copy rules, brand sizes; `core-crud.test.ts`: comparison selection rules, URL to API parameters with contract facets, contract draft round trip; `integrated.test.ts`: order labels from the contract, metric cards and their comparisons. |

---

## 23. Traces to follow with the code open

1. **Sign in with a demo account.** `AuthForms.tsx` `SignIn` → `useSessionWrite('auth/login')` in `session.ts` → `api()` in `api.ts` → Next rewrite → `sign_in` in `accounts/views.py` → `session_json()` in `accounts/services.py` → the session lands in the query cache → `homeFor()` picks the first page → `AppFrame.tsx` builds the navigation from `session.nav`.
2. **Send a seller application for review.** `SellerApplication.tsx` `Submit` → `ActionBar` shows `submit` because the record's `_can` lists it → `useCommand(SellerProfileMeta).run` → `POST seller-profiles/<id>/submit` → `Resource.action_view` in `registry.py` → `_submit` in `sellers/resources.py` (checks, history, `notify()` to admins) → the record and notifications refresh.
3. **Approve a seller.** `AdminPages.tsx` `AdminSellerReview` → `SellerOnboardingReviewBlock` (approve disabled while `activation_blockers` is not empty) → verify each document (`seller-documents/<id>/verify`) → `activate` → `_decide` → the managers get a notification in their language (`notifications/messages.py`).
4. **Render a product page.** `app/(storefront)/products/[slug]/page.tsx` → `product(slug)` in `lib/server/storefront.ts` (cached) → `GET products/<slug>` → `Resource.item_view` (public, by slug) → `_product_detail_extra` adds variants, specifications and the contract's buyer guidance; `product_page()` adds JSON-LD → `ProductDetail` in `Storefront.tsx` → `ProductGallery`, `BuyBox`, `RichTextView`.
5. **Filter a category.** Pick "Maize" under Grain → `UrlFilters` in `UrlListControls.tsx` → `toListParams` writes `attr.grain__in=maize` to the URL → `app/(storefront)/catalogue/[slug]/page.tsx` → `apiListParams` adds `category__eq` → `productPage()` → `Resource.collection_view` → `_facet_spec` widens the list spec from the category's contract → `run_list` filters through the search document (`_contains_any`) and `_facet_counts` counts every other choice → the page renders the grid, the counts and `UrlPager`'s cursor links.
6. **Publish a category contract.** `ContractPages.tsx` → the builder saves with `definitionFromDraft` (`PATCH category-contracts/<id>`, checked by `definition_errors`) → `publish` → `_publish_contract` retires the old version, renames the category and rebuilds its search documents → seller forms (`contract_summary`), buyer filters (`facet_fields`) and comparison rows follow with no page code.
7. **Add to the cart, then reorder.** `AddToCart` in `buy.tsx` → `POST cart-lines` → `_add` (opens or finds the cart, merges a repeated variant) → `CartLine.clean()` checks minimum order, stock and that the product is on sale → `CartPage.tsx` reads `cart_view` → later `OrderPages.tsx` → `POST orders/<id>/reorder` → `reorder()` in `orders/services.py` sets the cart aside and copies today's terms.
8. **Add a field to a model.** Model field and migration → `derive()` it into the resource → `contract export` (version bump enforced) → `pnpm contract:gen` → forms and lists that use the `*Meta` pick it up with no page code.
9. **Check out, approve, ship.** `CheckoutPage.tsx` → `POST carts/<id>/checkout` → `_checkout` in `carts/resources.py` → `checkout()` in `orders/checkout.py` locks the cart and checks each line → `place()` copies the approval policy, so Brian's order waits as `pending_approval` and Grace is told → Grace's order page shows `ApprovalFlowBlock` because `approval.can_decide` → `POST orders/<id>/approve` → `decide()` submits it and notifies Mwangaza → Faith's `/sell/orders` now lists it (it has a `submitted` transition) → `confirm`, `start_picking`, then `ship` with a carrier opens a shipment (`delivery.start`) → Peter's `add_event` and `confirm_delivery` on the order page (`Shipment` in `OrderPages.tsx`) move it to delivered.
10. **Explain a price.** `BuyBox` in `buy.tsx` → `GET prices?variant=…&quantity=…` → `prices` in `catalog/views.py` → `resolve()` in `catalog/pricing.py` picks one rule by the fixed order and `explain()` writes its reason → `PriceTierTable` marks "Your price" → the same `resolve()` quotes the cart line, checks it again at checkout and copies the reason onto the order line.
11. **Upload a photograph.** `MediaManager` → `POST catalog/products/<id>/media` → `accept_upload()` stores the original privately and queues it → after commit `enqueue()` hands it to the pool → `process()` measures, refuses or strips it and stores the display copy → the editor's polling sees `ready` → `images_of()` makes it the product's picture, served by `GET media/<id>`.
