'use client'

import { CircleCheck, TriangleAlert, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/cn'
import type { ActionMeta } from '@/lib/contract/types'
import { iconFor } from './icons'
import { variantForTone } from './model'

export type BulkState =
  | { phase: 'idle' }
  | { phase: 'executing'; action: string; done: number; total: number }
  | { phase: 'complete'; action: string; succeeded: number }
  | { phase: 'error'; action: string; succeeded: number; failed: { label: string; reason: string }[] }

type Props = {
  selected: number
  /** Contract limit (limits.maxBulk); selection beyond it is refused before the API is asked. */
  max: number
  noun: { one: string; other: string }
  actions: readonly ActionMeta[]
  state: BulkState
  onRun: (action: ActionMeta) => void
  onClear: () => void
  /** Consequence summary shown before a confirmed bulk action runs. */
  impact?: (action: ActionMeta) => ReactNode
}

/** Bounded selection bar: hidden → active → executing → complete or error. */
export function BulkActions({ selected, max, noun, actions, state, onRun, onClear, impact }: Props) {
  const [confirming, setConfirming] = useState<ActionMeta | null>(null)
  const label = (n: number) => `${n.toLocaleString('en-KE')} ${n === 1 ? noun.one : noun.other}`
  if (state.phase === 'idle' && selected === 0) return null
  const over = selected > max
  const actionLabel = (name: string) => actions.find(a => a.name === name)?.label ?? name

  return (
    <div role="region" aria-label="Bulk actions" className="on-chrome flex flex-col gap-2 rounded-md border border-chrome bg-chrome px-3 py-2.5 text-chrome-foreground">
      {state.phase === 'idle' ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-semibold tabular" aria-live="polite">{label(selected)} selected</span>
          {over ? <span className="flex items-center gap-1.5 text-sm font-semibold text-chrome-foreground"><Icon icon={TriangleAlert} />Select {max} or fewer at a time</span> : null}
          <div className="ml-auto flex flex-wrap gap-2">
            {actions.map(a => (
              <Button
                key={a.name}
                size="sm"
                variant={variantForTone(a.tone) === 'danger-outline' ? 'danger' : 'secondary'}
                leadingIcon={iconFor(a.icon)}
                disabled={over}
                onClick={() => (a.confirm ? setConfirming(a) : onRun(a))}
              >
                {a.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="text-chrome-foreground hover:bg-chrome-foreground/10" leadingIcon={X} onClick={onClear}>Clear</Button>
          </div>
        </div>
      ) : null}
      {state.phase === 'executing' ? (
        <div className="flex flex-col gap-1.5" role="status">
          <span className="text-sm font-semibold tabular">{actionLabel(state.action)}: {state.done} of {state.total} done</span>
          <Progress value={state.done} max={state.total} label={`${actionLabel(state.action)} progress`} className="bg-chrome-foreground/20" />
        </div>
      ) : null}
      {state.phase === 'complete' ? (
        <div className="flex flex-wrap items-center gap-3" role="status">
          <Icon icon={CircleCheck} />
          <span className="font-semibold">{actionLabel(state.action)}: {label(state.succeeded)} done</span>
          <Button size="sm" variant="ghost" className="ml-auto text-chrome-foreground hover:bg-chrome-foreground/10" onClick={onClear}>Done</Button>
        </div>
      ) : null}
      {state.phase === 'error' ? (
        <div className="flex flex-col gap-2" role="alert">
          <span className="flex items-center gap-2 font-semibold"><Icon icon={TriangleAlert} />{label(state.succeeded)} done, {state.failed.length} not changed</span>
          <ul className={cn('flex flex-col gap-1 rounded-sm bg-surface p-2 text-sm text-foreground')}>
            {state.failed.map(f => <li key={f.label}><b className="font-semibold">{f.label}</b> · {f.reason}</li>)}
          </ul>
          <Button size="sm" variant="secondary" className="self-start" onClick={onClear}>Close</Button>
        </div>
      ) : null}
      {confirming ? (
        <AlertDialog
          open
          onOpenChange={o => { if (!o) setConfirming(null) }}
          title={`${confirming.label} ${label(selected)}?`}
          description={impact?.(confirming) ?? 'Each record is checked again by the server before it changes.'}
          confirmLabel={`${confirming.label} ${label(selected)}`}
          tone={confirming.tone === 'danger' ? 'destructive' : 'standard'}
          onConfirm={() => { onRun(confirming); setConfirming(null) }}
        />
      ) : null}
    </div>
  )
}
