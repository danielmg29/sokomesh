'use client'

// Specimen kit for the design-system page: labelled plates divided by hairlines (not cards),
// and a demo action runner that behaves like the API (pending, then a named outcome).

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useToast } from '@/components/ui/toast'
import type { ActionMeta, Rec } from '@/lib/contract/types'
import { cn } from '@/lib/cn'

export function Plates({ children, cols = 2, className }: { children: ReactNode; cols?: 1 | 2 | 3 | 4 | 5; className?: string }) {
  return (
    <div className={cn(
      'grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border',
      cols === 2 && '@2xl:grid-cols-2', cols === 3 && '@2xl:grid-cols-2 @5xl:grid-cols-3', cols === 4 && '@xl:grid-cols-2 @4xl:grid-cols-4', cols === 5 && '@xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-5',
      className,
    )}>
      {children}
    </div>
  )
}

/** One labelled specimen. `span` takes the full row of its Plates grid. */
export function Plate({ label, note, children, span, tone = 'surface', className }: { label: string; note?: ReactNode; children: ReactNode; span?: boolean; tone?: 'surface' | 'canvas'; className?: string }) {
  return (
    <figure className={cn('flex min-w-0 flex-col gap-3 p-4', tone === 'surface' ? 'bg-surface' : 'bg-background', span && 'col-span-full', className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="caps text-muted">{label}</span>
        {note ? <span className="text-sm text-muted">{note}</span> : null}
      </figcaption>
      <div className="min-w-0">{children}</div>
    </figure>
  )
}

/** Behaves like a command call: pending for a moment, then a toast naming the outcome. */
export function useDemoRun() {
  const toast = useToast()
  const [pending, setPending] = useState<string | null>(null)
  const run = async (action: ActionMeta, record: Rec) => {
    setPending(action.name)
    await new Promise(r => setTimeout(r, 900))
    setPending(null)
    toast({ tone: 'success', title: `${action.label}: ${String(record.name ?? record.order_number ?? record.id)}`, description: 'Demo: no request was sent.' })
  }
  return { run, pending }
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="max-w-[68ch] text-md text-muted">{children}</p>
}

/** Opens and scrolls to another inventory row in place; the ledger provides it. */
export const JumpContext = createContext<(code: string) => void>(() => {})
export const useJump = () => useContext(JumpContext)
