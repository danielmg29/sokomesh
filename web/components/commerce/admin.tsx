'use client'

import { Download, KeyRound, Webhook } from 'lucide-react'
import { useState } from 'react'
import { StatsBlock, type Metric } from '@/components/kernel/blocks/DataBlocks'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { asStringList } from '@/components/kernel/fields/types'
import { FieldInput } from '@/components/kernel/fields/FieldInput'
import { RelativeTime } from '@/components/kernel/fields/islands'
import { Button, buttonStyles } from '@/components/ui/button'
import { chipStyles } from '@/components/ui/chip'
import { ColumnChart, type ColumnDatum } from '@/components/ui/chart'
import { Segmented } from '@/components/ui/choice'
import { AlertDialog } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/disclosure'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { ScrollArea, TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { FacetChips, TablePager, TableSearch, TableToolbar } from '@/components/ui/table-controls'
import { useTableQuery } from '@/lib/client/use-table-query'
import { cn } from '@/lib/cn'
import type { FieldMeta, Tone } from '@/lib/contract/types'
import { formatDate } from '@/lib/format'
import { formatMoney } from '@/lib/money'
import type { Accessors } from '@/lib/query'

export type AnalyticsRange = '7d' | '30d' | '90d'
export type AnalyticsPeriod = { metrics: Metric[]; daily: ColumnDatum[]; topProducts: { rank: number; product: string; units: string; revenue: string }[] }

type TopProduct = AnalyticsPeriod['topProducts'][number]

/** The sale unit of a units figure ("1,284 bales" is sold by the bale), used as the facet. */
const soldBy = (t: TopProduct) => t.units.replace(/^[\d,.\s]+/, '').trim()
const topAccess: Accessors<TopProduct> = {
  text: t => [t.product, t.units],
  value: (t, key) => (key === 'unit' ? soldBy(t) : t[key as keyof TopProduct]),
}

/** Ranked products for the period, searchable by name and narrowed by the unit they sell in. */
function TopProducts({ rows }: { rows: readonly TopProduct[] }) {
  const t = useTableQuery(rows, topAccess, { pageSize: 10 })
  const counts = t.counts('unit')
  const units = [...new Set(rows.map(soldBy))].filter(Boolean).sort()
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-surface" data-density="compact">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
        <span className="font-sans text-md font-semibold">Top products</span>
        <TableToolbar active={t.active} onClear={t.clear}
          search={<TableSearch label="Search top products" placeholder="Product…" value={t.query.q} onChange={t.setSearch} className="sm:max-w-none" />}
          facets={units.length > 1 ? <FacetChips label="Sold by" options={units.map(u => ({ value: u, label: u, count: counts[u] ?? 0 }))} value={asStringList(t.query.filters.unit?.value)}
            onChange={next => t.setFilter('unit', next.length ? { op: 'in', value: next } : undefined)} /> : undefined} />
      </div>
      {t.result.total === 0 ? (
        <EmptyState kind="no-results" title="No products match" description="Try another name or remove the unit filter." action={<Button variant="secondary" onClick={t.clear}>Clear search and filters</Button>} />
      ) : (
        <ScrollArea label="Top products">
          <Table caption="Top products by revenue">
            <THead><tr><Th>#</Th><Th>Product</Th><Th numeric>Units</Th><Th numeric>Revenue</Th></tr></THead>
            <TBody>{t.result.rows.map(r => <Tr key={r.rank}><Td className="text-muted tabular">{r.rank}</Td><Td className="font-medium">{r.product}</Td><Td numeric className="whitespace-nowrap">{r.units}</Td><Td numeric className="font-semibold whitespace-nowrap">{formatMoney(r.revenue)}</Td></Tr>)}</TBody>
          </Table>
        </ScrollArea>
      )}
      <TablePager result={t.result} onPage={t.setPage} onPageSize={t.setPageSize} noun={{ one: 'product', other: 'products' }} unfiltered={rows.length} className="mt-auto border-t border-border" />
    </div>
  )
}

const EMPTY_PERIOD: AnalyticsPeriod = { metrics: [], daily: [], topProducts: [] }

/**
 * Seller dashboard (SM-F-19): cards, chart and export reconcile to one shared metric definition. Pass
 * `range` and `onRange` to fetch one period at a time (the page keeps it in the URL); `exportHref` is the
 * CSV of the same query, and `note` says what the figures count.
 */
export function SellerAnalyticsGrid({ periods, definitionVersion, state = 'ready', range: controlled, onRange, exportHref, note }: {
  periods: Partial<Record<AnalyticsRange, AnalyticsPeriod>>; definitionVersion: string; state?: 'ready' | 'loading' | 'empty' | 'error'
  range?: AnalyticsRange; onRange?: (range: AnalyticsRange) => void; exportHref?: string; note?: string
}) {
  const [own, setOwn] = useState<AnalyticsRange>('30d')
  const range = controlled ?? own
  const setRange = (r: AnalyticsRange) => { setOwn(r); onRange?.(r) }
  const p = periods[range] ?? EMPTY_PERIOD
  const tick = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Seller analytics">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Period" value={range} onValueChange={setRange} items={[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }]} />
        {exportHref ? <a href={exportHref} download className={buttonStyles({ size: 'sm', variant: 'secondary' })}><Icon icon={Download} />Export CSV</a> : <Button size="sm" variant="secondary" leadingIcon={Download}>Export CSV</Button>}
      </div>
      <StatsBlock metrics={p.metrics} state={state} caption={`Key figures, last ${range.replace('d', ' days')}`} />
      {state === 'ready' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="rounded-md border border-border bg-surface p-4">
            <ColumnChart data={p.daily} title="Confirmed revenue per day (KES)" valueLabel="Revenue (KES)" formatTick={tick} />
          </div>
          <TopProducts rows={p.topProducts} />
        </div>
      ) : null}
      {state !== 'loading' ? <p className="text-sm text-muted">Figures use metric definitions <code className="font-mono">{definitionVersion}</code>: {note ?? 'confirmed orders only, net of cancellations, in East Africa Time.'}</p> : null}
    </section>
  )
}

export type ApiToken = { id: string; name: string; scopes: string[]; last4: string; createdAt: string; lastUsedAt?: string; status: 'active' | 'revoked' }
export type WebhookEndpoint = { id: string; url: string; events: string[]; active: boolean; lastDelivery?: { status: 'queued' | 'delivered' | 'retrying' | 'failed'; at: string; attempts: number; code?: number } }

const deliveryLook: Record<NonNullable<WebhookEndpoint['lastDelivery']>['status'], { tone: Tone; label: string }> = {
  queued: { tone: 'neutral', label: 'Queued' }, delivered: { tone: 'success', label: 'Delivered' }, retrying: { tone: 'warning', label: 'Retrying' }, failed: { tone: 'danger', label: 'Failed' },
}

const endpointField: FieldMeta = { name: 'url', type: 'string', widget: 'url', label: 'Endpoint URL', required: true, help: 'Must be HTTPS. Each delivery is signed; verify the signature before trusting it.' }

/** Scoped integration clients (SM-F-23): tokens and signed webhooks, revocable and tenant-scoped. */
export function IntegrationPanel({ tokens, webhooks, now }: { tokens: readonly ApiToken[]; webhooks: readonly WebhookEndpoint[]; now?: string }) {
  const [confirm, setConfirm] = useState<{ kind: 'rotate' | 'revoke'; token: ApiToken } | null>(null)
  const [url, setUrl] = useState('')
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-surface p-4" aria-label="Integrations">
      <h3 className="font-display text-lg font-bold">Integrations</h3>
      <Tabs defaultValue="tokens">
        <TabsList><TabsTrigger value="tokens" count={tokens.length}><Icon icon={KeyRound} />API tokens</TabsTrigger><TabsTrigger value="webhooks" count={webhooks.length}><Icon icon={Webhook} />Webhooks</TabsTrigger></TabsList>
        <TabsContent value="tokens">
          <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
            {tokens.map(t => (
              <li key={t.id} className={cn('grid grid-cols-1 gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center', t.status === 'revoked' && 'bg-sunken/60')}>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{t.name}</span><Stamp tone={t.status === 'active' ? 'success' : 'neutral'} size="sm">{t.status === 'active' ? 'Active' : 'Revoked'}</Stamp></div>
                  <span className="flex flex-col text-sm text-muted"><span><code className="font-mono">smk_live_••••{t.last4}</code>, {t.scopes.join(', ')}</span><span>Created {formatDate(t.createdAt)}, {t.lastUsedAt ? <>last used <RelativeTime iso={t.lastUsedAt} now={now} /></> : 'never used'}</span></span>
                </div>
                {t.status === 'active' ? (
                  <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'rotate', token: t })}>Rotate</Button><Button size="sm" variant="danger-outline" onClick={() => setConfirm({ kind: 'revoke', token: t })}>Revoke</Button></div>
                ) : null}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="webhooks" className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
            {webhooks.map(w => (
              <li key={w.id} className="flex flex-col gap-1.5 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="min-w-0 truncate font-mono text-sm">{w.url}</code>
                  {w.lastDelivery ? <Stamp tone={deliveryLook[w.lastDelivery.status].tone} size="sm" detail={w.lastDelivery.attempts > 1 ? `attempt ${w.lastDelivery.attempts}` : undefined}>{deliveryLook[w.lastDelivery.status].label}</Stamp> : <Stamp tone="neutral" size="sm">No deliveries</Stamp>}
                </div>
                <span className="flex flex-col text-sm text-muted">
                  <span>{w.events.join(', ')}{w.active ? '' : ' (paused)'}</span>
                  {w.lastDelivery ? <span>Last delivery <RelativeTime iso={w.lastDelivery.at} now={now} />{w.lastDelivery.code ? `, HTTP ${w.lastDelivery.code}` : ''}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <form className="flex flex-col gap-2" onSubmit={e => e.preventDefault()}>
            <FieldInput field={endpointField} value={url} onChange={v => setUrl(String(v ?? ''))} />
            <Button type="submit" variant="primary" className="self-start">Add endpoint</Button>
          </form>
        </TabsContent>
      </Tabs>
      {confirm ? (
        <AlertDialog open onOpenChange={o => { if (!o) setConfirm(null) }} tone={confirm.kind === 'revoke' ? 'destructive' : 'standard'}
          title={confirm.kind === 'revoke' ? `Revoke "${confirm.token.name}"?` : `Rotate "${confirm.token.name}"?`}
          description={confirm.kind === 'revoke' ? 'Requests using this token are refused immediately. This cannot be undone.' : 'A new token is shown once. The old one keeps working for 24 hours so you can switch over.'}
          confirmLabel={confirm.kind === 'revoke' ? 'Revoke token' : 'Rotate token'} onConfirm={() => setConfirm(null)} />
      ) : null}
    </section>
  )
}

export type TraceEvent = { id: string; at: string; domain: 'catalog' | 'price' | 'inventory' | 'payment' | 'order'; event: string; summary: string; requestId: string; eventId: string; actor: string }

const domainLabel: Record<TraceEvent['domain'], string> = { catalog: 'Catalogue', price: 'Price', inventory: 'Inventory', payment: 'Payment', order: 'Order' }

/** Marketplace-admin support trace (SM-F-24): reconstruct a case across request and event IDs. */
export function ReconciliationTraceBlock({ correlationId, events, now }: { correlationId: string; events: readonly TraceEvent[]; now?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const [domains, setDomains] = useState<TraceEvent['domain'][]>([])
  const shown = domains.length ? events.filter(e => domains.includes(e.domain)) : events
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={`Trace ${correlationId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col"><h3 className="font-display text-lg font-bold">Trace</h3><span className="text-sm text-muted">Correlation <code className="font-mono">{correlationId}</code> · {events.length} events</span></div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Domains">
          {(Object.keys(domainLabel) as TraceEvent['domain'][]).map(d => {
            const on = domains.includes(d)
            return <button key={d} type="button" aria-pressed={on} onClick={() => setDomains(s => (on ? s.filter(x => x !== d) : [...s, d]))} className={chipStyles({ on })}>{domainLabel[d]}</button>
          })}
        </div>
      </div>
      <ol className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {shown.map(e => (
          <li key={e.id}>
            <button type="button" aria-expanded={open === e.id} onClick={() => setOpen(o => (o === e.id ? null : e.id))} className="grid w-full grid-cols-[6.5rem_6rem_minmax(0,1fr)] items-baseline gap-3 px-3 py-2.5 text-left hover:bg-sunken/60">
              <span className="text-sm text-muted"><RelativeTime iso={e.at} now={now} /></span>
              <span className="caps text-muted">{domainLabel[e.domain]}</span>
              <span className="min-w-0"><code className="mr-2 font-mono text-sm">{e.event}</code><span className="text-md">{e.summary}</span></span>
            </button>
            {open === e.id ? (
              <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-border bg-sunken/50 px-3 py-2.5 text-sm animate-reveal">
                <dt className="text-muted">Request</dt><dd><code className="font-mono">{e.requestId}</code></dd>
                <dt className="text-muted">Event</dt><dd><code className="font-mono">{e.eventId}</code></dd>
                <dt className="text-muted">Actor</dt><dd>{e.actor}</dd>
              </dl>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
