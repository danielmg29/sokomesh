import type { ReactNode } from 'react'
import type { ComboOption } from '@/components/ui/combobox'
import type { FieldMeta } from '@/lib/contract/types'

/** View contexts (manual 6.5). `media` is the card/hero presentation. */
export type FieldContext = 'compact' | 'comfortable' | 'spacious' | 'media'

export type ViewProps = { field: FieldMeta; value: unknown; context?: FieldContext; now?: string }

export type InputProps = {
  field: FieldMeta
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
  readOnly?: boolean
  invalid?: boolean
  /** Options for relation and large choice inputs, supplied by the caller's search. */
  options?: readonly ComboOption[]
  loading?: boolean
  onSearch?: (query: string) => void
}

export type FilterOp = 'eq' | 'in' | 'contains' | 'gte' | 'lte' | 'range' | 'isnull' | 'near'
export type FilterValue = { op: FilterOp; value: unknown }

export type FilterProps = {
  field: FieldMeta
  value: FilterValue | undefined
  onChange: (value: FilterValue | undefined) => void
  options?: readonly ComboOption[]
  /** Facet counts per choice value from the search response; zero-count choices stay visible but disabled. */
  counts?: Record<string, number>
}

export type DiffState = 'unchanged' | 'changed' | 'conflict'
export type DiffProps = { field: FieldMeta; before: unknown; after: unknown; theirs?: unknown; state?: DiffState }

export type FieldRenderer = {
  view: (p: ViewProps) => ReactNode
  /** Inline renderers (boolean) label themselves; the others are wrapped in FormField. */
  inlineInput?: boolean
  align?: 'start' | 'end'
}

// --- value shapes the API sends for structured widgets -------------------------------------

export type RelationValue = { id: string; label: string; detail?: string; unavailable?: boolean }
export type RichTextValue = { html: string; text: string }
export type ImageValue = { url: string; alt: string; width?: number; height?: number }
export type UploadState = 'empty' | 'uploading' | 'processing' | 'scanning' | 'ready' | 'rejected' | 'restricted' | 'error'
export type ImageUpload = { state: UploadState; image?: ImageValue; progress?: number; reason?: string; fileName?: string }
export type FileValue = { name: string; size: number; type: string; state: UploadState; progress?: number; reason?: string; url?: string }
export type AddressValue = { label?: string; line1: string; line2?: string; city: string; region?: string; postalCode?: string; countryCode: string; validated?: boolean }
export type LocationValue = { lat: number; lng: number; label?: string }
export type SecretValue = { set: boolean; last4?: string; rotatedAt?: string }

// --- guards: narrow untyped API values at the boundary --------------------------------------

export const isEmpty = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
export const asString = (v: unknown): string | null => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null)
export const asNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export const asRelation = (v: unknown): RelationValue | null => (isObject(v) && typeof v.id === 'string' && typeof v.label === 'string' ? (v as RelationValue) : null)
export const asRichText = (v: unknown): RichTextValue | null => (isObject(v) && typeof v.html === 'string' ? { html: v.html, text: typeof v.text === 'string' ? v.text : '' } : typeof v === 'string' ? { html: v, text: v } : null)
export const asImage = (v: unknown): ImageValue | null => (isObject(v) && typeof v.url === 'string' ? (v as ImageValue) : null)
export const asFile = (v: unknown): FileValue | null => (isObject(v) && typeof v.name === 'string' && typeof v.state === 'string' ? (v as FileValue) : null)
export const asAddress = (v: unknown): AddressValue | null => (isObject(v) && typeof v.line1 === 'string' && typeof v.city === 'string' ? (v as AddressValue) : null)
export const asLocation = (v: unknown): LocationValue | null => (isObject(v) && typeof v.lat === 'number' && typeof v.lng === 'number' ? (v as LocationValue) : null)
export const asSecret = (v: unknown): SecretValue | null => (isObject(v) && typeof v.set === 'boolean' ? (v as SecretValue) : null)
export const asStringList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function choiceLabel(field: FieldMeta, value: unknown) {
  const s = asString(value)
  return field.choices?.find(c => c.value === s)?.label ?? s
}

/** Plural form for simple sale units ("bale" -> "bales"; "kg" stays "kg"). */
export function unitLabel(unit: string | undefined, n: number) {
  if (!unit) return undefined
  if (n === 1 || unit.length <= 3 || /s$/.test(unit)) return unit
  return /(x|ch|sh)$/.test(unit) ? `${unit}es` : `${unit}s`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
