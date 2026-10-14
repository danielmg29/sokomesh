import { ArrowRight, TriangleAlert } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { cn } from '@/lib/cn'
import { rendererFor } from './registry'
import type { DiffProps, DiffState, ViewProps } from './types'

/** Read context for any field. Widget decides the renderer; context decides its density. */
export function FieldView({ field, value, context = 'comfortable', now }: ViewProps) {
  const renderer = rendererFor(field.widget)
  if (!renderer) {
    return <Stamp tone="warning" size="sm" detail={field.widget}>Unsupported widget</Stamp>
  }
  return <>{renderer.view({ field, value, context, now })}</>
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** Diff context: unchanged, changed (before → after) or conflict (yours vs the saved version). */
export function FieldDiff({ field, before, after, theirs, state }: DiffProps) {
  const resolved: DiffState = state ?? (theirs !== undefined && !same(theirs, after) ? 'conflict' : same(before, after) ? 'unchanged' : 'changed')
  if (resolved === 'unchanged') {
    return <FieldView field={field} value={after} />
  }
  if (resolved === 'changed') {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <del className="text-muted decoration-tone-danger/60"><span className="sr-only">Was </span><FieldView field={field} value={before} /></del>
        <Icon icon={ArrowRight} className="text-muted" />
        <ins className="rounded-xs bg-signal-soft px-1 no-underline"><span className="sr-only">Now </span><FieldView field={field} value={after} /></ins>
      </span>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-2 rounded-sm border border-tone-warning bg-tone-warning-bg/50 p-2 sm:grid-cols-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-tone-warning sm:col-span-2"><Icon icon={TriangleAlert} />Changed by someone else while you were editing</p>
      <div className={cn('flex flex-col gap-1 rounded-xs bg-surface p-2')}>
        <span className="caps text-muted">Your change</span>
        <FieldView field={field} value={after} />
      </div>
      <div className="flex flex-col gap-1 rounded-xs bg-surface p-2">
        <span className="caps text-muted">Saved version</span>
        <FieldView field={field} value={theirs} />
      </div>
    </div>
  )
}
