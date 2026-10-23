// View models for SokoMesh project extensions. State unions mirror the Feature Build Order and
// Field Specification v1.1 enums; when each model lands in the contract (SM-F-xx), these are
// replaced by generated types and the labels come from contract choices.

import type { ImageValue } from '@/components/kernel/fields/types'
import type { StockRecord, StockStatus } from '@/lib/client/records'

export type Money = string // decimal string, KES

export type StockState = 'available' | 'low' | 'reserved' | 'out-of-stock' | 'unknown'
export type Stock = {
  state: StockState
  /** Units a buyer can still reserve, computed by the backend from the ledger. */
  available: number
  unit: string
  reservedByOthers?: number
  heldForYou?: number
  heldUntil?: string
  restockOn?: string
  countedAt?: string
}

const fromStatus: Record<StockStatus, StockState> = { available: 'available', limited: 'low', unavailable: 'out-of-stock', unknown: 'unknown' }

/** The API's buyer-visible stock (CartLine.stock_status values) as the indicator's view model (server-safe). */
export const stockFrom = (s: StockRecord): Stock => ({ state: fromStatus[s.state], available: s.available ?? 0, unit: s.unit })

export type ReservationStatus = 'active' | 'expiring' | 'expired' | 'consumed' | 'released'
export type Reservation = { id: string; quantity: number; unit: string; status: ReservationStatus; expiresAt: string; product: string; orderReference?: string }

export type MovementType = 'receipt' | 'reservation' | 'release' | 'allocation' | 'adjustment' | 'shipment' | 'return'
/** `quantity` is the change in available stock; `onHandAfter`, when given, is what is physically held after it. */
export type InventoryMovement = { id: string; type: MovementType; quantity: number; unit: string; balanceAfter: number; onHandAfter?: number; at: string; actor: string; reference: string; reason?: string }

export type PriceTier = { minQuantity: number; maxQuantity?: number; unitPrice: Money; note?: string }

export type LineState = 'valid' | 'changed' | 'unavailable'
export type CartLine = {
  id: string
  product: string
  variant?: string
  sku: string
  image?: ImageValue
  quantity: number
  unit: string
  unitPrice: Money
  /** Present when the backend repriced the line since it was added. */
  previousUnitPrice?: Money
  moq?: number
  step?: number
  stock: Stock
  state: LineState
  reason?: string
  /** Why this price (the backend's explanation), such as a buyer-group or quantity price. */
  priceNote?: string
}

/** `deliveryFee` is absent until delivery is priced (it is confirmed at checkout). */
export type SellerGroup = { sellerId: string; seller: string; location: string; lines: CartLine[]; deliveryFee?: Money; minimumOrder?: Money; dispatch?: string }
