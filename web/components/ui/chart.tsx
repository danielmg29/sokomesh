'use client'

import { useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { Segmented } from './choice'
import { TBody, THead, Table, Td, Th, Tr } from './table'

export type ColumnDatum = { key: string; label: string; value: number; display: string }

function niceMax(max: number) {
  if (max <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 2.5, 5, 10].find(s => s * exp >= max / 4)! * exp
  return Math.ceil(max / step) * step
}

/**
 * Where a floating label anchors so it stays inside the plot: from the column's start near the
 * left edge, its end near the right edge, its centre elsewhere.
 */
function anchorFor(index: number, count: number) {
  const centre = ((index + 0.5) / count) * 100
  const align = centre < 30 ? 'start' : centre > 70 ? 'end' : 'centre'
  return {
    style: align === 'start' ? { left: `${(index / count) * 100}%` } : align === 'end' ? { right: `${((count - index - 1) / count) * 100}%` } : { left: `${centre}%` },
    className: align === 'centre' ? '-translate-x-1/2' : '',
  }
}

/**
 * Single-series column chart (dataviz mark spec): columns at most 24px, 4px rounded data-end,
 * square baseline, 2px surface gap, hairline grid, the peak labelled, every value in the
 * tooltip and in the table view. One keyboard stop; arrow keys move between columns.
 * Everything it draws stays inside its own box: the axis column is sized by its widest label,
 * and headroom above the plot holds the top tick and the peak label.
 */
export function ColumnChart({ data, title, valueLabel, formatTick, height = 200, categoryLabel = 'Day', emptyLabel = 'Nothing recorded in this range' }: {
  data: readonly ColumnDatum[]; title: string; valueLabel: string; formatTick: (n: number) => string; height?: number; categoryLabel?: string; emptyLabel?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const max = niceMax(Math.max(...data.map(d => d.value), 0))
  // With nothing above zero there is no scale to show: only the baseline, and a sentence.
  const empty = data.every(d => d.value <= 0)
  const ticks = empty ? [0] : [0, 0.25, 0.5, 0.75, 1].map(f => f * max)
  const tickLabels = ticks.map(formatTick)
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0)
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setActive(a => Math.min(data.length - 1, (a ?? -1) + 1)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setActive(a => Math.max(0, (a ?? data.length) - 1)) }
    if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    if (e.key === 'End') { e.preventDefault(); setActive(data.length - 1) }
    if (e.key === 'Escape') setActive(null)
  }
  const current = active === null ? null : data[active]
  const pct = (v: number) => `${(v / max) * 100}%`
  const peakAnchor = anchorFor(peak, data.length)
  const tipAnchor = active === null ? null : anchorFor(active, data.length)
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="font-sans text-md font-semibold">{title}</figcaption>
        <Segmented label="Chart or table" size="sm" value={view} onValueChange={setView} items={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]} />
      </div>
      {view === 'table' ? (
        <div className="max-h-72 overflow-auto rounded-sm border border-border" data-density="compact">
          <Table caption={title}><THead sticky><tr><Th>{categoryLabel}</Th><Th numeric>{valueLabel}</Th></tr></THead>
            <TBody>{data.map(d => <Tr key={d.key}><Td>{d.label}</Td><Td numeric>{d.display}</Td></Tr>)}</TBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 pt-6">
          <div className="relative text-right text-xs text-muted tabular" style={{ height }} aria-hidden="true">
            {/* In-flow sizer: the widest tick label sets the axis width. */}
            <span className="invisible flex h-0 flex-col overflow-hidden whitespace-nowrap">{tickLabels.map((l, i) => <span key={i}>{l}</span>)}</span>
            {ticks.map((t, i) => <span key={t} className="absolute right-0 translate-y-1/2 whitespace-nowrap" style={{ bottom: pct(t) }}>{tickLabels[i]}</span>)}
          </div>
          <div
            role="group"
            tabIndex={0}
            aria-label={`${title}. ${data.length} ${categoryLabel.toLowerCase()}s. Use the arrow keys to read each one.`}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className="relative min-w-0 rounded-xs"
            style={{ height }}
          >
            {ticks.map(t => <span key={t} aria-hidden="true" className="absolute inset-x-0 h-px bg-border" style={{ bottom: pct(t) }} />)}
            <div className="absolute inset-0 flex items-end justify-between gap-0.5">
              {data.map((d, i) => (
                <div key={d.key} className="flex h-full min-w-0 flex-1 items-end justify-center" onPointerEnter={() => setActive(i)}>
                  <span
                    aria-hidden="true"
                    className={cn('block w-full max-w-6 rounded-t-sm motion-bind transition-colors', i === active ? 'bg-primary-hover' : 'bg-primary', active !== null && i !== active && 'bg-primary/70')}
                    style={{ height: pct(d.value), minHeight: d.value > 0 ? 2 : 0 }}
                  />
                </div>
              ))}
            </div>
            {empty ? <span className="absolute inset-0 grid place-items-center text-sm text-muted">{emptyLabel}</span> : null}
            {active === null && !empty && data.length ? (
              <span aria-hidden="true" className={cn('absolute mb-1 text-xs font-semibold whitespace-nowrap tabular', peakAnchor.className)} style={{ ...peakAnchor.style, bottom: pct(data[peak]!.value) }}>
                {data[peak]!.display}
              </span>
            ) : null}
            {current && tipAnchor ? (
              <div role="status" className={cn('pointer-events-none absolute top-0 z-10 rounded-xs border border-border-strong bg-surface px-2.5 py-1.5 whitespace-nowrap shadow-overlay', tipAnchor.className)} style={tipAnchor.style}>
                <span className="block font-semibold tabular">{current.display}</span>
                <span className="block text-xs text-muted">{current.label}</span>
              </div>
            ) : null}
          </div>
          <span />
          <div className="mt-1.5 flex justify-between gap-2 text-xs text-muted" aria-hidden="true">
            <span className="truncate">{data[0]?.label}</span><span className="truncate">{data.at(-1)?.label}</span>
          </div>
        </div>
      )}
    </figure>
  )
}
