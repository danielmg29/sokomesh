import { Check, Clock, OctagonX, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './icon'

export type ThreadStepState = 'done' | 'current' | 'upcoming' | 'failed' | 'stale' | 'skipped'
export type ThreadStep = { key: string; label: ReactNode; detail?: ReactNode; state: ThreadStepState }

const node: Record<ThreadStepState, string> = {
  done: 'border-primary bg-primary text-primary-foreground',
  current: 'border-signal-border bg-signal text-signal-foreground',
  upcoming: 'border-border-strong bg-surface text-muted',
  failed: 'border-tone-danger bg-tone-danger-bg text-tone-danger',
  stale: 'border-tone-warning bg-tone-warning-bg text-tone-warning',
  skipped: 'border-border bg-sunken text-muted',
}

const mark = { done: Check, current: Clock, failed: OctagonX, stale: TriangleAlert } as const

/** Connector to the next step: solid once passed, dashed while awaiting, dotted when stale. */
const link = (next: ThreadStepState) =>
  next === 'done' || next === 'current' ? 'border-solid border-primary'
  : next === 'stale' ? 'border-dotted border-tone-warning'
  : next === 'failed' ? 'border-dashed border-tone-danger'
  : 'border-dashed border-border-strong'

const stateText: Record<ThreadStepState, string> = { done: 'done', current: 'in progress', upcoming: 'not started', failed: 'failed', stale: 'no recent update', skipped: 'skipped' }

/** THREAD: a commercial process as connected states. State reads from mark and pattern, not hue alone. */
export function Thread({ steps, orientation = 'horizontal', label, className }: { steps: readonly ThreadStep[]; orientation?: 'horizontal' | 'vertical'; label: string; className?: string }) {
  const horizontal = orientation === 'horizontal'
  return (
    <ol aria-label={label} className={cn(horizontal ? 'flex items-start' : 'flex flex-col', className)}>
      {steps.map((s, i) => {
        const next = steps[i + 1]
        const M = s.state in mark ? mark[s.state as keyof typeof mark] : null
        return (
          <li key={s.key} aria-current={s.state === 'current' ? 'step' : undefined} className={cn(horizontal ? 'flex min-w-0 flex-1 flex-col last:flex-none' : 'grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3')}>
            <div className={cn(horizontal ? 'flex items-center' : 'flex flex-col items-center')}>
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-xs border-[length:var(--border-stamp)] text-xs font-semibold tabular', node[s.state], s.state === 'current' && 'animate-stamp')}>
                {M ? <Icon icon={M} strokeWidth={2.5} className="size-3.5" /> : i + 1}
              </span>
              {next ? <span aria-hidden="true" className={cn(horizontal ? 'mx-2 h-0 flex-1 border-t-2' : 'my-1 w-0 flex-1 border-l-2 min-h-6', link(next.state), next.state === 'current' && 'animate-thread')} /> : null}
            </div>
            <div className={cn('flex min-w-0 flex-col', horizontal ? 'pt-2 pr-3' : 'pb-4')}>
              <span className={cn('text-sm font-semibold', s.state === 'upcoming' || s.state === 'skipped' ? 'text-muted' : 'text-foreground')}>
                {s.label}<span className="sr-only">, {stateText[s.state]}</span>
              </span>
              {s.detail ? <span className="text-sm text-muted">{s.detail}</span> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
