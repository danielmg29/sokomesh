// Demo seed for the design-system page. Every organization, person, brand and figure is invented
// and labelled "demo data" on the page; field metadata mirrors the Feature Build Order and Field
// Specification v1.1 until those models join contract/ac-contract.json.

import type { Stock } from '@/components/commerce/types'
import type { FieldMeta, ModelMeta, Rec } from '@/lib/contract/types'
import sceneData from '@/public/images/scenes/scenes.json'

/** Fixed clock so relative times and countdown anchors read the same on every render. */
export const DEMO_NOW = '2026-10-12T11:41:00+03:00'

// Demo product photographs: open-licence Wikimedia Commons images cut out by design/photography/cutout.py
// and set on the theme's well. They show the goods, not the invented brands' packaging; credits are in
// public/images/products/README.md.
const img = (file: string, alt: string, width: number, height: number) => ({ url: `/images/products/${file}.webp`, alt, width, height })

/** Scene photographs (design/photography/scenes.py): Unsplash, graded and cropped; credits in the manifest. */
export const scenes = sceneData
export type SceneKey = keyof typeof sceneData

export const sellers = {
  mwangaza: { id: 'org-mwg', label: 'Mwangaza Wholesalers Ltd', detail: 'Nakuru' },
  rift: { id: 'org-rvt', label: 'Rift Valley Traders', detail: 'Eldoret' },
  pwani: { id: 'org-pwd', label: 'Pwani Distributors', detail: 'Mombasa' },
  lakeside: { id: 'org-lks', label: 'Lakeside Supplies', detail: 'Kisumu' },
} as const

export const buyers = {
  wanjiru: { id: 'org-wgs', label: 'Wanjiru General Stores', detail: 'Naivasha' },
  baraka: { id: 'org-bmm', label: 'Baraka Mini-Mart', detail: 'Kericho' },
} as const

export const people = {
  grace: 'Grace Wanjiru', brian: 'Brian Otieno', faith: 'Faith Chebet', peter: 'Peter Kamau', amina: 'Amina Hassan', joseph: 'Joseph Mutua',
} as const

export const images = {
  maize: img('maize-flour', 'A heap of yellow maize flour (demo photograph)', 900, 763),
  sugar: img('sugar', 'A bowl of white granulated sugar (demo photograph)', 840, 900),
  oil: img('cooking-oil', 'A clear bottle of golden cooking oil (demo photograph)', 322, 900),
  tea: img('tea', 'A heap of loose black tea leaves (demo photograph)', 900, 479),
  rice: img('rice', 'A bowl of uncooked long-grain rice (demo photograph)', 848, 900),
  soap: img('soap', 'Two bars of hard soap, one green and one tan (demo photograph)', 900, 388),
  flour: img('wheat-flour', 'A glass bowl of white wheat flour (demo photograph)', 900, 762),
  milk: img('milk-powder', 'A heap of milk powder (demo photograph)', 285, 323),
}

const stockChoices = [
  { value: 'available', label: 'In stock', tone: 'success' as const },
  { value: 'low', label: 'Low stock', tone: 'warning' as const },
  { value: 'reserved', label: 'Reserved', tone: 'signal' as const },
  { value: 'out_of_stock', label: 'Out of stock', tone: 'danger' as const, mark: 'unavailable' as const },
]

export const categoryChoices = [
  { value: 'flour_grains', label: 'Flour & grains' }, { value: 'sugar', label: 'Sugar & sweeteners' }, { value: 'oils', label: 'Cooking oils' },
  { value: 'beverages', label: 'Tea & beverages' }, { value: 'household', label: 'Household & cleaning' }, { value: 'dairy', label: 'Dairy' },
]

export const productMeta: ModelMeta = {
  key: 'product', label: 'Product', labelPlural: 'Products', primaryKey: 'id', displayField: 'name', tenantScoped: false, versioned: true,
  ordering: ['-updated_at', 'unit_price', 'name'],
  list: { fields: ['image', 'name', 'seller', 'pack', 'unit_price', 'stock_status', 'moq', 'updated_at'], defaultPageSize: 24, maxPageSize: 100 },
  search: ['name', 'sku'],
  fields: [
    { name: 'id', type: 'uuid', widget: 'hidden', readOnly: true },
    { name: 'image', type: 'file', widget: 'image', label: 'Image' },
    { name: 'name', type: 'string', widget: 'text', label: 'Product', required: true, maxLength: 160, weight: 10 },
    { name: 'sku', type: 'string', widget: 'code', label: 'SKU', readOnly: true, weight: 15 },
    { name: 'seller', type: 'relation', widget: 'relation', label: 'Seller', role: 'subtitle', relation: { model: 'organization', display: 'name' }, filter: ['eq'], weight: 20 },
    { name: 'category', type: 'enum', widget: 'select', label: 'Category', choices: categoryChoices, filter: ['in'], weight: 25 },
    { name: 'pack', type: 'string', widget: 'text', label: 'Pack', weight: 30 },
    { name: 'unit_price', type: 'decimal', widget: 'currency', label: 'Price per pack', currency: 'KES', decimalPlaces: 2, maxDigits: 12, filter: ['range'], weight: 40 },
    { name: 'stock_status', type: 'enum', widget: 'status', label: 'Stock', choices: stockChoices, filter: ['in'], readOnly: true, weight: 60 },
    { name: 'moq', type: 'integer', widget: 'quantity', label: 'Minimum order', unit: 'pack', min: 1, weight: 50 },
    { name: 'updated_at', type: 'datetime', widget: 'relative-time', label: 'Updated', readOnly: true, weight: 90 },
  ],
  actions: [
    { name: 'add_to_cart', label: 'Add to cart', kind: 'command', policy: 'cart.create', tone: 'primary', icon: 'shopping-cart', when: { stock_status: ['available', 'low', 'reserved'] } },
    { name: 'request_quote', label: 'Request quote', kind: 'command', policy: 'quote.create', icon: 'file-text' },
    { name: 'archive', label: 'Archive product', kind: 'archive', policy: 'product.archive', tone: 'danger', confirm: true, icon: 'archive' },
  ],
}

const buyerCan = ['add_to_cart', 'request_quote']
export const products: Rec[] = [
  { id: 'p-mvn-2k', image: images.maize, name: 'Mavuno Maize Flour 2 kg', sku: 'MVN-2K-12', seller: sellers.mwangaza, category: 'flour_grains', pack: 'Bale of 12 × 2 kg', unit_price: '1740.00', stock_status: 'available', moq: 5, updated_at: '2026-10-12T11:32:00+03:00', _can: buyerCan },
  { id: 'p-skb-1k', image: images.sugar, name: 'Sukari Bora Sugar 1 kg', sku: 'SKB-1K-24', seller: sellers.rift, category: 'sugar', pack: 'Bale of 24 × 1 kg', unit_price: '3960.00', stock_status: 'low', moq: 2, updated_at: '2026-10-12T10:58:00+03:00', _can: buyerCan },
  { id: 'p-jua-3l', image: images.oil, name: 'Jua Gold Cooking Oil 3 L', sku: 'JUA-3L-06', seller: sellers.pwani, category: 'oils', pack: 'Carton of 6 × 3 L', unit_price: '5220.00', stock_status: 'out_of_stock', moq: 1, updated_at: '2026-10-11T16:20:00+03:00', _can: buyerCan },
  { id: 'p-mlm-500', image: images.tea, name: 'Mlima Loose Tea 500 g', sku: 'MLM-500-20', seller: sellers.lakeside, category: 'beverages', pack: 'Carton of 20 × 500 g', unit_price: '6400.00', stock_status: 'available', moq: 1, updated_at: '2026-10-12T09:05:00+03:00', _can: buyerCan },
  { id: 'p-mwp-25', image: images.rice, name: 'Mwea Pishori Rice 25 kg', sku: 'MWP-25K-01', seller: sellers.mwangaza, category: 'flour_grains', pack: 'Sack of 25 kg', unit_price: '4850.00', stock_status: 'reserved', moq: 2, updated_at: '2026-10-12T11:40:00+03:00', _can: buyerCan },
  { id: 'p-sfi-800', image: images.soap, name: 'Safi Laundry Bar 800 g', sku: 'SFI-800-25', seller: sellers.pwani, category: 'household', pack: 'Carton of 25 × 800 g', unit_price: '4375.00', stock_status: 'available', moq: 2, updated_at: '2026-10-10T14:12:00+03:00', _can: buyerCan },
  { id: 'p-ubf-2k', image: images.flour, name: 'Unga Bora Baking Flour 2 kg', sku: 'UBF-2K-10', seller: sellers.rift, category: 'flour_grains', pack: 'Bale of 10 × 2 kg', unit_price: '1690.00', stock_status: 'available', moq: 5, updated_at: '2026-10-12T08:47:00+03:00', _can: buyerCan },
  { id: 'p-mzw-400', image: images.milk, name: 'Maziwa Milk Powder 400 g', sku: 'MZW-400-12', seller: sellers.lakeside, category: 'dairy', pack: 'Tray of 12 × 400 g', unit_price: '7080.00', stock_status: 'low', moq: 1, updated_at: '2026-10-12T07:30:00+03:00', _can: buyerCan },
]

export const stockFor: Record<string, Stock> = {
  'p-mvn-2k': { state: 'available', available: 96, unit: 'bale', reservedByOthers: 24 },
  'p-skb-1k': { state: 'low', available: 14, unit: 'bale' },
  'p-jua-3l': { state: 'out-of-stock', available: 0, unit: 'carton', restockOn: '2026-10-15T09:00:00+03:00' },
  'p-mlm-500': { state: 'available', available: 41, unit: 'carton' },
  'p-mwp-25': { state: 'reserved', available: 6, unit: 'sack', heldForYou: 4, heldUntil: '2026-10-12T11:52:00+03:00' },
  'p-sfi-800': { state: 'available', available: 58, unit: 'carton' },
  'p-ubf-2k': { state: 'unknown', available: 0, unit: 'bale', countedAt: '2026-10-09T17:00:00+03:00' },
  'p-mzw-400': { state: 'low', available: 7, unit: 'tray' },
}

export const orderStatusChoices = [
  { value: 'submitted', label: 'Submitted', tone: 'info' as const }, { value: 'confirmed', label: 'Confirmed', tone: 'success' as const },
  { value: 'picking', label: 'Picking', tone: 'signal' as const }, { value: 'partially_fulfilled', label: 'Partially fulfilled', tone: 'warning' as const, mark: 'partial' as const },
  { value: 'shipped', label: 'Shipped', tone: 'info' as const }, { value: 'delivered', label: 'Delivered', tone: 'success' as const },
  { value: 'cancelled', label: 'Cancelled', tone: 'neutral' as const }, { value: 'disputed', label: 'Disputed', tone: 'danger' as const },
]

export const orderMeta: ModelMeta = {
  key: 'order', label: 'Order', labelPlural: 'Orders', primaryKey: 'id', displayField: 'order_number', tenantScoped: true, versioned: true,
  ordering: ['-submitted_at', 'total'],
  list: { fields: ['order_number', 'buyer', 'status', 'lines', 'total', 'submitted_at'], defaultPageSize: 25, maxPageSize: 100 },
  search: ['order_number'],
  fields: [
    { name: 'id', type: 'uuid', widget: 'hidden', readOnly: true },
    { name: 'order_number', type: 'string', widget: 'code', label: 'Order', readOnly: true, weight: 5 },
    { name: 'buyer', type: 'relation', widget: 'relation', label: 'Buyer', role: 'subtitle', relation: { model: 'organization', display: 'name' }, filter: ['eq'], weight: 10 },
    { name: 'status', type: 'enum', widget: 'status', label: 'Status', choices: orderStatusChoices, filter: ['in'], readOnly: true, weight: 20 },
    { name: 'lines', type: 'integer', widget: 'integer', label: 'Lines', readOnly: true, weight: 30 },
    { name: 'total', type: 'decimal', widget: 'currency', label: 'Total', currency: 'KES', decimalPlaces: 2, maxDigits: 12, filter: ['range'], readOnly: true, weight: 40 },
    { name: 'delivery_address', type: 'address', widget: 'address', label: 'Deliver to', weight: 50 },
    { name: 'special_instructions', type: 'text', widget: 'textarea', label: 'Instructions', maxLength: 1000, weight: 60 },
    { name: 'submitted_at', type: 'datetime', widget: 'relative-time', label: 'Submitted', readOnly: true, weight: 90 },
    { name: 'cancel_reason', type: 'text', widget: 'textarea', label: 'Reason for cancelling', required: true, maxLength: 300, help: 'Shown to the buyer and kept in the order history.' },
  ],
  actions: [
    { name: 'confirm', label: 'Confirm order', kind: 'command', policy: 'order.confirm', tone: 'primary', icon: 'check', when: { status: ['submitted'] } },
    { name: 'start_picking', label: 'Start picking', kind: 'command', policy: 'order.pick', tone: 'signal', icon: 'package', when: { status: ['confirmed'] } },
    { name: 'print', label: 'Print pick list', kind: 'command', policy: 'order.get', icon: 'printer' },
    { name: 'cancel', label: 'Cancel order', kind: 'command', policy: 'order.cancel', tone: 'danger', confirm: true, icon: 'ban', input: ['cancel_reason'], when: { status: ['submitted', 'confirmed'] } },
  ],
}

const sellerCan = ['confirm', 'start_picking', 'print', 'cancel']
const nakuruAddress = { label: 'Shop', line1: 'Moi Avenue, opposite the bus stage', city: 'Naivasha', region: 'Nakuru', postalCode: '20117', countryCode: 'KE', validated: true }
export const orders: Rec[] = [
  { id: 'o-4215', order_number: 'SM-ORD-004215', buyer: buyers.wanjiru, status: 'submitted', lines: 6, total: '48250.00', delivery_address: nakuruAddress, special_instructions: 'Deliver before 10:00; the shop closes for stock-take at noon.', submitted_at: '2026-10-12T11:18:00+03:00', _can: sellerCan, version: 3 },
  { id: 'o-4209', order_number: 'SM-ORD-004209', buyer: buyers.baraka, status: 'confirmed', lines: 3, total: '21360.00', delivery_address: nakuruAddress, submitted_at: '2026-10-12T09:02:00+03:00', _can: sellerCan, version: 5 },
  { id: 'o-4198', order_number: 'SM-ORD-004198', buyer: buyers.wanjiru, status: 'partially_fulfilled', lines: 8, total: '96480.00', delivery_address: nakuruAddress, submitted_at: '2026-10-11T15:44:00+03:00', _can: ['print'], version: 9 },
  { id: 'o-4176', order_number: 'SM-ORD-004176', buyer: buyers.baraka, status: 'delivered', lines: 4, total: '17920.00', delivery_address: nakuruAddress, submitted_at: '2026-10-10T08:15:00+03:00', _can: ['print'], version: 12 },
  { id: 'o-4170', order_number: 'SM-ORD-004170', buyer: buyers.wanjiru, status: 'disputed', lines: 2, total: '8700.00', delivery_address: nakuruAddress, submitted_at: '2026-10-09T13:30:00+03:00', _can: ['print'], version: 7 },
]

/**
 * A fortnight of one seller's order book for the list specimens, so search, filters and pages have rows to
 * work through. Built from fixed tables, never random, so every render and test sees the same orders.
 */
const historyStatuses = ['delivered', 'delivered', 'shipped', 'confirmed', 'picking', 'delivered', 'cancelled', 'partially_fulfilled', 'delivered', 'submitted', 'delivered'] as const
export const orderHistory: Rec[] = [
  ...orders,
  ...Array.from({ length: 22 }, (_, i): Rec => {
    const n = 4165 - i * 3
    const status = historyStatuses[i % historyStatuses.length]!
    const lines = 1 + ((i * 7) % 9)
    const at = `2026-10-0${9 - Math.floor(i / 3)}T${String(8 + ((i * 5) % 9)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}:00+03:00`
    return {
      id: `o-${n}`, order_number: `SM-ORD-00${n}`, buyer: i % 2 ? buyers.baraka : buyers.wanjiru, status, lines, total: (lines * (3480 + ((i * 1270) % 4200))).toFixed(2),
      delivery_address: nakuruAddress, submitted_at: at, _can: status === 'submitted' ? sellerCan : ['print'], version: 2 + (i % 6),
    }
  }),
]

/** Organization accounts (SM-F-01) plus seller profile fields: one form exercising most widgets. */
export const organizationMeta: ModelMeta = {
  key: 'organization', label: 'Organization', labelPlural: 'Organizations', displayField: 'name',
  list: { fields: ['name', 'organization_type', 'approval_state'], defaultPageSize: 25, maxPageSize: 100 },
  fields: [
    { name: 'name', type: 'string', widget: 'text', label: 'Trading name', required: true, maxLength: 120, group: 'identity', weight: 10 },
    { name: 'legal_name', type: 'string', widget: 'text', label: 'Registered name', maxLength: 160, group: 'identity', weight: 11 },
    { name: 'organization_type', type: 'enum', widget: 'select', label: 'Account type', required: true, group: 'identity', weight: 12, choices: [{ value: 'buyer', label: 'Buyer (retailer)' }, { value: 'seller', label: 'Seller (wholesaler)' }] },
    { name: 'tax_identifier', type: 'string', widget: 'code', label: 'KRA PIN', maxLength: 11, group: 'identity', weight: 13, help: 'Eleven characters, for example P051234567X.' },
    { name: 'approval_state', type: 'enum', widget: 'status', label: 'Approval', readOnly: true, group: 'identity', weight: 14, choices: [{ value: 'pending', label: 'Pending review', tone: 'info', mark: 'pending' }, { value: 'approved', label: 'Approved', tone: 'success' }, { value: 'rejected', label: 'Rejected', tone: 'danger' }, { value: 'suspended', label: 'Suspended', tone: 'warning' }] },
    { name: 'support_email', type: 'email', widget: 'email', label: 'Orders email', required: true, group: 'contact', weight: 20 },
    { name: 'support_phone', type: 'string', widget: 'phone', label: 'Orders phone', required: true, group: 'contact', weight: 21 },
    { name: 'address', type: 'address', widget: 'address', label: 'Business address', required: true, group: 'contact', weight: 22 },
    { name: 'location', type: 'location', widget: 'location', label: 'Map point', group: 'contact', weight: 23, help: 'Used for delivery distance and buyer search.' },
    { name: 'default_currency', type: 'enum', widget: 'select', label: 'Currency', required: true, default: 'KES', group: 'trading', weight: 30, choices: [{ value: 'KES', label: 'Kenyan shilling (KES)' }] },
    { name: 'credit_limit', type: 'decimal', widget: 'currency', label: 'Credit limit', currency: 'KES', decimalPlaces: 2, maxDigits: 12, min: 0, group: 'trading', weight: 31, fieldPolicy: { write: 'organization.credit' } },
    { name: 'payment_terms_days', type: 'integer', widget: 'integer', label: 'Payment terms', unit: 'days', min: 0, max: 90, group: 'trading', weight: 32 },
    { name: 'delivery_regions', type: 'enum', widget: 'multiselect', label: 'Delivery counties', maxItems: 5, group: 'trading', weight: 33, choices: ['Nakuru', 'Nairobi', 'Kiambu', 'Kericho', 'Uasin Gishu', 'Kisumu', 'Narok'].map(c => ({ value: c, label: c })) },
    { name: 'accepts_substitutes', type: 'boolean', widget: 'boolean', label: 'Accept substitutes when an item is short', group: 'trading', weight: 34 },
    { name: 'trading_since', type: 'date', widget: 'date', label: 'Trading since', group: 'trading', weight: 35 },
    { name: 'description', type: 'rich_text', widget: 'richtext', label: 'Public profile', maxLength: 2000, group: 'profile', weight: 40, help: 'Shown on your seller page. Text, links, images, video and tables.' },
    { name: 'logo', type: 'file', widget: 'image', label: 'Logo', accept: ['image/png', 'image/jpeg'], maxBytes: 2_097_152, group: 'profile', weight: 41 },
    { name: 'registration_certificate', type: 'file', widget: 'file', label: 'Certificate of incorporation', accept: ['application/pdf', 'image/jpeg'], maxBytes: 10_485_760, required: true, group: 'profile', weight: 42 },
  ],
}

export const organizationValues: Record<string, unknown> = {
  name: 'Mwangaza Wholesalers', legal_name: 'Mwangaza Wholesalers Limited', organization_type: 'seller', tax_identifier: 'P051234567X', approval_state: 'approved',
  support_email: 'orders@mwangaza-demo.co.ke', support_phone: '+254712345678',
  address: { label: 'Main warehouse', line1: 'Industrial Area, Oginga Odinga Road', line2: 'Godown 14', city: 'Nakuru', region: 'Nakuru', postalCode: '20100', countryCode: 'KE', validated: true },
  location: { lat: -0.2833, lng: 36.0667, label: 'Nakuru Industrial Area' },
  default_currency: 'KES', credit_limit: '250000.00', payment_terms_days: 14, delivery_regions: ['Nakuru', 'Kericho', 'Narok'], accepts_substitutes: true, trading_since: '2011-03-01',
  description: { html: '<p>Family wholesaler serving the Rift Valley since 2011.</p><ul><li>Dispatch within 24 hours</li><li>Own fleet to Nakuru, Kericho and Narok</li></ul>', text: 'Family wholesaler serving the Rift Valley since 2011. Dispatch within 24 hours. Own fleet to Nakuru, Kericho and Narok.' },
  logo: null,
  registration_certificate: { name: 'certificate-of-incorporation.pdf', size: 482_120, type: 'application/pdf', state: 'ready', url: '#' },
}

/** One field per remaining widget, for the renderer rows. */
export const extraFields: Record<string, FieldMeta> = {
  textarea: { name: 'rejection_reason', type: 'text', widget: 'textarea', label: 'Rejection reason', maxLength: 300 },
  decimal: { name: 'net_weight', type: 'decimal', widget: 'decimal', label: 'Net weight', unit: 'kg', decimalPlaces: 2, maxDigits: 8 },
  unit: { name: 'sale_unit', type: 'enum', widget: 'unit', label: 'Sale unit', choices: [{ value: 'bale_12x2kg', label: 'Bale (12 × 2 kg)' }, { value: 'carton_6x3l', label: 'Carton (6 × 3 L)' }, { value: 'sack_25kg', label: 'Sack (25 kg)' }, { value: 'tray_12x400g', label: 'Tray (12 × 400 g)' }] },
  quantity: { name: 'quantity', type: 'integer', widget: 'quantity', label: 'Quantity', unit: 'bale', min: 5, max: 96, step: 5, help: 'Minimum order 5 bales, in multiples of 5 · 96 available' },
  datetime: { name: 'expires_at', type: 'datetime', widget: 'datetime', label: 'Quote valid until' },
  url: { name: 'callback_url', type: 'string', widget: 'url', label: 'Webhook URL' },
  secret: { name: 'webhook_secret', type: 'string', widget: 'secret', label: 'Signing secret' },
  json: { name: 'attribute_schema_json', type: 'jsonb', widget: 'json', label: 'Attribute schema' },
  status: { name: 'activation_status', type: 'enum', widget: 'status', label: 'Seller status', choices: [{ value: 'under_review', label: 'Under review', tone: 'info', mark: 'pending' }, { value: 'active', label: 'Active', tone: 'success' }, { value: 'rejected', label: 'Rejected', tone: 'danger' }, { value: 'suspended', label: 'Suspended', tone: 'warning' }] },
  relativeTime: { name: 'updated_at', type: 'datetime', widget: 'relative-time', label: 'Updated', readOnly: true },
}

export const relationOptions = [
  { value: sellers.mwangaza.id, label: sellers.mwangaza.label, description: 'Nakuru · 312 products' },
  { value: sellers.rift.id, label: sellers.rift.label, description: 'Eldoret · 188 products' },
  { value: sellers.pwani.id, label: sellers.pwani.label, description: 'Mombasa · 240 products' },
  { value: 'org-sunset', label: 'Sunset Traders', description: 'Not approved for your buyer group', disabled: true, reason: 'Not approved for your buyer group' },
]

export const placeOptions = [
  { value: 'Nakuru Industrial Area', label: 'Nakuru Industrial Area', description: '-0.2833,36.0667' },
  { value: 'Naivasha town centre', label: 'Naivasha town centre', description: '-0.7167,36.4333' },
  { value: 'Kericho Market', label: 'Kericho Market', description: '-0.3689,35.2863' },
]
