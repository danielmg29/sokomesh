// The inventory the /design-system ledger renders: every foundation, primitive, field renderer,
// kernel component, block, project extension, divergent component and page template in the
// SokoMesh Feature Build Order and Field Specification v1.1 (pp. 51–58).

export type EntryClass = 'Foundation' | 'Primitive' | 'Field' | 'Kernel' | 'Block' | 'Extension' | 'Divergent' | 'Marketing' | 'Template'
export type Mode = 'MARKET' | 'LEDGER' | 'FLOW'
export type SpecimenModule = 'foundations' | 'primitives' | 'fields' | 'kernel' | 'blocks' | 'commerce' | 'divergent' | 'templates'

export type Entry = {
  code: string
  name: string
  cls: EntryClass
  /** Spec classification where it is more precise than the class (configured, kernel extension). */
  sub?: string
  phase: string
  modes: readonly Mode[]
  states: readonly string[]
  usedIn: string
  summary: string
  /** What drives it: contract metadata, tokens, or the field specification. */
  source?: string
  module: SpecimenModule
}

const ALL: Mode[] = ['MARKET', 'LEDGER', 'FLOW']
const M: Mode[] = ['MARKET']
const L: Mode[] = ['LEDGER']
const F: Mode[] = ['FLOW']
const ML: Mode[] = ['MARKET', 'LEDGER']
const LF: Mode[] = ['LEDGER', 'FLOW']
const MF: Mode[] = ['MARKET', 'FLOW']

const foundation = (code: string, name: string, summary: string, states: string[], source: string): Entry =>
  ({ code, name, cls: 'Foundation', phase: '01', modes: ALL, states, usedIn: 'Everything', summary, source, module: 'foundations' })
const primitive = (code: string, name: string, summary: string, states: string[], usedIn: string, modes: Mode[] = ALL): Entry =>
  ({ code, name, cls: 'Primitive', phase: '02', modes, states, usedIn, summary, source: 'Tokens; Radix where behaviour is complex', module: 'primitives' })
const field = (code: string, widget: string, states: string[], usedIn: string, contexts: string, modes: Mode[] = ALL): Entry =>
  ({ code, name: `Field/${widget}`, cls: 'Field', phase: '03', modes, states, usedIn, summary: `Renders the contract widget "${widget}" in ${contexts}. Knows the widget, never the business field.`, source: `field.widget = "${widget}"`, module: 'fields' })
const kernel = (code: string, name: string, phase: string, summary: string, states: string[], usedIn: string, source?: string, modes: Mode[] = ALL): Entry =>
  ({ code, name, cls: 'Kernel', phase, modes, states, usedIn, summary, source, module: 'kernel' })
const block = (code: string, name: string, summary: string, states: string[], usedIn: string, modes: Mode[] = ALL, sub?: string): Entry =>
  ({ code, name, cls: 'Block', sub, phase: '06', modes, states, usedIn, summary, source: 'Page definition + model metadata', module: 'blocks' })
const ext = (code: string, name: string, sub: string, summary: string, states: string[], usedIn: string, modes: Mode[], req: string): Entry =>
  ({ code, name, cls: 'Extension', sub, phase: '08', modes, states, usedIn, summary, source: req, module: 'commerce' })
const mktg = (code: string, name: string, summary: string, states: string[]): Entry =>
  ({ code, name, cls: 'Marketing', sub: 'Divergent', phase: '09', modes: M, states, usedIn: 'Landing, public storefront', summary, source: 'Hand-written; tokens and primitives only', module: 'divergent' })
const template = (code: string, name: string, chain: string, modes: Mode[]): Entry =>
  ({ code, name, cls: 'Template', phase: '07', modes, states: ['ordered block data'], usedIn: name, summary: chain, source: 'Page definition (BlockSpec[])', module: 'templates' })

export const catalogue: Entry[] = [
  foundation('T-01', 'Colour roles', 'Semantic colour tokens aliasing the brand primitives, with measured contrast for every pairing.', ['light', 'dark'], 'design/tokens/color.light.json, color.dark.json'),
  foundation('T-02', 'Tones and marks', 'Six tones for state. Each carries a drawn mark, so state never depends on hue. Signal amber is a trade signal, not a warning.', ['neutral', 'info', 'success', 'warning', 'danger', 'signal'], 'Tone axis'),
  foundation('T-03', 'Typography', 'Plus Jakarta Sans for headings, Inter for interface text, a 10-step scale from 12 px.', ['display', 'heading', 'body', 'caption'], 'design/tokens/type.json'),
  foundation('T-04', 'Money, quantity and time', 'KES with two decimals from decimal strings, quantities with their unit, times in EAT.', ['positive', 'negative', 'empty'], 'lib/money.ts · lib/format.ts'),
  foundation('T-05', 'Spacing and density', 'A 4 px unit and three densities that resize controls and rows together.', ['compact', 'comfortable', 'spacious'], 'design/tokens/density.*.json'),
  foundation('T-06', 'Radii and surfaces', 'Rectangles first: 2 px stamps, 4 px controls, 8 px panels. Borders carry structure; only overlays lift.', ['flat', 'bordered', 'raised', 'inset'], 'design/tokens/shape.json'),
  foundation('T-07', 'Motion grammar', 'Six meanings (reveal, bind, transfer, reflow, stamp, thread) between 120 and 340 ms, no bounce, reduced-motion safe.', ['reveal', 'bind', 'transfer', 'reflow', 'stamp', 'thread'], 'design/tokens/motion.json'),
  foundation('T-08', 'Icons', 'One outline set with square caps and mitred joins, echoing the faceted mark.', ['decorative', 'labelled'], 'lucide-react via ui/icon'),
  foundation('T-09', 'Focus and browser surfaces', 'Two-tone focus, signal-amber selection, themed scrollbars, caret and tabular numerals.', ['focus-visible', 'selection'], 'app/globals.css'),
  foundation('T-10', 'Brand assets', 'Mark and lockup at or above their minimum size, wrapped in quarter-mark clear space.', ['mark', 'lockup', 'favicons'], 'lib/brand.ts · ASSET_USAGE'),
  foundation('T-11', 'Layout primitives', 'Stack, Cluster, Split, Grid, DensityRegion, AppShell and PageSection (a ruled ledger section: title and purpose left, controls right). Only these declare container queries.', ['stacked', 'split', '1 to 4 columns', 'ledger section'], 'components/layout'),

  primitive('P-01', 'Button / IconButton', 'Commands. Icon-only buttons must name their action.', ['default', 'hover', 'focus', 'active', 'disabled', 'loading'], 'Actions, forms, navigation'),
  primitive('P-02', 'Input / Textarea / PasswordInput', 'Text entry with prefix and suffix, character counts and over-limit state; passwords with a show and hide control.', ['default', 'focus', 'error', 'disabled', 'read-only', 'over-limit', 'password hidden', 'password shown'], 'Text field renderers, sign-in, password change'),
  primitive('P-03', 'Select / Combobox / MultiSelect', 'Finite and searchable choices, including server search and a bounded maximum.', ['empty', 'selected', 'searching', 'no-results', 'max-reached', 'disabled'], 'Choice and relation fields, filters'),
  primitive('P-04', 'Checkbox / Switch / Radio', 'Binary and single choices; checkboxes support indeterminate selection.', ['on', 'off', 'indeterminate', 'disabled'], 'Boolean fields, bulk selection'),
  primitive('P-05', 'Badge / Avatar / Kbd', 'Counts, people and organizations, keyboard hints. Avatars take a second photograph prepared for the dark theme.', ['quiet', 'strong', 'signal', 'initials', 'photo', 'dark-theme photo', 'xl'], 'Navigation, account menu, profile, demo accounts'),
  primitive('P-06', 'Dialog / AlertDialog / Sheet / Drawer', 'Protected focus for confirmations; sheets for side work and narrow filters.', ['closed', 'open', 'pending'], 'ConfirmAction, editors, filters'),
  primitive('P-07', 'Tabs / Accordion / Collapsible', 'Progressive disclosure for dense detail and builders.', ['active', 'inactive', 'open', 'closed'], 'Admin builders, detail regions'),
  primitive('P-08', 'Popover / DropdownMenu / Tooltip', 'Floating help and menus; keyboard-first. Menu items can be links.', ['closed', 'open', 'disabled item', 'link item'], 'ActionMenu, account menu, filters, help'),
  primitive('P-09', 'Command', 'Filterable list for palettes and large pickers.', ['idle', 'searching', 'no-results'], 'CommandPalette, relation search'),
  primitive('P-10', 'Calendar / DatePicker', 'Nairobi time, weeks from Monday, disabled past dates.', ['empty', 'selected', 'disabled dates'], 'Date and datetime fields'),
  primitive('P-11', 'Table / ScrollArea / Separator', 'Bordered tables that read density tokens and scroll sideways with a visible bar; composed with P-19 every table searches, filters and pages live.', ['default', 'hover', 'selected', 'sticky head', 'searched', 'filtered', 'paged'], 'ListBlock, ledgers, comparison', LF),
  primitive('P-12', 'Skeleton / Progress / Toast', 'Loading placeholders, determinate and indeterminate progress, a bounded toast queue.', ['loading', 'progress', 'info', 'success', 'warning', 'danger'], 'LoadingState, uploads, feedback'),
  primitive('P-13', 'Form label / help / error', 'Label, help and error wired with aria-describedby for every control.', ['default', 'required', 'help', 'error'], 'Every FieldInput'),
  primitive('P-14', 'Stamp', 'The visual form of an authoritative state: label always visible, mark always present.', ['6 tones', 'stamp', 'dot', 'fresh'], 'StatusBadge, commerce states'),
  primitive('P-15', 'Thread', 'A process drawn as connected states; the connector pattern shows certainty.', ['done', 'current', 'upcoming', 'failed', 'stale'], 'Checkout, approvals, delivery, cases'),
  primitive('P-16', 'Segmented / RangeSlider', 'View switches and two-thumb ranges; the slider applies its range when released.', ['selected', 'range', 'dragging'], 'Mode switches, the catalogue price filter'),
  primitive('P-17', 'ColumnChart', 'Single-series columns with a table view, keyboard reading and the peak labelled; the table view searches, filters by the mean and pages.', ['chart', 'table', 'focused column', 'table searched', 'above or below average'], 'Seller analytics', L),
  primitive('P-19', 'TableSearch / FacetChips / TablePager', 'The controls every table shares over one query engine (lib/query.ts): word search ignoring case and accents, facet chips with live counts, numbered pages up to the contract’s maximum page size.', ['typed', 'facet on', 'zero count', 'first page', 'middle page', 'last page', 'filtered', 'no matches', 'narrow'], 'Every table', LF),
  primitive('P-18', 'ThemeSwitch', 'Light, dark or follow the system; the choice is applied before first paint and shared across tabs.', ['system', 'light', 'dark', 'on surface', 'on chrome', 'icon only'], 'Mastheads, footers, account menus'),

  field('F-01', 'text', ['default', 'focus', 'error', 'disabled', 'read-only', 'truncated'], 'Names, references, pack sizes', 'view, input, filter and diff'),
  field('F-02', 'textarea', ['default', 'error', 'over-limit', 'disabled'], 'Notes, reasons, explanations', 'view, input and diff; plain text only'),
  field('F-03', 'richtext', ['compact', 'full', 'focus', 'over-limit', 'every content type', 'narrow toolbar'], 'The four WYSIWYG fields only', 'view, a document editor (links, images, video, tables) and diff, with a plain-text projection and the contract allow-list', ML),
  field('F-04', 'currency', ['default', 'negative', 'error', 'range filter'], 'Prices, totals, payments', 'view, input, range filter and diff'),
  field('F-05', 'quantity', ['stepper', 'below MOQ', 'over stock', 'off-step'], 'MOQ, cart, pick quantities', 'view, stepper input, range filter and diff'),
  field('F-06', 'integer', ['default', 'min/max error', 'disabled'], 'Counts, terms, thresholds', 'view, input, filter and diff'),
  field('F-07', 'decimal', ['default', 'precision error'], 'Weights, dimensions', 'view, input, filter and diff'),
  field('F-08', 'unit', ['selected', 'searchable', 'invalid combination'], 'Packaging, comparison units', 'view, input, filter and diff'),
  field('F-09', 'select', ['empty', 'selected', 'disabled', 'invalid'], 'Account type, decisions, categories', 'view, input, filter and diff'),
  field('F-10', 'status', ['tone', 'label always visible', 'command-only'], 'Every lifecycle state', 'view, filter and diff'),
  field('F-11', 'multiselect', ['empty', 'selected', 'searching', 'max-selected'], 'Regions, buyer groups', 'view, input, filter and diff'),
  field('F-12', 'relation', ['empty', 'selected', 'searching', 'unavailable'], 'Seller, buyer, product references', 'view, search input, filter and diff'),
  field('F-13', 'boolean', ['on', 'off', 'indeterminate'], 'Flags, permissions, settings', 'view, input, filter and diff'),
  field('F-14', 'date', ['empty', 'selected', 'invalid'], 'Effective dates, restock dates', 'view, picker, range filter and diff'),
  field('F-15', 'datetime', ['timezone-aware', 'empty', 'invalid'], 'Price windows, expiries, events', 'view, input, range filter and diff'),
  field('F-16', 'relative-time', ['relative label', 'absolute for assistive tech'], 'Feeds, audit, recent orders', 'view only'),
  field('F-17', 'image', ['empty', 'uploading', 'processing', 'ready', 'rejected'], 'Product images, proof of delivery', 'thumb, cover and gallery views, and an uploader', MF),
  field('F-18', 'file', ['empty', 'uploading', 'scanning', 'ready', 'restricted', 'error'], 'Seller documents, evidence', 'view and uploader'),
  field('F-19', 'email', ['valid', 'invalid', 'disabled'], 'Contacts, notification targets', 'view, input and filter'),
  field('F-20', 'phone', ['valid', 'invalid', 'disabled'], 'Contacts, M-Pesa numbers', 'view, input and filter'),
  field('F-21', 'url', ['valid', 'invalid', 'copyable'], 'Webhook callbacks, links', 'view and input', L),
  field('F-22', 'code', ['copyable', 'read-only', 'invalid'], 'SKU, order and transaction references', 'view, input and diff'),
  field('F-23', 'address', ['manual entry', 'incomplete', 'validated'], 'Delivery and seller addresses', 'view, input, county filter and diff'),
  field('F-24', 'location', ['unset', 'searching', 'selected', 'geocode-error'], 'Seller, warehouse, delivery points', 'view, place search and distance filter'),
  field('F-25', 'secret', ['empty', 'set', 'revealed once', 'rotating', 'error'], 'Integration tokens, webhook secrets', 'masked view and rotate-only input', L),
  field('F-26', 'json', ['formatted', 'collapsed', 'invalid', 'read-only'], 'Admin metadata only', 'view, restricted input and diff', L),

  kernel('K-01', 'Recipes and slots', '04', 'The four axes (intent, density, tone, surface) and the semantic slots every projection fills from metadata.', ['10 intents', '3 densities', '6 tones', '4 surfaces'], 'Every projected component', 'recipes.ts · slots/resolve.ts'),
  kernel('K-02', 'Projection', '04', 'One record rendered in any context from metadata alone: row, card, media, detail, relation, audit or stat.', ['list', 'detail', 'picker', 'dashboard'], 'Products, orders, organizations, every record', 'ModelMeta + record + context'),
  kernel('K-03', 'FieldView / FieldInput / FieldFilter / FieldDiff', '03', 'Dispatchers that pick the widget renderer and wire labels, help, errors, restriction and typed filter operators.', ['view', 'input', 'filter', 'diff', 'restricted'], 'Forms, tables, filters, conflicts', 'field.widget, field.filter, fieldPolicy'),
  kernel('K-04', 'ProjectedForm', '06', 'Create, edit, command and registration forms from field metadata, in inline, sheet, stepper or auth recipes.', ['editing', 'submitting', 'invalid', 'saved', 'error', 'conflict'], 'Organization setup, products, quotes, checkout inputs', 'fields, groups, weight, write schema'),
  kernel('K-05', 'ActionBar', '05', 'Buttons for a record’s permitted commands. Tone, icon, confirm and input come from action metadata.', ['default', 'pending', 'disabled with reason', 'restricted'], 'Publish, add to cart, confirm line, ship', 'actions, _can, when'),
  kernel('K-06', 'ActionMenu', '05', 'Overflow of permitted commands for dense rows and compact cards. Keyboard-first.', ['inline', 'overflow', 'no permitted actions'], 'Catalogue, order and inventory tables', 'actions, _can, when', LF),
  kernel('K-07', 'BulkActions', '05', 'Bounded selection with impact preview, progress and partial-failure reporting.', ['hidden', 'active', 'executing', 'complete', 'error', 'over limit'], 'Seller products: publish, take off sale, archive, restore', 'limits.maxBulk · actions · _can', L),
  kernel('K-08', 'ConfirmAction', '05', 'Confirm-only or command-input dialogs, standard or destructive, with server errors kept in place.', ['standard', 'destructive', 'command input', 'pending', 'error'], 'Seller activation, order cancel, adjustments', 'actions[].confirm · actions[].input'),
  kernel('K-09', 'StatusBadge', '05', 'Contract choice label and tone as a stamp or dot. Unknown values render neutral rather than vanish.', ['6 tones', 'stamp', 'dot', 'unknown value'], 'Every status field', 'choices[].tone · choices[].mark'),
  kernel('K-10', 'AppNav', '05', 'Navigation derived from models and the viewer’s role; expanded, collapsed or in a mobile sheet.', ['expanded', 'collapsed', 'mobile sheet', 'grouped', 'flat'], 'Buyer, seller, warehouse and admin shells', 'models · policies', LF),
  kernel('K-11', 'Breadcrumbs', '05', 'Route and record labels from metadata; full, compact back-link or collapsed middle.', ['full', 'compact', 'collapsed'], 'Storefront and every list or detail route', 'labelPlural · displayField'),
  kernel('K-12', 'CommandPalette', '05', 'Ctrl K navigation and permitted collection actions, fully keyboard-operable.', ['closed', 'open', 'searching', 'no results'], 'Every shell', 'models, collection actions, policies'),
  kernel('K-13', 'EmptyState', '05', 'No data, no results, nothing related, not configured; with an optional permitted next step.', ['no-data', 'no-results', 'no-related', 'no-config'], 'Lists, carts, analytics', 'Labels · permitted actions'),
  kernel('K-14', 'ErrorState', '05', 'Error presentations keyed by contract error code, with retry, compare or countdown where they apply.', ['retryable', 'non-retryable', 'conflict', 'permission', 'rate-limit', 'offline', 'unavailable'], 'Every data block', 'errors[code]'),
  kernel('K-15', 'LoadingState', '05', 'Skeletons that reserve the final layout, inline progress and determinate progress.', ['list', 'cards', 'detail', 'stat', 'inline', 'progress'], 'Feeds, checkout, analytics'),
  kernel('K-16', 'ToastFeedback', '05', 'Transient outcomes named by their action; errors persist and offer retry when the contract says it is safe.', ['info', 'success', 'warning', 'danger', 'with action'], 'Saves, cart, checkout, fulfilment', 'errors[code] · action labels'),
  kernel('K-17', 'PageBlocks', '07', 'Renders an ordered page definition of registered blocks; divergent blocks join by registration.', ['list', 'detail', 'dashboard', 'unknown block'], 'Every page', 'BlockSpec[] data'),
  kernel('K-19', 'SortSelect', '05', 'Sort by over the contract’s allow-listed ordering; each label comes from the field’s label and type.', ['default', 'changed', 'no ordering'], 'Category and search results', 'meta.ordering', M),
  kernel('K-20', 'URL list controls', '05', 'UrlFilters, UrlSort, UrlPageSize and UrlPager: a server-rendered list whose search, filters (a category contract’s facets included), sort, page size and page live in the URL as the contract’s list grammar, so the URL is the API query; they rewrite the address and never fetch.', ['filters', 'search (paused)', 'sort', 'page size', 'previous and next', 'first page', 'stand-in URL'], 'Catalogue, category and search results', 'listQuery · meta.fields[].filter · meta.ordering', M),
  kernel('K-18', 'Pagination', '05', 'Cursor pager for crawlable lists: previous and next are links carrying the cursor, with the range shown; with onNavigate a click turns a live listing in place while the link keeps its address. In-app tables use TablePager; URL lists reach it through UrlPager (K-20).', ['first page', 'middle page', 'last page', 'total not counted', 'turns in place'], 'Category and search results', 'list.defaultPageSize · cursor in the URL', M),

  block('B-01', 'HeaderBlock', 'Page and record headers from metadata, a record, or an explicit title, with status and actions.', ['standard', 'compact', 'with status', 'with actions'], 'Every list and detail page'),
  block('B-02', 'FiltersBlock', 'Search plus typed filters for every field that declares filter operators; chips for active filters.', ['expanded', 'collapsed', 'mobile sheet', 'active', 'cleared'], 'Search, catalogue, orders, audit'),
  block('B-03', 'ListBlock', 'Tables or card grids with selection and three narrow strategies. Tables search `meta.search`, filter every field that declares operators, sort over `meta.ordering` and page, live over the records given; `query="server"` sends the same controls as contract list parameters and pages by the server’s cursors; `controls` lets a page drive it from its own bar.', ['loading', 'empty', 'error', 'stale', 'live', 'selected', 'searched', 'filtered', 'sorted', 'server', 'server loading', 'server error', 'page controls', 'paged', 'no match', 'scroll', 'collapse', 'priority'], 'Search results, catalogue, orders, ledgers'),
  block('B-04', 'DetailBlock', 'Record detail through the detail recipe; full page, sheet or container-adaptive.', ['flat', 'bordered', 'raised', 'inset', 'loading'], 'Product, order, quote, case detail'),
  block('B-05', 'StatsBlock', 'A metric strip divided into cells, with comparisons and tone by metric state.', ['comfortable', 'spacious', 'loading', 'empty', 'error'], 'Home (what needs you), seller analytics', L),
  block('B-06', 'ActivityBlock', 'Event timeline with type filtering; the thread pattern shows confirmed, awaiting or stale events.', ['compact', 'comfortable', 'filtered', 'empty', 'loading'], 'Order, ledger, payment, delivery history', LF),
  block('B-07', 'RelatedBlock', 'Records related to the current one, or the first few of a to-do list, as rows or cards that open their record, with the total and a view-all link.', ['row', 'card', 'empty', 'loading', 'linked rows'], 'Home (orders, pick lists, quotes, reviews)'),
  block('B-08', 'SplitBlock', 'Main and aside from a page definition; stacks below its container threshold.', ['sidebar', 'wide aside', 'half', 'media first'], 'Product buy box, order detail', ALL, 'Layout block'),
  block('B-09', 'GridBlock', 'One to four container-adaptive columns of child blocks.', ['1', '2', '3', '4 columns'], 'Dashboards, overviews', ALL, 'Layout block'),
  block('B-10', 'ChatBlock', 'Quote and dispute conversations, with internal notes visible only by policy.', ['compact', 'comfortable', 'internal note', 'empty', 'loading', 'error'], 'Quote negotiation, disputes', ML),

  ext('X-01', 'SellerOnboardingReviewBlock', 'Kernel extension', 'Admin review of seller identity, documents and activation history, with a decision sheet.', ['under review', 'active', 'rejected', 'suspended', 'summary', 'full'], 'Marketplace admin', L, 'SM-F-02'),
  ext('X-02', 'ProductEditorBlock', 'Configured ProjectedForm', 'A seller’s product: its own fields, status and commands, what still blocks publishing, and its category details generated from the contract below the form (CategoryDetailsForm).', ['create', 'edit', 'inline', 'stepper', 'draft', 'publish blocked', 'published'], 'Catalogue management', L, 'SM-F-04'),
  ext('X-03', 'VariantMatrixEditor', 'Kernel extension', 'Each sellable pack: SKU, per-variant attributes, unit the category sells by, units per pack, minimum order and price, edited in place and saved together with the API’s answer per row; packs available shown from the stock ledger and never edited here; duplicates and invalid values flagged inline; bulk fill; search and facets.', ['table', 'cards', 'valid', 'invalid', 'changed', 'new row', 'server error', 'bulk fill', 'stock read-only', 'not tracked', 'searched', 'filtered', 'paged', 'empty'], 'Catalogue management', L, 'SM-F-04'),
  ext('X-04', 'MediaManager', 'Kernel extension', 'Product media with derivative status, required alt text and keyboard reordering.', ['grid', 'list', 'uploading', 'processing', 'ready', 'rejected', 'empty', 'removable'], 'Catalogue management', L, 'SM-F-05'),
  ext('X-05', 'PriceBookEditor', 'Kernel extension', 'Base, buyer-group and quantity-tier rules, with overlapping rules flagged as conflicts.', ['view', 'edit', 'active', 'future', 'expired', 'off', 'conflict', 'locked list price'], 'Seller price books', L, 'SM-F-06'),
  ext('X-06', 'PriceTierTable', 'Configured list projection', 'Quantity tiers with the buyer’s active tier marked and repricing shown as a diff.', ['compact', 'comfortable', 'active tier', 'repriced'], 'Product detail, cart, quotes', ML, 'SM-F-06'),
  ext('X-07', 'InventoryLedgerBlock', 'Configured Activity/ListBlock', 'Immutable stock movements: the change in available stock and what is available and on hand after each, so every number is derivable from the rows alone. Search by reference, person or reason; movement chips with live counts; pages.', ['receipt', 'reservation', 'release', 'allocation', 'adjustment', 'shipment', 'return', 'no change in available', 'searched', 'filtered', 'paged', 'no match'], 'Stock, reconciliation', L, 'SM-F-07'),
  ext('X-08', 'StockAvailabilityIndicator', 'Kernel extension', 'Availability from the ledger in compact or explained form.', ['available', 'low', 'reserved', 'out-of-stock', 'unknown'], 'Cards, cart, checkout, catalogue', ALL, 'SM-F-07'),
  ext('X-09', 'FacetFilterPanel', 'Configured FiltersBlock', 'Storefront filters derived from the active category contract, with live facet counts and a price slider over the current results; read from and written to the URL, or controlled by a listing held in memory.', ['sidebar', 'mobile sheet', 'active', 'cleared', 'price range', 'controlled'], 'Catalogue and category pages', M, 'SM-F-08'),
  ext('X-10', 'CartBlock', 'Kernel extension', 'Server-backed mixed-seller cart; repricing is explicit (accept the new prices), delivery is quoted at checkout when not yet priced, and a blocked checkout explains why.', ['valid', 'repricing', 'accept new prices', 'out-of-stock', 'approval-needed', 'checkout blocked', 'submitting'], 'Buyer cart', MF, 'SM-F-10'),
  ext('X-11', 'SellerCartGroup', 'Configured child of CartBlock', 'One seller’s lines, validated seller by seller, with minimum-order warnings.', ['expanded', 'collapsed', 'valid', 'changed', 'unavailable'], 'Mixed-seller carts', MF, 'SM-F-10'),
  ext('X-12', 'QuoteRequestSheet', 'Kernel extension', 'Buyer quote request from selected lines, with its status thread.', ['create', 'revise', 'view', 'requested', 'responded', 'accepted', 'declined', 'expired'], 'Cart and product detail', M, 'SM-F-11'),
  ext('X-13', 'QuoteDecisionPanel', 'Kernel extension', 'Seller accept, counter or decline; an accepted quote becomes an immutable snapshot.', ['respond', 'counter', 'accepted snapshot'], 'Seller quotes', L, 'SM-F-11'),
  ext('X-14', 'ApprovalFlowBlock', 'Kernel extension', 'Purchase approval by threshold and approver level; the API also refuses skipped approvals.', ['not-required', 'pending', 'approved', 'rejected'], 'Buyer approvals', LF, 'SM-F-12'),
  ext('X-15', 'ReservationIndicator', 'Kernel extension', 'A bounded stock hold, saying what happened to the units in every state.', ['active', 'expiring', 'expired', 'consumed', 'released'], 'Checkout, cart, support', F, 'SM-F-13'),
  ext('X-16', 'ReservationCountdown', 'Kernel extension', 'Time left on a reservation, announced at thresholds only, frozen while payment settles.', ['running', 'paused', 'expired', 'reduced motion'], 'Checkout', F, 'SM-F-13'),
  ext('X-17', 'CheckoutSummaryBlock', 'Kernel extension', 'Checkout steps with a per-seller summary and the reason it is blocked.', ['address', 'review', 'payment', 'result', 'valid', 'blocked', 'submitting', 'no payment step'], 'Buyer checkout', F, 'SM-F-15'),
  ext('X-18', 'PaymentStatusPanel', 'Kernel extension', 'An M-Pesa STK push from prompt to confirmation, with honest delay, failure and refund states; the provider and the masked number are the API’s.', ['created', 'sending', 'pending', 'confirmed', 'failed', 'cancelled', 'reconciled', 'stale', 'refunded'], 'Checkout result, order detail', F, 'SM-F-14'),
  ext('X-19', 'OrderTimelineBlock', 'Configured ActivityBlock', 'Every order transition with actor, time and reason.', ['compact', 'full', 'awaiting approval', 'stale'], 'Buyer and seller order detail', LF, 'SM-F-15'),
  ext('X-20', 'DeliveryTrackingBlock', 'Kernel extension', 'Carrier events, delivery window and proof of delivery; late or missing events degrade to last-known state.', ['pending', 'handed over', 'in transit', 'delayed', 'stale', 'no window', 'delivered', 'unknown'], 'Order detail', MF, 'SM-F-17'),
  ext('X-21', 'ReturnDisputeCaseBlock', 'Kernel extension', 'Line-level return or dispute: the claim, evidence with who added it, and the decision with its refund and stock outcome. Labels are the contract’s; the commands (ask for evidence, add evidence, decide, withdraw) arrive as the case’s own actions.', ['open', 'evidence requested', 'reviewing', 'approved', 'rejected', 'resolved', 'decided with refund', 'window closing'], 'Returns and disputes', LF, 'SM-F-18'),
  ext('X-22', 'ReorderDiffBlock', 'Kernel extension', 'Copying a past order into a fresh cart, with price, stock, minimum-order and discontinued differences explicit.', ['none', 'price', 'stock', 'moq', 'discontinued'], 'Buyer reorder', M, 'SM-F-20'),
  ext('X-23', 'SellerAnalyticsGrid', 'Configured StatsBlock', 'Revenue, fill rate, cancellations and stock risk from shared metric definitions, with chart and table; top products search, filter by sale unit and page.', ['7 / 30 / 90 days', 'loading', 'empty', 'top products searched', 'filtered'], 'Seller dashboard', L, 'SM-F-19'),
  ext('X-24', 'IntegrationPanel', 'Kernel extension', 'Scoped API tokens and signed webhooks, each row with the contract’s commands (revoke, replace secret, switch off or on), the forms that create them, the deliveries list, and the one time a new token or secret is readable.', ['active', 'revoked', 'delivered', 'retrying', 'failed', 'switched off', 'secret shown once', 'empty'], 'Organization integrations', L, 'SM-F-23'),
  ext('X-25', 'ReconciliationTraceBlock', 'Kernel extension', 'One journey reconstructed from the audit trail: every area it touched (accounts, catalogue, prices, stock, orders, payments, fulfilment, returns, integrations) in time order, filterable by area, each event with its reason, request and actor.', ['filtered', 'expanded event', 'with reason', 'scheduled job'], 'Marketplace admin', L, 'SM-F-24'),
  ext('X-26', 'NotificationsBlock', 'Configured ActivityBlock', 'Order, approval, quote, payment and delivery notices: unread, read, queued and failed deliveries, mark read.', ['unread', 'read', 'queued', 'failed', 'page', 'panel', 'loading', 'empty', 'error'], 'Buyer and seller dashboards, notifications page', ML, 'SM-F-21'),
  ext('X-27', 'NotificationBell', 'Kernel extension', 'Header trigger whose accessible name carries the unread count; opens the panel list.', ['unread count', 'over nine', 'nothing unread'], 'App shell headers', ML, 'SM-F-21'),
  ext('X-29', 'CategoryHero', 'Kernel extension', 'A category’s landing header: the name set large, what it holds and how much, beside a scene photograph.', ['with photograph', 'text only'], 'Category results', M, 'SM-F-08'),
  ext('X-31', 'BuyBox and AddToCart', 'Kernel extension', 'The product page’s buying column: every pack on sale with its price, price per normalised unit, minimum order and stock; a stepper from the minimum order; adds to the server-backed cart, or says why this person cannot buy.', ['one pack', 'several packs', 'signed out', 'not a buyer', 'awaiting approval', 'out of stock', 'adding', 'refused'], 'Product page, comparison', M, 'SM-F-10'),
  ext('X-32', 'CompareToggle and CompareTray', 'Kernel extension', 'The comparison selection while browsing: up to four products of one category, kept in this browser; picking from another category starts again.', ['off', 'on', 'replaced category', 'full', 'tray', 'inline tray'], 'Product cells, product page, the empty comparison page', M, 'SM-F-09'),
  ext('X-34', 'OrderPaymentBlock', 'Kernel extension', 'One order’s payment: the M-Pesa panel beside the packs held for it and the time left, and, on the payment sandbox, a stand-in for the buyer’s phone that answers the prompt. Connected as OrderPayment to the order’s pay command.', ['ready to pay', 'sending', 'awaiting the phone', 'sandbox phone', 'paid', 'failed, pay again', 'refunded', 'not stock-tracked', 'duplicates ignored'], 'Checkout result, order detail', F, 'SM-F-13, SM-F-14'),
  ext('X-35', 'SecretReveal', 'Kernel extension', 'The one time a new API token or webhook signing secret is readable: copy it, then confirm it is stored.', ['token', 'signing secret'], 'Organization integrations', L, 'SM-F-23'),
  ext('X-36', 'ReconciliationChecksBlock', 'Kernel extension', 'The reconciliation checks: records that must agree (payments and orders, ledger and balances, holds and expiry, outbox and deliveries), each with what it means and examples to trace.', ['all clear', 'needs a look', 'traceable examples'], 'Marketplace admin', L, 'SM-F-24'),
  ext('X-33', 'CategoryDetailsForm', 'Configured ProjectedForm', 'A product’s category details, one typed control per contract attribute, the category’s guidance for sellers beside them, and the API’s field-level messages in place.', ['empty', 'filled', 'required missing', 'refused value', 'read-only'], 'Catalogue management', L, 'SM-F-04'),
  ext('X-30', 'ProductGallery', 'Kernel extension', 'One large photograph that adapts to how many there are: alone it fills the frame; with more, a thumbnail rail (side or bottom by container width), previous and next, arrow keys, swipe, a counter, credits and a larger view. Cut-outs sit on the well, scene photographs fill the frame.', ['one photo', 'several photos', 'side rail', 'bottom rail', 'larger view', 'reduced motion'], 'Product page', M, 'SM-F-22'),
  ext('X-28', 'NotificationPreferencesBlock', 'Configured form', 'Which events reach which channel, one switch per pair, saved per change and deduplicated; events search and filter by delivery and channel.', ['on', 'off', 'saving', 'not offered', 'restricted', 'searched', 'filtered'], 'Account settings', ML, 'SM-F-21'),

  { code: 'D-01', name: 'CategoryContractBuilder', cls: 'Divergent', sub: 'Registered block', phase: '08', modes: L, states: ['attributes', 'choices', 'per variant', 'units', 'normalised prices', 'facets', 'comparison', 'display', 'guidance', 'draft', 'unsaved', 'invalid', 'server problems', 'published (read-only)', 'retired'], usedIn: 'Category administration', summary: 'One contract version drives seller fields, variant fields, buyer filters, comparison rows, product cards and normalised prices; drafts save through the API, published versions are read-only, and the previews prove the derivation live.', source: 'SM-F-03', module: 'divergent' },
  { code: 'D-02', name: 'ProductComparisonBlock', cls: 'Divergent', sub: 'Registered block', phase: '08', modes: M, states: ['2', '3', '4 products', 'sticky labels', 'missing values', 'normalised units', 'add to cart'], usedIn: 'Buyer comparison', summary: 'Products aligned on the category contract’s comparable fields; gaps are stated, never shifted; each column carries its own action (add the cheapest pack to the cart).', source: 'SM-F-09', module: 'divergent' },
  { code: 'D-03', name: 'FulfillmentPickPackBlock', cls: 'Divergent', sub: 'Registered block', phase: '08', modes: F, states: ['queued', 'pick', 'part picked', 'none picked', 'scan', 'line refused', 'pack', 'hand over', 'handed over', 'cancelled'], usedIn: 'Warehouse fulfilment', summary: 'Scanner-driven picking against the server’s pick list: per-line decisions (all, part with a reason, none), packing and a hand-over with a required photo, at touch-safe sizes; the API’s answer per line shows on that line.', source: 'SM-F-16', module: 'divergent' },

  mktg('M-01', 'MarketingHeader', 'Public header in three ruled tiers: operating terms, search-first main row, category row; a sheet on narrow screens. Live pages put the signed-in account in the call-to-action slot.', ['public', 'sticky', 'mobile menu', 'buyer emphasis', 'seller emphasis', 'category row', 'current category', 'account slot']),
  mktg('M-02', 'MercantileHero', 'Landing hero: two photographic doors (buy, sell), each with its own headline and action, with the trade terms as a ruled row beneath.', ['photo split', 'narrow', 'image loading']),
  mktg('M-03', 'MarketMeshVisualization', 'One product record on the chrome ground, availability set large over its entries and their sum; choosing a part of the market lights the entries it writes.', ['animated', 'static', 'reduced motion', 'part chosen', 'narrow']),
  mktg('M-04', 'CategoryShowcase', 'Category discovery as tall photographic tiles, or joined cells with the product cut-outs on the well.', ['photo', 'grid', 'carousel', 'stacked']),
  mktg('M-05', 'BuyerSellerValueSplit', 'What each side of the market gets, tied to real mechanisms: two photographic stories, a split or tabs.', ['stories', 'split', 'tabs']),
  mktg('M-06', 'TradeFlowStory', 'Discover, compare, order and fulfil as one ruled thread of numbered steps; each step shows a real component on the well.', ['discover', 'compare', 'order', 'fulfil']),
  mktg('M-07', 'InventoryTrustProof', 'Stock, reservation and payment guarantees shown working: the argument holds its place while the three proofs scroll past.', ['stock', 'reservation', 'payment', 'narrow']),
  mktg('M-08', 'WholesaleMetricsStrip', 'Terms of trade as figures, or demo seed counts labelled with their source; no commercial claims.', ['full', 'compact']),
  mktg('M-09', 'MarketingCTA', 'The close, as an editorial split on the warm ground: the statement set large with its second line in forest, both calls to action, three numbered joining steps on a rule, and a photograph that settles in on scroll; the woven thread draws across the top. No colour slab.', ['buyer', 'seller', 'dual', 'full', 'compact', 'with photograph', 'without photograph']),
  mktg('M-10', 'MarketingFooter', 'The page close on the warm ground under a heavy ink rule: the lockup, ruled link columns, the portfolio-concept notice and the theme switch.', ['full', 'minimal']),
  mktg('M-12', 'StorySplit', 'A scene photograph beside the argument in one ruled container; photograph left or right, never three in a row.', ['photo left', 'photo right', 'with list', 'with link']),
  mktg('M-13', 'TradeStatement', 'One oversized statement set to the container’s width, with a product cut-out standing in front of the words.', ['default']),
  mktg('M-14', 'ProductRail', 'A merchandised row of product cells from the contract projection, joined into one ruled grid with a link to the rest.', ['four products', 'with link', 'narrow']),
  mktg('M-11', 'TradeRibbon', 'The woven thread: two fine strands, forest and amber, crossing like a weave and drawing in as their section scrolls in. Replaces the filled band. At most twice a page.', ['light ground', 'dark ground', 'drawing in', 'reduced motion']),

  template('L-01', 'Landing / public home', 'MarketingHeader → MercantileHero → CategoryShowcase → Projection (product rail) → TradeStatement → BuyerSellerValueSplit → MarketMeshVisualization → TradeFlowStory → InventoryTrustProof → MarketingCTA → MarketingFooter', M),
  template('L-02', 'Category / search results', 'CategoryHero → FacetFilterPanel (sheet) → SortSelect → ListBlock (media cards, page controls) → Pagination, all live', M),
  template('L-03', 'Product detail', 'Breadcrumbs → image column (FieldView media + scenes) → sticky buy column (StockAvailabilityIndicator → PriceTierTable → ActionBar) → RelatedBlock', M),
  template('L-04', 'Product comparison', 'HeaderBlock → ProductComparisonBlock → ActionBar (add to cart, request quote)', M),
  template('L-05', 'Cart', 'HeaderBlock → CartBlock → SellerCartGroup × n → repricing and stock feedback → ActionBar', MF),
  template('L-06', 'Checkout / payment', 'HeaderBlock → CheckoutSummaryBlock → ProjectedForm (address) → OrderPaymentBlock → ReservationCountdown → PaymentStatusPanel', F),
  template('L-07', 'Buyer dashboard', 'AppNav → HeaderBlock → StatsBlock → GridBlock (recent orders, approvals, quotes) → NotificationsBlock', ML),
  template('L-08', 'Seller dashboard', 'AppNav → HeaderBlock → SellerAnalyticsGrid → GridBlock (low stock, orders, top products) → ActivityBlock', L),
  template('L-09', 'Catalogue management', 'HeaderBlock → FiltersBlock → ListBlock (products) → ProductEditorBlock → VariantMatrixEditor → MediaManager → PriceBookEditor', L),
  template('L-10', 'Inventory', 'HeaderBlock → ListBlock (balances) → ActionBar (receive, adjust) → ProjectedForm (track a pack) → InventoryLedgerBlock', L),
  template('L-11', 'Orders / order detail', 'HeaderBlock → FiltersBlock / ListBlock → DetailBlock → OrderTimelineBlock → PaymentStatusPanel → DeliveryTrackingBlock → ActionBar', LF),
  template('L-12', 'Warehouse fulfilment', 'HeaderBlock → ListBlock (pick lists) → FulfillmentPickPackBlock → evidence file fields → toast and error feedback', F),
  template('L-13', 'Quotes', 'HeaderBlock → ListBlock → QuoteRequestSheet / QuoteDecisionPanel → ChatBlock (optional) → ActionBar', ML),
  template('L-14', 'Purchase approvals', 'HeaderBlock → ListBlock → ApprovalFlowBlock → ConfirmAction', L),
  template('L-15', 'Returns / disputes', 'HeaderBlock → ListBlock → ReturnDisputeCaseBlock → ActionBar (evidence, decision) → evidence file fields', L),
  template('L-16', 'Marketplace admin', 'AppNav → HeaderBlock → SellerOnboardingReviewBlock → CategoryContractBuilder → StatsBlock → ReconciliationTraceBlock', L),
  template('L-17', 'Integrations / audit', 'HeaderBlock → ListBlock (API clients) → IntegrationPanel → SecretReveal → ListBlock (deliveries, audit trail) → ReconciliationChecksBlock → ReconciliationTraceBlock', L),
  template('L-18', 'List (generic)', 'HeaderBlock → FiltersBlock → ListBlock → Pagination', ALL),
  template('L-19', 'Detail (generic)', 'Breadcrumbs → HeaderBlock → SplitBlock (DetailBlock + ActivityBlock) → RelatedBlock → ActionBar', ALL),
  template('L-20', 'Dashboard (generic)', 'AppNav → HeaderBlock → StatsBlock → GridBlock (ListBlock, ActivityBlock)', ML),
  template('L-21', 'Auth (sign in, register)', 'ProjectedForm (recipe=auth) → ErrorState (rate limit) → ToastFeedback', ALL),
  template('L-22', 'Settings (organization)', 'AppNav → HeaderBlock → Tabs → ProjectedForm (inline) → ListBlock (members) → NotificationPreferencesBlock', L),
  template('L-23', 'Seller application', 'HeaderBlock → Thread (application steps) → WholesaleMetricsStrip (terms of trade) → ProjectedForm (stepper) → evidence file fields → ToastFeedback', LF),
  template('L-24', 'Buyer reorder', 'HeaderBlock → ReorderDiffBlock → CartBlock → ActionBar', MF),
  template('L-25', 'Notifications', 'AppNav → HeaderBlock → NotificationBell → NotificationsBlock → NotificationPreferencesBlock', ML),
]

export const classes: EntryClass[] = ['Foundation', 'Primitive', 'Field', 'Kernel', 'Block', 'Extension', 'Divergent', 'Marketing', 'Template']
export const modes: Mode[] = ['MARKET', 'LEDGER', 'FLOW']

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const linkable = catalogue.filter(e => e.cls !== 'Template' && e.cls !== 'Field' && e.cls !== 'Foundation')
  .map(e => ({ e, re: new RegExp(`\\b${escape(e.name.split(' / ')[0]!)}\\b`) }))

/** A template's block order, one step per arrow in its chain. */
export const chainOf = (template: Entry) => template.summary.split('→').map(s => s.trim())

/** The inventory row a chain step names first, as a whole word; the longer name wins a tie. */
export function rowFor(step: string): Entry | undefined {
  let best: { e: Entry; at: number } | undefined
  for (const { e, re } of linkable) {
    const at = re.exec(step)?.index
    if (at !== undefined && (!best || at < best.at || (at === best.at && e.name.length > best.e.name.length))) best = { e, at }
  }
  return best?.e
}

/** How many page templates compose each component, derived from the chains above. */
export const composedIn: ReadonlyMap<string, number> = (() => {
  const counts = new Map<string, number>()
  for (const t of catalogue.filter(e => e.cls === 'Template')) {
    for (const code of new Set(chainOf(t).map(s => rowFor(s)?.code).filter(Boolean) as string[])) counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  return counts
})()
