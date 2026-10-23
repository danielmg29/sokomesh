// A record's name for headings, dialogs and accessible labels: its `displayField`, which may be a relation
// ({ id, label }) as well as text, or the model's label when the record has none.

import type { ModelMeta, Rec } from './types'

export function displayOf(meta: ModelMeta, record: Rec): string {
  const value = record[meta.displayField ?? 'id']
  if (value && typeof value === 'object' && 'label' in value) return String((value as { label: unknown }).label)
  return value === undefined || value === null || value === '' ? meta.label : String(value)
}
