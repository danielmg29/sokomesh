import type { ActionMeta, ModelMeta, Rec, Tone } from '@/lib/contract/types'

export type ActionState = { action: ActionMeta; available: boolean; reason?: string }

/** What the backend permits (`_can`) and what the record's state allows (`when`). */
export function resolveActions(meta: ModelMeta, record: Rec, kinds: readonly ActionMeta['kind'][] = ['command', 'update', 'archive']): ActionState[] {
  const can = new Set(record._can ?? [])
  return (meta.actions ?? [])
    .filter(a => kinds.includes(a.kind) && can.has(a.name)) // not permitted: not shown; the API refuses it too
    .map(a => {
      const blocked = a.when && Object.entries(a.when).find(([field, allowed]) => !allowed.includes(String(record[field])))
      if (!blocked) return { action: a, available: true }
      const [fieldName, allowed] = blocked
      const field = meta.fields.find(f => f.name === fieldName)
      const labels = allowed.map(v => field?.choices?.find(c => c.value === v)?.label ?? v)
      return { action: a, available: false, reason: `Available when ${(field?.label ?? fieldName).toLowerCase()} is ${labels.join(' or ')}` }
    })
}

export type ButtonVariant = 'primary' | 'secondary' | 'signal' | 'danger-outline' | 'warning-outline'

export function variantForTone(tone?: Tone | 'primary'): ButtonVariant {
  switch (tone) {
    case 'primary': case 'success': return 'primary'
    case 'danger': return 'danger-outline'
    case 'warning': return 'warning-outline'
    case 'signal': return 'signal'
    default: return 'secondary'
  }
}
