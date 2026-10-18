import type { FieldMeta, ModelMeta, Rec } from '@/lib/contract/types'
import type { SlotName } from '../recipes/recipes'

export type Filled = { field: FieldMeta; value: unknown }
export type Slots = { [K in Exclude<SlotName, 'meta' | 'actions'>]?: Filled } & { meta: Filled[] }

const STRINGY = new Set(['string', 'text'])

/** Which fields fill which slots, from metadata only (manual 6.6). No field or model names. */
export function resolveSlots(meta: ModelMeta, record: Rec, wanted: readonly SlotName[], metaLimit = 4): Slots {
  const byName = new Map(meta.fields.map(f => [f.name, f]))
  const used = new Set<string>()
  const take = (f?: FieldMeta): Filled | undefined => {
    if (!f || used.has(f.name)) return undefined
    used.add(f.name)
    return { field: f, value: record[f.name] }
  }
  const listFields = meta.list.fields.map(n => byName.get(n)).filter((f): f is FieldMeta => Boolean(f))
  const out: Slots = { meta: [] }

  if (wanted.includes('title')) {
    out.title = take((meta.displayField && byName.get(meta.displayField)) || meta.fields.find(f => f.required && STRINGY.has(f.type)))
  }
  if (wanted.includes('media')) out.media = take(meta.fields.find(f => f.widget === 'image'))
  if (wanted.includes('badge')) {
    // A state the list declares; a model whose list leaves its status out (every row shares it) shows none.
    const pool = meta.list.fields.length ? listFields : meta.fields
    out.badge = take(pool.find(f => f.widget === 'status') ?? pool.find(f => f.type === 'enum' && f.choices?.some(c => c.tone)))
  }
  // The first money field the list shows: a price on a product, a total on an order. Read from the widget, so
  // no field name is involved, and taken before meta so it is not repeated there.
  if (wanted.includes('figure')) out.figure = take(listFields.find(f => f.widget === 'currency'))
  if (wanted.includes('subtitle')) {
    out.subtitle = take(meta.fields.find(f => f.role === 'subtitle') ?? listFields.find(f => STRINGY.has(f.type) && !used.has(f.name) && f.widget !== 'hidden'))
  }
  if (wanted.includes('timestamp')) {
    out.timestamp = take(meta.fields.find(f => f.widget === 'relative-time') ?? meta.fields.find(f => f.type === 'datetime' && f.readOnly))
  }
  if (wanted.includes('owner')) out.owner = take(meta.fields.find(f => f.role === 'owner'))
  if (wanted.includes('meta')) {
    out.meta = listFields
      .filter(f => !used.has(f.name) && f.widget !== 'hidden')
      .sort((a, b) => (a.weight ?? 50) - (b.weight ?? 50))
      .slice(0, metaLimit)
      .map(f => take(f))
      .filter((s): s is Filled => Boolean(s))
  }
  return out
}
