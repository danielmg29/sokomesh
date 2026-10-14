import type { ReactNode } from 'react'
import { Stamp } from '@/components/ui/stamp'
import { Empty } from '../fields/views'
import type { Choice, FieldMeta } from '@/lib/contract/types'

type Props =
  | { field: FieldMeta; value: unknown; choice?: never; detail?: ReactNode; size?: 'sm' | 'md'; presentation?: 'stamp' | 'dot'; fresh?: boolean }
  | { choice: Choice; field?: never; value?: never; detail?: ReactNode; size?: 'sm' | 'md'; presentation?: 'stamp' | 'dot'; fresh?: boolean }

/**
 * StatusBadge: label and tone come from the contract's choice metadata; the label is always
 * visible and every tone carries a mark. Unknown values render neutral rather than vanish.
 */
export function StatusBadge({ field, value, choice, detail, size = 'md', presentation = 'stamp', fresh }: Props) {
  const resolved: Choice | undefined = choice ?? field?.choices?.find(c => c.value === value)
  if (!resolved) {
    if (value === null || value === undefined || value === '') return <Empty label="No status" />
    return <Stamp tone="neutral" condition="unknown" size={size} presentation={presentation}>{String(value)}</Stamp>
  }
  return (
    <Stamp tone={resolved.tone ?? 'neutral'} condition={resolved.mark} detail={detail} size={size} presentation={presentation} fresh={fresh}>
      {resolved.label}
    </Stamp>
  )
}
