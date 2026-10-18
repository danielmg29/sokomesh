// Record shapes the API adds to a model's contract fields (each resource's `serialize_extra`), for the
// pages that read them, on the server and in the browser alike. Field values themselves follow the
// generated metadata; these are the derived and nested parts the metadata does not describe.

import type { FieldMeta, Rec } from '../contract/types'

export type SellerActivation = 'draft' | 'under_review' | 'active' | 'rejected' | 'suspended'

export type SellerStatusChange = { id: string; from_status: SellerActivation; to_status: SellerActivation; reason: string; actor: string | null; at: string }

/** apps/sellers/resources.py `_profile_extra`; `documents` are seller-document records. */
export type SellerProfileRecord = Rec & {
  public_name: string; description: { html: string; text: string }; support_email: string; support_phone: string
  activation_status: SellerActivation; rejection_reason: string; submitted_at: string | null; reviewed_at: string | null
  organization: { id: string; label: string; approval_state: string; created_at: string; location: string }
  documents: Rec[]; history: SellerStatusChange[]; missing_documents: string[]; activation_blockers: string[]
}

// --- catalogue (apps/catalog/resources.py) ----------------------------------------------------------

export type RichValue = { html: string; text: string }
/** `widths`: the responsive widths a processed photograph may be served at (SM-F-05). */
export type ImageRecord = { url: string; alt: string; width: number; height: number; credit?: string; widths?: number[] }
/** CartLine.stock_status values (spec SM-F-10): buyer-visible state, never warehouse detail. */
export type StockStatus = 'available' | 'limited' | 'unavailable' | 'unknown'
export type StockRecord = { state: StockStatus; available: number | null; unit: string }
export type NormalisedPrice = { amount: string; per: string }

/** `variant_view`: one sellable pack, with its derived label and normalised price. */
export type VariantRecord = {
  id: string
  sku: string
  pack_label: string
  packaging_unit: string
  units_per_pack: string
  moq: number
  unit_price: string
  normalised_price: NormalisedPrice | null
  stock: StockRecord
  is_active: boolean
  /** Per-variant attribute values (choice values), as the contract defines them. */
  attributes: Record<string, string>
  details: { key: string; label: string; value: string }[]
  /** Product pages only: the public price at each quantity where it changes (SM-F-06). */
  tiers?: PriceTierRecord[]
}

/** One step of a variant's price ladder, from `pricing.tiers`. */
export type PriceTierRecord = { min_quantity: number; max_quantity: number | null; unit_price: string; explanation: string }

/** PriceResolution (SM-F-06) for one variant and quantity, as `GET prices` answers it. */
export type PriceAnswer = {
  variant_id: string
  unit_price: string
  rule_id: string | null
  explanation: string
  resolved_at: string
  quantity: number
  /** Resolved for the signed-in buyer's organization (their groups apply), not the public. */
  personal: boolean
  tiers: PriceTierRecord[]
}

export type ProductPage = {
  product_id: string
  canonical_url: string
  structured_data_json: Record<string, unknown>
  primary_image_url: string | null
  breadcrumb_items: { label: string; href?: string }[]
  title: string
  description: string
}

/** The public product list's record (`product`); headline values are the cheapest active variant's. */
export type ProductRecord = Rec & {
  name: string
  slug: string
  sku: string | null
  pack_label: string | null
  unit_price: string | null
  min_order_quantity: number | null
  in_stock: boolean
  brand: string
  short_description: string
  description: RichValue
  primary_image: ImageRecord | null
  /** Further photographs (credited); at most the contract's `maxItems` for the field. */
  gallery: ImageRecord[]
  seller: { id: string; label: string; detail: string | null; phone: string | null }
  category: { id: string; label: string; slug: string }
  page: ProductPage
}

/** A product page's record: the list record plus what only the detail serves. */
export type ProductDetailRecord = ProductRecord & {
  variants: VariantRecord[]
  specs: { key: string; label: string; value: string }[]
  contract: { id: string; version: number; comparable: boolean; buyer_guidance: RichValue }
}

/** A published category contract as buyers and seller forms read it (`contract_summary`, SM-F-03). */
export type ContractSummary = {
  id: string
  name: string
  version: number
  attributes: FieldMeta[]
  variant_attributes: FieldMeta[]
  /** Buyer filters, named `attr.<key>` as the product list accepts them. */
  facets: FieldMeta[]
  comparison_keys: string[]
  display_recipe: { card_keys?: string[]; spec_keys?: string[] }
  sale_units: { value: string; label: string }[]
  normalise: { attribute: string; per: string; factor: number } | null
  seller_guidance: RichValue
  buyer_guidance: RichValue
}

export type CategoryRecord = Rec & {
  name: string
  slug: string
  description: string
  product_count: number
  parent: { id: string; label: string } | null
  contract: ContractSummary | null
}

/** One attribute definition in a contract's `attribute_schema` (apps/catalog/contracts.py). */
export type AttributeDefinition = {
  key: string
  label: string
  type: 'enum' | 'decimal' | 'integer' | 'string' | 'boolean'
  required?: boolean
  choices?: { value: string; label: string }[]
  unit?: string
  min?: number
  max?: number
  variant?: boolean
  help?: string
}

/** The `category_contract` resource record (administrators see drafts and history). */
export type CategoryContractRecord = Rec & {
  name: string
  version: number
  status: 'draft' | 'published' | 'retired'
  category: { id: string; label: string }
  attribute_schema: AttributeDefinition[]
  unit_rules: { sale_units?: string[]; normalise?: { attribute: string; per: string; factor: number } | null }
  facet_keys: string[]
  comparison_keys: string[]
  display_recipe: { card_keys?: string[]; spec_keys?: string[] }
  seller_guidance: RichValue
  buyer_guidance: RichValue
  predecessor: { id: string; label: string } | null
  published_by: { id: string; label: string } | null
  published_at: string | null
  updated_at: string
  derived: ContractSummary
  problems: Record<string, string[]>
  product_count: number
  category_slug: string
}

/** A seller's own product (`catalog_product`, SM-F-04), drafts included. */
export type CatalogProductRecord = Rec & {
  name: string
  slug: string
  status: 'draft' | 'published' | 'suspended' | 'archived'
  category: { id: string; label: string }
  category_contract: { id: string; label: string }
  attributes: Record<string, unknown>
  primary_image: ImageRecord | null
  variant_count: number
  variants: VariantRecord[]
  publish_blockers: string[]
  contract: ContractSummary
  newer_contract: ContractSummary | null
  public_url: string | null
  media: MediaAssetRecord[]
  price_rules: PriceRuleRecord[]
}

/** A product photograph (`media_asset`, SM-F-05) through its pipeline. */
export type MediaAssetRecord = Rec & {
  name: string
  alt_text: string
  size: number
  width: number | null
  height: number | null
  sort_order: number
  scan_status: 'pending' | 'clean' | 'rejected' | 'failed'
  processing_status: 'queued' | 'processing' | 'ready' | 'failed'
  rejection_reason: string | null
  url: string | null
  original_url: string
}

/** A price-book rule (`price_rule`, SM-F-06) with the state the editor shows. */
export type PriceRuleRecord = Rec & {
  variant: string
  label: string
  buyer_group_key: string | null
  minimum_quantity: number
  unit: string
  unit_price: string
  priority: number
  effective_from: string
  effective_until: string | null
  is_active: boolean
  state: 'active' | 'future' | 'expired' | 'off' | 'conflict'
  conflict_note: string | null
  explanation: string
}

/** `GET catalog/buyers`: a seller's trading partners and the price groups they are in. */
export type TradingPartners = {
  results: { id: string; name: string; city: string | null; orders: number; last_order_at: string | null; groups: { id: string; group_key: string }[] }[]
  groups: { value: string; label: string }[]
}

/** ComparisonState (spec SM-F-09), projected by the API's `compare` view. */
export type ComparisonRecord = {
  category_contract: { id: string; name: string; version: number } | null
  category: { label: string; slug: string } | null
  comparison_keys: string[]
  fields: FieldMeta[]
  products: {
    id: string; slug: string; name: string; seller: string; image: ImageRecord | null; unit_price: string; unit: string
    normalised_price: NormalisedPrice | null; stock: StockRecord; variant: { id: string; sku: string; moq: number }
    values: Record<string, unknown>
  }[]
  missing_value_keys: Record<string, string[]>
  unavailable_ids: string[]
  price_context: { as_of: string; currency: string; basis: string; normalised_per: string | null }
}

// --- carts and orders (apps/carts, apps/orders) -----------------------------------------------------

export type CartLineState = 'valid' | 'changed' | 'unavailable'
export type CartLineRecord = {
  id: string
  product: { name: string; slug: string; image: ImageRecord | null }
  variant: { id: string; sku: string; pack_label: string; moq: number }
  quantity: number
  unit: string
  /** The price the line was added at; `unit_price` is today's. They differ until the buyer accepts. */
  quoted_unit_price: string
  unit_price: string
  price_validated_at: string
  stock: StockRecord
  state: CartLineState
  reason: string | null
  seller_id: string
  /** Why this price: "List price", "Key accounts price", "Quantity price from 10 bales". */
  price_explanation: string
}
export type CartRecord = Rec & {
  status: 'active' | 'submitted' | 'abandoned' | 'converted'
  version: number
  groups: { seller: { id: string; label: string; city: string | null }; lines: CartLineRecord[]; subtotal: string }[]
  line_count: number
  subtotal: string
  repriced: number
  unavailable: number
  state: 'valid' | 'repricing' | 'out-of-stock'
  checked_at: string
}

export type ReorderKind = 'price' | 'stock' | 'moq' | 'discontinued'
/** One historical line against today's catalogue (ReorderResult.line_differences, SM-F-20). */
export type ReorderDifference = {
  line_id: string
  product: string
  sku: string
  unit: string
  then: { unit_price: string; quantity: number; pack_label: string }
  now: { unit_price: string; quantity: number; pack_label: string; moq: number; stock: StockRecord } | null
  kinds: ReorderKind[]
  addable: boolean
  substitution: null
  product_slug: string | null
}
export type OrderLineRecord = {
  id: string; product: string; sku: string; pack_label: string; quantity: number; unit: string; unit_price: string; line_total: string
  price_explanation: string | null
}
export type OrderStatusValue = 'pending_approval' | 'submitted' | 'confirmed' | 'picking' | 'partially_fulfilled' | 'shipped' | 'delivered' | 'cancelled' | 'disputed'
export type OrderTransitionRecord = { id: string; from: OrderStatusValue | null; to: OrderStatusValue; at: string; actor: string; reason: string | null }
/** The approval an order waits for or passed (SM-F-12), from the policy snapshot taken when it was placed. */
export type ApprovalRecord = {
  state: 'pending' | 'approved' | 'rejected'
  policy: string
  threshold: string
  roles: string[]
  minimum: number
  approved: number
  decisions: { approver: string; decision: 'approved' | 'rejected'; comment: string; decided_at: string }[]
  can_decide: boolean
}
export type ShipmentStatusValue = 'pending' | 'handed_over' | 'in_transit' | 'delivered' | 'exception'
export type ShipmentEventRecord = { id: string; type: string; label: string; description: string; location: string | null; occurred_at: string; received_at: string; source: string }
/** A shipment as its resource (`shipment`, SM-F-17) serves it, with `_can`. */
export type ShipmentRecord = Rec & {
  order: { id: string; label: string }
  carrier_name: string
  carrier_reference: string
  status: ShipmentStatusValue
  estimated_start_at: string | null
  estimated_end_at: string | null
  last_event_at: string | null
  last_source: string | null
  stale: boolean
  delayed: boolean
  events: ShipmentEventRecord[]
  proof_of_delivery: FileRecord | null
}
export type FileRecord = { id: string; name: string; size: number; type: string; url: string; state?: string }
export type OrderRecord = Rec & {
  order_number: string
  status: OrderStatusValue
  submitted_at: string
  subtotal: string
  total: string
  special_instructions: string
  side: 'buyer' | 'seller' | null
  seller: { id: string; label: string }
  buyer: { id: string; label: string }
  delivery: { label: string; line1: string; city: string; region: string; postal_code: string } | null
  delivery_address: { id: string; label: string } | null
  submitted_by: { id: string; label: string } | null
  next_actions: string[]
  // The detail adds these:
  lines: OrderLineRecord[]
  transitions?: OrderTransitionRecord[]
  approval?: ApprovalRecord | null
  shipments?: { id: string }[]
  quote?: { id: string; reference: string } | null
  reorder?: { lines: ReorderDifference[]; addable: number; current_cart_lines: number }
}
/** `carts/<id>/checkout`: one order per seller. */
export type CheckoutResult = { orders: OrderRecord[] }
export type ReorderResult = {
  source_order_id: string
  new_cart_id: string
  line_differences: ReorderDifference[]
  unavailable_line_ids: string[]
  replaced_cart_lines: number
  created_at: string
}

// --- quotes (apps/quotes, SM-F-11) ------------------------------------------------------------------

export type QuoteStatusValue = 'requested' | 'responded' | 'accepted' | 'declined' | 'expired' | 'cancelled'
export type QuoteLineRecord = { id: string; product: string; sku: string; pack_label: string; quantity: number; unit: string; list_price: string; offered_price: string | null }
export type QuoteRecord = Rec & {
  reference: string
  status: QuoteStatusValue
  side: 'buyer' | 'seller' | null
  seller: { id: string; label: string }
  buyer: { id: string; label: string }
  delivery_address: { id: string; label: string } | null
  expires_at: string
  buyer_notes: string
  seller_notes: string
  responded_at: string | null
  accepted_at: string | null
  created_at: string
  lines: QuoteLineRecord[]
  list_total: string
  offered_total: string
  order: { id: string; order_number: string } | null
}

// --- analytics (apps/analytics, SM-F-19) --------------------------------------------------------------

export type MetricResult = {
  key: string
  name: string
  unit: string
  /** Which way is good news, from the metric definition. */
  better: 'higher' | 'lower'
  description: string
  version: number
  dimensions: string[]
  /** "" when there was nothing to average or divide. */
  value: string
  /** The period before, the same length; null for a metric of the present (stock). */
  previous: string | null
  series?: { bucket: string; value: string }[]
  breakdown?: { rank: number; label: string; value: string; units?: number }[]
}
export type AnalyticsAnswer = {
  query: { date_from: string; date_to: string; previous_from: string; previous_to: string; dimension: string | null }
  definitions_version: string
  metrics: MetricResult[]
}
