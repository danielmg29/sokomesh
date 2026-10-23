'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { Stamp } from '@/components/ui/stamp'
import { chipStyles } from '@/components/ui/chip'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import type { ModelMeta, Rec, Tone } from '@/lib/contract/types'
import type { Density } from '@/lib/design/tokens.generated'
import { Projection } from '../Projection'
import type { RunAction } from '../actions/ActionBar'
import { EmptyState } from '../feedback/EmptyState'
import { ErrorState } from '../feedback/ErrorState'
import { LoadingState } from '../feedback/LoadingState'
import { RelativeTime } from '../fields/islands'
import type { RecipeOverride } from '../recipes/recipes'

type BlockState = 'ready' | 'loading' | 'empty' | 'error'

/** Record detail through the detail recipe. Container-adaptive; works full-page or in a sheet. */
export function DetailBlock({ meta, record, surface = 'bordered', onRun, pending, now, extra, state = 'ready' }: {
  meta: ModelMeta; record?: Rec; surface?: RecipeOverride['surface']; onRun?: RunAction; pending?: string | null; now?: string; extra?: ReactNode; state?: BlockState
}) {
  if (state === 'loading' || !record) return <LoadingState variant="skeleton" shape="detail" rows={6} label={`Loading ${meta.label.toLowerCase()}`} />
  if (state === 'error') return <ErrorState code="NOT_FOUND" />
  return <Projection meta={meta} record={record} context="detail" override={{ surface }} onRun={onRun} pending={pending} now={now} extra={extra} />
}

export type Metric = {
  key: string
  label: string
  /** Pre-formatted value from the shared metric definition (money, %, count). */
  value: string
  unit?: string
  comparison?: { label: string; delta: string; direction: 'up' | 'down' | 'flat'; good: boolean }
  tone?: Tone
  note?: string
}

const noteMark: Record<Exclude<Tone, 'neutral'>, string> = {
  info: 'bg-tone-info', success: 'bg-tone-success', warning: 'bg-tone-warning', danger: 'bg-tone-danger', signal: 'bg-signal',
}

/** Metric strip: one bordered row divided into cells, not a grid of floating cards. */
/** Columns follow the metric count, so a row never ends in an empty cell. */
const statColumns = {
  1: '',
  2: '@md:grid-cols-2',
  3: '@md:grid-cols-2 @md:[&>*:last-child]:col-span-2 @xl:grid-cols-3 @xl:[&>*:last-child]:col-span-1',
  4: '@md:grid-cols-2 @3xl:grid-cols-4',
  /** Six (seller analytics): three across, two rows. */
  6: '@md:grid-cols-2 @3xl:grid-cols-3',
} as const
const columnsFor = (count: number) => count === 6 ? statColumns[6] : statColumns[Math.min(count, 4) as 1 | 2 | 3 | 4]

export function StatsBlock({ metrics, density = 'comfortable', state = 'ready', caption }: { metrics: readonly Metric[]; density?: 'comfortable' | 'spacious'; state?: BlockState; caption?: string }) {
  if (state === 'loading') return <LoadingState variant="skeleton" shape="stat" label="Loading metrics" />
  if (state === 'error') return <ErrorState code="UNAVAILABLE" size="inline" />
  if (state === 'empty' || !metrics.length) return <div className="rounded-md border border-border bg-surface"><EmptyState kind="no-data" title="No figures for this period yet" description="Metrics appear after the first confirmed order." size="inline" /></div>
  return (
    <section aria-label={caption ?? 'Key figures'} className="@container rounded-md border border-border">
      <dl className={cn('grid grid-cols-1 gap-px overflow-hidden rounded-md bg-border', columnsFor(metrics.length))}>
        {metrics.map(m => (
          <div key={m.key} className={cn('@container/stat flex flex-col gap-1.5 bg-surface', density === 'spacious' ? 'p-6' : 'p-4')}>
            <dt className="text-sm font-semibold text-muted">{m.label}</dt>
            <dd className="flex items-baseline gap-1.5">
              {/* A figure never breaks between currency and amount; it steps down a size in a narrow cell (four across
                  beside the navigation, a revenue figure such as KES 1,804,330.00 needs the smaller size). */}
              <span className={cn('font-display font-extrabold whitespace-nowrap tabular', density === 'spacious' ? 'text-2xl @xs/stat:text-3xl @md/stat:text-4xl' : 'text-2xl @xs/stat:text-3xl')}>{m.value}</span>
              {m.unit ? <span className="text-md text-muted">{m.unit}</span> : null}
            </dd>
            {m.comparison ? (
              <dd className={cn('flex items-center gap-1 text-sm font-semibold', m.comparison.direction === 'flat' ? 'text-muted' : m.comparison.good ? 'text-tone-success' : 'text-tone-danger')}>
                <Icon icon={m.comparison.direction === 'up' ? ArrowUpRight : m.comparison.direction === 'down' ? ArrowDownRight : Minus} strokeWidth={2.25} />
                {m.comparison.delta}{m.comparison.direction === 'flat' ? null : <span>{m.comparison.good ? 'better' : 'worse'}</span>} <span className="font-normal text-muted">{m.comparison.label}</span>
              </dd>
            ) : null}
            {/* A note may run to two lines in a narrow cell: the tone is a mark beside it, the words carry the meaning. */}
            {m.note ? <dd className="flex items-start gap-1.5 text-sm text-muted">{m.tone && m.tone !== 'neutral' ? <span aria-hidden className={cn('mt-1.5 size-2 shrink-0', noteMark[m.tone])} /> : null}<span className="min-w-0 text-pretty">{m.note}</span></dd> : null}
          </div>
        ))}
      </dl>
    </section>
  )
}

export type ActivityEvent = {
  id: string
  at: string
  kind: string
  title: string
  actor?: string
  detail?: ReactNode
  tone?: Tone
  /** THREAD certainty: confirmed solid, awaiting dashed, stale gapped. Never hue alone. */
  certainty?: 'confirmed' | 'awaiting' | 'stale'
  reference?: string
}

const threadStyle = {
  confirmed: 'border-solid border-primary',
  awaiting: 'border-dashed border-tone-info',
  stale: 'border-dotted border-tone-warning',
} as const

/** Timeline of events with type filtering; the connecting thread carries certainty by pattern. */
export function ActivityBlock({ events, kinds, density = 'comfortable', state = 'ready', now, title }: {
  events: readonly ActivityEvent[]; kinds?: readonly { value: string; label: string }[]; density?: 'compact' | 'comfortable'; state?: BlockState; now?: string; title?: string
}) {
  const [filter, setFilter] = useState<string[]>([])
  if (state === 'loading') return <LoadingState variant="skeleton" shape="list" rows={4} label="Loading activity" />
  if (state === 'error') return <ErrorState code="UNAVAILABLE" size="inline" />
  const shown = filter.length ? events.filter(e => filter.includes(e.kind)) : events
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={title ?? 'Activity'}>
      {title ? <h3 className="font-display text-lg font-bold">{title}</h3> : null}
      {kinds?.length ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show event types">
          {kinds.map(k => {
            const on = filter.includes(k.value)
            return (
              <button key={k.value} type="button" aria-pressed={on} onClick={() => setFilter(f => (on ? f.filter(x => x !== k.value) : [...f, k.value]))}
                className={chipStyles({ on })}>
                {k.label}
              </button>
            )
          })}
        </div>
      ) : null}
      {!shown.length || state === 'empty' ? (
        <EmptyState kind={filter.length ? 'no-results' : 'no-data'} title={filter.length ? 'No events of these types' : 'No activity yet'} size="inline" />
      ) : (
        <ol className="flex flex-col">
          {shown.map((e, i) => {
            const next = shown[i + 1]
            return (
              <li key={e.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
                <div className="flex flex-col items-center">
                  <span className={cn('mt-1.5 size-3 shrink-0 rounded-xs border-2', e.certainty === 'awaiting' ? 'border-tone-info bg-surface' : e.certainty === 'stale' ? 'border-tone-warning bg-tone-warning-bg' : 'border-primary bg-primary')} aria-hidden="true" />
                  {next ? <span className={cn('w-0 flex-1 border-l-2', threadStyle[next.certainty ?? 'confirmed'])} aria-hidden="true" /> : null}
                </div>
                <div className={cn('flex min-w-0 flex-col gap-1', density === 'compact' ? 'pb-3' : 'pb-5')}>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={cn('font-semibold', density === 'compact' && 'text-sm')}>{e.title}</span>
                    {e.certainty && e.certainty !== 'confirmed' ? <Stamp tone={e.certainty === 'awaiting' ? 'info' : 'warning'} condition={e.certainty === 'awaiting' ? 'pending' : undefined} size="sm">{e.certainty === 'awaiting' ? 'Awaiting' : 'Stale'}</Stamp> : null}
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-sm text-muted">
                    <RelativeTime iso={e.at} now={now} />
                    {e.actor ? <span>{e.actor}</span> : null}
                    {e.reference ? <code className="font-mono">{e.reference}</code> : null}
                  </div>
                  {e.detail ? <div className="text-md">{e.detail}</div> : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

/** Records related to the current one (variants, lines, members), declared in metadata. */
export function RelatedBlock({ title, meta, records, intent = 'row', density = 'compact', viewAllHref, href, onRun, now, empty, total, loading = false }: {
  title: string; meta: ModelMeta; records: readonly Rec[]; intent?: 'row' | 'card'; density?: Density; viewAllHref?: string
  /** Each record's own page. */
  href?: (r: Rec) => string
  onRun?: RunAction; now?: string; empty?: string
  /** How many there are in all, when only the first few are shown. */
  total?: number
  /** Still being read: rows are reserved rather than reported as none. */
  loading?: boolean
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-bold">{title} {loading ? null : <span className="font-sans text-md font-normal text-muted tabular">{total ?? records.length}</span>}</h3>
        {viewAllHref ? <Link href={viewAllHref as Route} className="text-md font-semibold text-primary hover:underline">View all</Link> : null}
      </div>
      {loading ? <LoadingState variant="skeleton" shape="list" rows={2} label={`Loading ${title.toLowerCase()}`} /> : records.length ? (
        <ul className={cn(intent === 'card' ? 'grid grid-cols-1 border-t border-l border-border sm:grid-cols-2' : 'flex flex-col divide-y divide-border rounded-md border border-border bg-surface')}>
          {records.map(r => (
            <li key={r.id} className={cn(intent === 'card' && 'flex border-r border-b border-border bg-surface')}>
              <Projection meta={meta} record={r} context="list" override={{ intent: intent === 'card' && meta.fields.some(f => f.widget === 'image') ? 'media' : intent, density, surface: 'flat' }} onRun={onRun} now={now} href={href?.(r)} className={intent === 'row' ? 'rounded-none' : 'w-full'} />
            </li>
          ))}
        </ul>
      ) : <div className="rounded-md border border-border bg-surface"><EmptyState kind="no-related" title={empty ?? `No ${title.toLowerCase()}`} size="inline" /></div>}
    </section>
  )
}
