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
  foundation('T-11', 'Layout primitives', 'Stack, Cluster, Split, Grid, DensityRegion and AppShell. Only these declare container queries.', ['stacked', 'split', '1 to 4 columns'], 'components/layout'),

  primitive('P-01', 'Button / IconButton', 'Commands. Icon-only buttons must name their action.', ['default', 'hover', 'focus', 'active', 'disabled', 'loading'], 'Actions, forms, navigation'),
  primitive('P-02', 'Input / Textarea', 'Text entry with prefix and suffix, character counts and over-limit state.', ['default', 'focus', 'error', 'disabled', 'read-only', 'over-limit'], 'Text field renderers'),
  primitive('P-03', 'Select / Combobox / MultiSelect', 'Finite and searchable choices, including server search and a bounded maximum.', ['empty', 'selected', 'searching', 'no-results', 'max-reached', 'disabled'], 'Choice and relation fields, filters'),
  primitive('P-04', 'Checkbox / Switch / Radio', 'Binary and single choices; checkboxes support indeterminate selection.', ['on', 'off', 'indeterminate', 'disabled'], 'Boolean fields, bulk selection'),
  primitive('P-05', 'Badge / Avatar / Kbd', 'Counts, people and organizations, keyboard hints.', ['quiet', 'strong', 'signal', 'initials'], 'Navigation, chat, palettes'),
  primitive('P-06', 'Dialog / AlertDialog / Sheet / Drawer', 'Protected focus for confirmations; sheets for side work and narrow filters.', ['closed', 'open', 'pending'], 'ConfirmAction, editors, filters'),
  primitive('P-07', 'Tabs / Accordion / Collapsible', 'Progressive disclosure for dense detail and builders.', ['active', 'inactive', 'open', 'closed'], 'Admin builders, detail regions'),
  primitive('P-08', 'Popover / DropdownMenu / Tooltip', 'Floating help and menus; keyboard-first.', ['closed', 'open', 'disabled item'], 'ActionMenu, filters, help'),
  primitive('P-09', 'Command', 'Filterable list for palettes and large pickers.', ['idle', 'searching', 'no-results'], 'CommandPalette, relation search'),
  primitive('P-10', 'Calendar / DatePicker', 'Nairobi time, weeks from Monday, disabled past dates.', ['empty', 'selected', 'disabled dates'], 'Date and datetime fields'),
  primitive('P-11', 'Table / ScrollArea / Separator', 'Bordered tables that read density tokens and scroll sideways with a visible bar; composed with P-19 every table searches, filters and pages live.', ['default', 'hover', 'selected', 'sticky head', 'searched', 'filtered', 'paged'], 'ListBlock, ledgers, comparison', LF),
  primitive('P-12', 'Skeleton / Progress / Toast', 'Loading placeholders, determinate and indeterminate progress, a bounded toast queue.', ['loading', 'progress', 'info', 'success', 'warning', 'danger'], 'LoadingState, uploads, feedback'),
  primitive('P-13', 'Form label / help / error', 'Label, help and error wired with aria-describedby for every control.', ['default', 'required', 'help', 'error'], 'Every FieldInput'),
  primitive('P-14', 'Stamp', 'The visual form of an authoritative state: label always visible, mark always present.', ['6 tones', 'stamp', 'dot', 'fresh'], 'StatusBadge, commerce states'),
  primitive('P-15', 'Thread', 'A process drawn as connected states; the connector pattern shows certainty.', ['done', 'current', 'upcoming', 'failed', 'stale'], 'Checkout, approvals, delivery, cases'),
  primitive('P-16', 'Segmented / RangeSlider', 'View switches and two-thumb ranges.', ['selected', 'range'], 'Mode switches, price facets'),
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
  kernel('K-07', 'BulkActions', '05', 'Bounded selection with impact preview, progress and partial-failure reporting.', ['hidden', 'active', 'executing', 'complete', 'error', 'over limit'], 'Catalogue publish, stock imports', 'limits.maxBulk · actions', L),
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
  kernel('K-18', 'Pagination', '05', 'Cursor pager for crawlable lists: previous and next are links carrying the cursor, with the range shown. In-app lists load more instead.', ['first page', 'middle page', 'last page', 'total not counted'], 'Category and search results', 'list.defaultPageSize · cursor in the URL', M),

  block('B-01', 'HeaderBlock', 'Page and record headers from metadata, a record, or an explicit title, with status and actions.', ['standard', 'compact', 'with status', 'with actions'], 'Every list and detail page'),
  block('B-02', 'FiltersBlock', 'Search plus typed filters for every field that declares filter operators; chips for active filters.', ['expanded', 'collapsed', 'mobile sheet', 'active', 'cleared'], 'Search, catalogue, orders, audit'),
  block('B-03', 'ListBlock', 'Tables or card grids with selection and three narrow strategies. Tables search `meta.search`, filter every field that declares operators, sort over `meta.ordering` and page, live over the records given.', ['loading', 'empty', 'error', 'stale', 'live', 'selected', 'searched', 'filtered', 'sorted', 'paged', 'no match', 'scroll', 'collapse', 'priority'], 'Search results, catalogue, orders, ledgers'),
  block('B-04', 'DetailBlock', 'Record detail through the detail recipe; full page, sheet or container-adaptive.', ['flat', 'bordered', 'raised', 'inset', 'loading'], 'Product, order, quote, case detail'),
  block('B-05', 'StatsBlock', 'A metric strip divided into cells, with comparisons and tone by metric state.', ['comfortable', 'spacious', 'loading', 'empty', 'error'], 'Seller analytics, admin health', L),
  block('B-06', 'ActivityBlock', 'Event timeline with type filtering; the thread pattern shows confirmed, awaiting or stale events.', ['compact', 'comfortable', 'filtered', 'empty', 'loading'], 'Order, ledger, payment, delivery history', LF),
  block('B-07', 'RelatedBlock', 'Records related to the current one, as rows or cards, with a view-all link.', ['row', 'card', 'empty'], 'Variants, order lines, members'),
  block('B-08', 'SplitBlock', 'Main and aside from a page definition; stacks below its container threshold.', ['sidebar', 'wide aside', 'half', 'media first'], 'Product buy box, order detail', ALL, 'Layout block'),
  block('B-09', 'GridBlock', 'One to four container-adaptive columns of child blocks.', ['1', '2', '3', '4 columns'], 'Dashboards, overviews', ALL, 'Layout block'),
  block('B-10', 'ChatBlock', 'Quote and dispute conversations, with internal notes visible only by policy.', ['compact', 'comfortable', 'internal note', 'empty', 'loading', 'error'], 'Quote negotiation, disputes', ML),

  ext('X-01', 'SellerOnboardingReviewBlock', 'Kernel extension', 'Admin review of seller identity, documents and activation history, with a decision sheet.', ['under review', 'active', 'rejected', 'suspended', 'summary', 'full'], 'Marketplace admin', L, 'SM-F-02'),
  ext('X-02', 'ProductEditorBlock', 'Configured ProjectedForm', 'Seller product editing whose attribute fields come from the category contract.', ['create', 'edit', 'inline', 'stepper', 'draft', 'published'], 'Catalogue management', L, 'SM-F-04'),
  ext('X-03', 'VariantMatrixEditor', 'Kernel extension', 'Variant rows from attribute combinations; duplicates and invalid MOQs flagged inline; bulk fill; search by SKU or attribute and facets by status, check and attribute.', ['table', 'cards', 'valid', 'invalid', 'bulk fill', 'searched', 'filtered', 'paged'], 'Catalogue management', L, 'SM-F-04'),
  ext('X-04', 'MediaManager', 'Kernel extension', 'Product media with derivative status, required alt text and keyboard reordering.', ['grid', 'list', 'uploading', 'processing', 'ready', 'rejected'], 'Catalogue management', L, 'SM-F-05'),
  ext('X-05', 'PriceBookEditor', 'Kernel extension', 'Base, buyer-group and quantity-tier rules, with overlapping rules flagged as conflicts.', ['view', 'edit', 'active', 'future', 'expired', 'conflict'], 'Seller price books', L, 'SM-F-06'),
  ext('X-06', 'PriceTierTable', 'Configured list projection', 'Quantity tiers with the buyer’s active tier marked and repricing shown as a diff.', ['compact', 'comfortable', 'active tier', 'repriced'], 'Product detail, cart, quotes', ML, 'SM-F-06'),
  ext('X-07', 'InventoryLedgerBlock', 'Configured Activity/ListBlock', 'Immutable stock movements; available quantity is derivable from the rows alone. Search by reference, person or reason; movement chips with live counts; pages.', ['receipt', 'reservation', 'release', 'allocation', 'adjustment', 'shipment', 'searched', 'filtered', 'paged', 'no match'], 'Inventory, reconciliation', L, 'SM-F-07'),
  ext('X-08', 'StockAvailabilityIndicator', 'Kernel extension', 'Availability from the ledger in compact or explained form.', ['available', 'low', 'reserved', 'out-of-stock', 'unknown'], 'Cards, cart, checkout, catalogue', ALL, 'SM-F-07'),
  ext('X-09', 'FacetFilterPanel', 'Configured FiltersBlock', 'Storefront filters derived from the active category contract, with facet counts.', ['sidebar', 'mobile sheet', 'active', 'cleared'], 'Search and category pages', M, 'SM-F-08'),
  ext('X-10', 'CartBlock', 'Kernel extension', 'Server-backed mixed-seller cart; repricing is explicit and blocked checkout explains why.', ['valid', 'repricing', 'out-of-stock', 'approval-needed', 'submitting'], 'Buyer cart', MF, 'SM-F-10'),
  ext('X-11', 'SellerCartGroup', 'Configured child of CartBlock', 'One seller’s lines, validated seller by seller, with minimum-order warnings.', ['expanded', 'collapsed', 'valid', 'changed', 'unavailable'], 'Mixed-seller carts', MF, 'SM-F-10'),
  ext('X-12', 'QuoteRequestSheet', 'Kernel extension', 'Buyer quote request from selected lines, with its status thread.', ['create', 'revise', 'view', 'requested', 'responded', 'accepted', 'declined', 'expired'], 'Cart and product detail', M, 'SM-F-11'),
  ext('X-13', 'QuoteDecisionPanel', 'Kernel extension', 'Seller accept, counter or decline; an accepted quote becomes an immutable snapshot.', ['respond', 'counter', 'accepted snapshot'], 'Seller quotes', L, 'SM-F-11'),
  ext('X-14', 'ApprovalFlowBlock', 'Kernel extension', 'Purchase approval by threshold and approver level; the API also refuses skipped approvals.', ['not-required', 'pending', 'approved', 'rejected'], 'Buyer approvals', LF, 'SM-F-12'),
  ext('X-15', 'ReservationIndicator', 'Kernel extension', 'A bounded stock hold, saying what happened to the units in every state.', ['active', 'expiring', 'expired', 'consumed', 'released'], 'Checkout, cart, support', F, 'SM-F-13'),
  ext('X-16', 'ReservationCountdown', 'Kernel extension', 'Time left on a reservation, announced at thresholds only, frozen while payment settles.', ['running', 'paused', 'expired', 'reduced motion'], 'Checkout', F, 'SM-F-13'),
  ext('X-17', 'CheckoutSummaryBlock', 'Kernel extension', 'Checkout steps with a per-seller summary and the reason it is blocked.', ['address', 'review', 'payment', 'result', 'valid', 'blocked', 'submitting'], 'Buyer checkout', F, 'SM-F-13'),
  ext('X-18', 'PaymentStatusPanel', 'Kernel extension', 'SellaPay M-Pesa STK push from prompt to confirmation, with honest delay and failure states.', ['created', 'pending', 'confirmed', 'failed', 'cancelled', 'reconciled', 'stale'], 'Checkout result, order detail, admin', F, 'SM-F-14'),
  ext('X-19', 'OrderTimelineBlock', 'Configured ActivityBlock', 'Every order transition with actor, time and reason.', ['compact', 'full', 'awaiting', 'stale'], 'Buyer and seller order detail', LF, 'SM-F-15'),
  ext('X-20', 'DeliveryTrackingBlock', 'Kernel extension', 'Carrier events, delivery window and proof of delivery; late or missing events degrade to last-known state.', ['pending', 'handed over', 'in transit', 'delayed', 'delivered', 'unknown'], 'Order detail', MF, 'SM-F-17'),
  ext('X-21', 'ReturnDisputeCaseBlock', 'Kernel extension', 'Line-level return or dispute with evidence and decision; refunds and stock stay separately auditable.', ['open', 'evidence requested', 'reviewing', 'approved', 'rejected', 'resolved'], 'Returns and disputes', LF, 'SM-F-18'),
  ext('X-22', 'ReorderDiffBlock', 'Kernel extension', 'Copying a past order into a fresh cart, with price and availability differences explicit.', ['none', 'price', 'availability', 'product-unavailable'], 'Buyer reorder', M, 'SM-F-20'),
  ext('X-23', 'SellerAnalyticsGrid', 'Configured StatsBlock', 'Revenue, fill rate, cancellations and stock risk from shared metric definitions, with chart and table; top products search, filter by sale unit and page.', ['7 / 30 / 90 days', 'loading', 'empty', 'top products searched', 'filtered'], 'Seller dashboard', L, 'SM-F-19'),
  ext('X-24', 'IntegrationPanel', 'Kernel extension', 'Scoped API tokens and signed webhooks with rotate and revoke confirmations.', ['active', 'revoked', 'delivered', 'retrying', 'failed'], 'Integrations', L, 'SM-F-23'),
  ext('X-25', 'ReconciliationTraceBlock', 'Kernel extension', 'A support case reconstructed across catalogue, price, inventory, payment and order events.', ['filtered', 'expanded event'], 'Marketplace admin', L, 'SM-F-24'),
  ext('X-26', 'NotificationsBlock', 'Configured ActivityBlock', 'Order, approval, quote, payment and delivery notices: unread, read, queued and failed deliveries, mark read.', ['unread', 'read', 'queued', 'failed', 'page', 'panel', 'loading', 'empty', 'error'], 'Buyer and seller dashboards, notifications page', ML, 'SM-F-21'),
  ext('X-27', 'NotificationBell', 'Kernel extension', 'Header trigger whose accessible name carries the unread count; opens the panel list.', ['unread count', 'over nine', 'nothing unread'], 'App shell headers', ML, 'SM-F-21'),
  ext('X-29', 'CategoryHero', 'Kernel extension', 'A category’s landing header: the name set large, what it holds and how much, beside a scene photograph.', ['with photograph', 'text only'], 'Category results', M, 'SM-F-08'),
  ext('X-28', 'NotificationPreferencesBlock', 'Configured form', 'Which events reach which channel, one switch per pair, saved per change and deduplicated; events search and filter by delivery and channel.', ['on', 'off', 'saving', 'not offered', 'restricted', 'searched', 'filtered'], 'Account settings', ML, 'SM-F-21'),

  { code: 'D-01', name: 'CategoryContractBuilder', cls: 'Divergent', sub: 'Registered block', phase: '08', modes: L, states: ['attributes', 'units', 'facets', 'comparison', 'display', 'draft', 'invalid', 'published', 'attributes searched', 'filtered', 'paged'], usedIn: 'Category administration', summary: 'One contract drives seller fields, buyer facets, comparison rows and export columns; the previews prove it live.', source: 'SM-F-03', module: 'divergent' },
  { code: 'D-02', name: 'ProductComparisonBlock', cls: 'Divergent', sub: 'Registered block', phase: '08', modes: M, states: ['2', '3', '4 products', 'sticky labels', 'missing values', 'normalised units'], usedIn: 'Buyer comparison', summary: 'Products aligned on the category’s comparable fields; gaps are stated, never shifted.', source: 'SM-F-09', module: 'divergent' },
  { code: 'D-03', name: 'FulfillmentPickPackBlock', cls: 'Divergent', sub: 'Registered block', phase: '08', modes: F, states: ['pick', 'pack', 'hand over', 'full', 'short', 'substitute', 'reject', 'scan'], usedIn: 'Warehouse fulfilment', summary: 'Scanner-driven picking with per-line decisions and handover evidence, at touch-safe sizes.', source: 'SM-F-16', module: 'divergent' },

  mktg('M-01', 'MarketingHeader', 'Public header in three ruled tiers: operating terms, search-first main row, category row; a sheet on narrow screens.', ['public', 'sticky', 'mobile menu', 'buyer emphasis', 'seller emphasis', 'category row']),
  mktg('M-02', 'MercantileHero', 'Landing hero: two photographic doors (buy, sell) with the trade terms beneath, or the headline beside a live product shelf.', ['photo split', 'default', 'buyer', 'seller', 'compact']),
  mktg('M-03', 'MarketMeshVisualization', 'One product record on the chrome ground, availability set large over its entries and their sum; choosing a part of the market lights the entries it writes.', ['animated', 'static', 'reduced motion', 'part chosen', 'narrow']),
  mktg('M-04', 'CategoryShowcase', 'Category discovery as tall photographic tiles, or joined cells with the product cut-outs on the well.', ['photo', 'grid', 'carousel', 'stacked']),
  mktg('M-05', 'BuyerSellerValueSplit', 'What each side of the market gets, tied to real mechanisms: two photographic stories, a split or tabs.', ['stories', 'split', 'tabs']),
  mktg('M-06', 'TradeFlowStory', 'Discover, compare, order and fulfil as one ruled thread of numbered steps; each step shows a real component on the well.', ['discover', 'compare', 'order', 'fulfil']),
  mktg('M-07', 'InventoryTrustProof', 'Stock, reservation and payment guarantees shown working: the argument holds its place while the three proofs scroll past.', ['stock', 'reservation', 'payment', 'narrow']),
  mktg('M-08', 'WholesaleMetricsStrip', 'Terms of trade as figures, or demo seed counts labelled with their source; no commercial claims.', ['full', 'compact']),
  mktg('M-09', 'MarketingCTA', 'Conversion close for buyers, sellers or both.', ['buyer', 'seller', 'dual', 'full', 'compact', 'with photograph']),
  mktg('M-10', 'MarketingFooter', 'The page close on the chrome ground: reversed logo, link columns, the portfolio-concept notice and the theme switch.', ['full', 'minimal']),
  mktg('M-12', 'StorySplit', 'A scene photograph beside the argument in one ruled container; photograph left or right, never three in a row.', ['photo left', 'photo right', 'with list', 'with link']),
  mktg('M-13', 'TradeStatement', 'One oversized statement set to the container’s width, with a product cut-out standing in front of the words.', ['default']),
  mktg('M-11', 'TradeRibbon', 'The organic accent: one flowing band with the amber thread, behind a grid, at most twice a page.', ['light ground', 'brand ground']),

  template('L-01', 'Landing / public home', 'MarketingHeader → MercantileHero → CategoryShowcase → Projection (product rail) → TradeStatement → BuyerSellerValueSplit → MarketMeshVisualization → TradeFlowStory → InventoryTrustProof → MarketingCTA → MarketingFooter', M),
  template('L-02', 'Category / search results', 'CategoryHero → FacetFilterPanel (sheet) → SortSelect → ListBlock (media cards) → Pagination, loading and empty', M),
  template('L-03', 'Product detail', 'Breadcrumbs → image column (FieldView media + scenes) → sticky buy column (StockAvailabilityIndicator → PriceTierTable → ActionBar) → RelatedBlock', M),
  template('L-04', 'Product comparison', 'HeaderBlock → ProductComparisonBlock → ActionBar (add to cart, request quote)', M),
  template('L-05', 'Cart', 'HeaderBlock → CartBlock → SellerCartGroup × n → repricing and stock feedback → ActionBar', MF),
  template('L-06', 'Checkout / payment', 'HeaderBlock → CheckoutSummaryBlock → ReservationIndicator / Countdown → ProjectedForm (address, phone) → PaymentStatusPanel', F),
  template('L-07', 'Buyer dashboard', 'AppNav → HeaderBlock → StatsBlock → GridBlock (recent orders, approvals, quotes) → NotificationsBlock', ML),
  template('L-08', 'Seller dashboard', 'AppNav → HeaderBlock → SellerAnalyticsGrid → GridBlock (low stock, orders, top products) → ActivityBlock', L),
  template('L-09', 'Catalogue management', 'HeaderBlock → FiltersBlock → ListBlock (products) → ProductEditorBlock → VariantMatrixEditor → MediaManager → PriceBookEditor', L),
  template('L-10', 'Inventory', 'HeaderBlock → FiltersBlock → InventoryLedgerBlock → StockAvailabilityIndicator → adjustment ActionBar / ConfirmAction', L),
  template('L-11', 'Orders / order detail', 'HeaderBlock → FiltersBlock / ListBlock → DetailBlock → OrderTimelineBlock → PaymentStatusPanel → DeliveryTrackingBlock → ActionBar', LF),
  template('L-12', 'Warehouse fulfilment', 'HeaderBlock → ListBlock (picking queue) → FulfillmentPickPackBlock → evidence file fields → toast and error feedback', F),
  template('L-13', 'Quotes', 'HeaderBlock → ListBlock → QuoteRequestSheet / QuoteDecisionPanel → ChatBlock (optional) → ActionBar', ML),
  template('L-14', 'Purchase approvals', 'HeaderBlock → ListBlock → ApprovalFlowBlock → ConfirmAction', L),
  template('L-15', 'Returns / disputes', 'HeaderBlock → ListBlock → ReturnDisputeCaseBlock → evidence file fields → ChatBlock (optional) → decision actions', L),
  template('L-16', 'Marketplace admin', 'AppNav → HeaderBlock → SellerOnboardingReviewBlock → CategoryContractBuilder → StatsBlock → ReconciliationTraceBlock', L),
  template('L-17', 'Integrations / audit', 'HeaderBlock → IntegrationPanel → Activity/ListBlock (delivery events) → ReconciliationTraceBlock', L),
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
