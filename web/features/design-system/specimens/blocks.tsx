'use client'

import { Plus } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { ChatBlock, type ChatMessage } from '@/components/kernel/blocks/ChatBlock'
import { ActivityBlock, DetailBlock, RelatedBlock, StatsBlock, type ActivityEvent, type Metric } from '@/components/kernel/blocks/DataBlocks'
import { FiltersBlock, type FilterValues } from '@/components/kernel/blocks/FiltersBlock'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock, type ListState, type NarrowStrategy } from '@/components/kernel/blocks/ListBlock'
import { PageBlocks } from '@/components/kernel/blocks/PageBlocks'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/choice'
import { Stamp } from '@/components/ui/stamp'
import { demoListSource } from '../demo-list'
import { DEMO_NOW, buyers, orderHistory, orderMeta, orders, people, productMeta, products } from '../fixtures'
import { Plate, Plates, useDemoRun } from '../kit'

function Headers() {
  return (
    <Plates cols={1}>
      <Plate label="source=meta · with actions"><HeaderBlock source="meta" meta={orderMeta} count={27} breadcrumbs={[{ label: 'Mwangaza', href: '#' }, { label: 'Orders' }]} description="Orders from your buyers, newest first." actions={<Button variant="primary" leadingIcon={Plus}>New order</Button>} /></Plate>
      <Plate label="source=record · status from contract"><HeaderBlock source="record" meta={orderMeta} record={orders[2]!} breadcrumbs={[{ label: 'Orders', href: '#' }, { label: 'SM-ORD-004198' }]} actions={<Button variant="secondary">Print delivery note</Button>} /></Plate>
      <Plate label="source=explicit · compact"><HeaderBlock source="explicit" title="Purchase approvals" variant="compact" status={<Stamp tone="info" condition="pending">2 waiting</Stamp>} /></Plate>
    </Plates>
  )
}

function Filters() {
  const [values, setValues] = useState<FilterValues>({ stock_status: { op: 'in', value: ['available', 'low'] }, unit_price: { op: 'range', value: { min: '1500', max: '5000' } } })
  const [q, setQ] = useState('')
  const counts = { stock_status: { available: 128, low: 21, reserved: 6, out_of_stock: 9 }, category: { flour_grains: 64, sugar: 18, oils: 22, beverages: 15, household: 31, dairy: 0 } }
  return (
    <Plates cols={2}>
      <Plate label="layout=expanded (sidebar), active, counts"><FiltersBlock meta={productMeta} values={values} onChange={setValues} search={q} onSearchChange={setQ} counts={counts} /></Plate>
      <Plate label="layout=collapsed · chips"><FiltersBlock meta={productMeta} values={values} onChange={setValues} search={q} onSearchChange={setQ} layout="collapsed" counts={counts} /></Plate>
      <Plate label="layout=sheet (narrow)"><FiltersBlock meta={productMeta} values={values} onChange={setValues} search={q} onSearchChange={setQ} layout="sheet" counts={counts} /></Plate>
      <Plate label="cleared"><FiltersBlock meta={productMeta} values={{}} onChange={() => undefined} layout="collapsed" /></Plate>
    </Plates>
  )
}

const buyerOptions = Object.values(buyers).map(b => ({ value: b.id, label: b.label }))

/** The same table against a stand-in endpoint, with the parameters of the last request shown under it. */
function ServerList() {
  const [sent, setSent] = useState('')
  const source = useMemo(() => {
    const answer = demoListSource(orderMeta, orderHistory)
    return (params: URLSearchParams, signal: AbortSignal) => answer(params, signal).then(page => { setSent(params.toString()); return page })
  }, [])
  return (
    <div className="flex flex-col gap-2">
      <ListBlock meta={orderMeta} records={[]} query="server" source={source} filterOptions={{ buyer: buyerOptions }} density="compact" narrow="priority" href={() => '#order'} now={DEMO_NOW} />
      <p className="text-sm text-muted"><span className="caps mr-2">Parameters sent</span><code className="font-mono text-xs break-all text-foreground">{sent ? `?${sent}` : 'none yet'}</code></p>
    </div>
  )
}

function Lists() {
  const { run } = useDemoRun()
  const [state, setState] = useState<ListState>('ready')
  const [narrow, setNarrow] = useState<NarrowStrategy>('priority')
  const [selected, setSelected] = useState<string[]>(['o-4209'])
  const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'submitted_at', dir: 'desc' })
  return (
    <Plates cols={1}>
      <Plate label="intent=row (table) · state and narrow strategy">
        <div className="mb-3 flex flex-wrap gap-3">
          <Segmented label="State" size="sm" value={state} onValueChange={setState} items={(['ready', 'loading', 'empty', 'error', 'stale'] as const).map(v => ({ value: v, label: v }))} />
          <Segmented label="Narrow strategy" size="sm" value={narrow} onValueChange={setNarrow} items={(['scroll', 'collapse', 'priority'] as const).map(v => ({ value: v, label: v }))} />
        </div>
        <ListBlock meta={orderMeta} records={orderHistory} state={state} narrow={narrow} density="compact" selectable selected={selected} onSelectedChange={setSelected} onRun={run} href={() => '#order'}
          sort={sort} onSortChange={setSort} hasMore onRetry={() => setState('ready')} onRefresh={() => setState('ready')} staleSince="Last updated 9 min ago." now={DEMO_NOW}
          live={state === 'ready' ? { changed: 2, onApply: () => undefined } : undefined}
          empty={{ kind: 'no-results', title: 'No orders match', description: 'Clear the status filter to see all 27 orders.' }} />
      </Plate>
      <Plate label="query=server · stand-in endpoint, 450 ms" note="contract list parameters, keyset pages, previous and next only"><ServerList /></Plate>
      <Plate label="intent=card (MARKET media grid)" tone="canvas">
        <div data-density="comfortable"><ListBlock meta={productMeta} records={products.slice(0, 4)} intent="card" onRun={run} href={() => '#product'} now={DEMO_NOW} /></div>
      </Plate>
    </Plates>
  )
}

function Details() {
  const { run, pending } = useDemoRun()
  const [surface, setSurface] = useState<'flat' | 'bordered' | 'raised' | 'inset'>('bordered')
  return (
    <Plates cols={1}>
      <Plate label="surface" note="Container-adaptive: resize to see one or two columns">
        <div className="mb-3"><Segmented label="Surface" size="sm" value={surface} onValueChange={setSurface} items={(['flat', 'bordered', 'raised', 'inset'] as const).map(v => ({ value: v, label: v }))} /></div>
        <DetailBlock meta={orderMeta} record={orders[0]} surface={surface} onRun={run} pending={pending} now={DEMO_NOW} />
      </Plate>
      <Plate label="loading"><DetailBlock meta={orderMeta} state="loading" /></Plate>
    </Plates>
  )
}

export const sellerMetrics: Metric[] = [
  { key: 'revenue', label: 'Confirmed revenue', value: 'KES 6.94M', comparison: { label: 'vs previous 30 days', delta: '+12.4%', direction: 'up', good: true } },
  { key: 'fill', label: 'Fill rate', value: '96.2', unit: '%', comparison: { label: 'vs 97.1%', delta: '−0.9 pts', direction: 'down', good: false } },
  { key: 'cancel', label: 'Cancellations', value: '1.8', unit: '%', comparison: { label: 'unchanged', delta: '0.0 pts', direction: 'flat', good: true } },
  { key: 'risk', label: 'Products at stock risk', value: '9', tone: 'warning', note: 'Under 7 days of cover' },
]

function Stats() {
  return (
    <Plates cols={1}>
      <Plate label="comfortable · tone by metric state"><StatsBlock metrics={sellerMetrics} /></Plate>
      <Plate label="spacious"><StatsBlock metrics={sellerMetrics.slice(0, 2)} density="spacious" /></Plate>
      <Plate label="loading, empty, error"><div className="flex flex-col gap-3"><StatsBlock metrics={[]} state="loading" /><StatsBlock metrics={[]} state="empty" /><StatsBlock metrics={[]} state="error" /></div></Plate>
    </Plates>
  )
}

export const orderEvents: ActivityEvent[] = [
  { id: 'e6', at: '2026-10-12T11:39:00+03:00', kind: 'payment', title: 'Payment awaiting confirmation', actor: 'SellaPay', reference: 'TXN-1770727500-12345', certainty: 'awaiting' },
  { id: 'e5', at: '2026-10-12T11:30:00+03:00', kind: 'payment', title: 'M-Pesa prompt sent', actor: people.brian, detail: 'To +254 ••• ••• 678 for KES 48,250.00' },
  { id: 'e4', at: '2026-10-12T11:22:00+03:00', kind: 'stock', title: 'Stock reserved for 15 minutes', actor: 'System', reference: 'RSV-88213', detail: '6 lines across 2 sellers' },
  { id: 'e3', at: '2026-10-12T11:18:00+03:00', kind: 'order', title: 'Order submitted', actor: people.brian },
  { id: 'e2', at: '2026-10-12T10:51:00+03:00', kind: 'approval', title: 'Approved by buyer owner', actor: people.grace, detail: '“Fine for this week’s restock.”' },
  { id: 'e1', at: '2026-10-12T10:12:00+03:00', kind: 'order', title: 'Cart repriced: sugar +3.2%', actor: 'Rift Valley Traders' },
]
const kinds = [{ value: 'order', label: 'Order' }, { value: 'payment', label: 'Payment' }, { value: 'stock', label: 'Stock' }, { value: 'approval', label: 'Approval' }]

function Activity() {
  return (
    <Plates cols={2}>
      <Plate label="comfortable, type filter, thread by certainty"><ActivityBlock events={orderEvents} kinds={kinds} now={DEMO_NOW} /></Plate>
      <Plate label="compact"><ActivityBlock events={orderEvents.slice(0, 4)} density="compact" now={DEMO_NOW} /></Plate>
      <Plate label="empty"><ActivityBlock events={[]} /></Plate>
      <Plate label="loading"><ActivityBlock events={[]} state="loading" /></Plate>
    </Plates>
  )
}

function Related() {
  return (
    <Plates cols={2}>
      <Plate label="row · compact"><RelatedBlock title="Other products from Mwangaza" meta={productMeta} records={[products[4]!, products[0]!]} viewAllHref="#" now={DEMO_NOW} /></Plate>
      <Plate label="card"><RelatedBlock title="Frequently ordered together" meta={productMeta} records={[products[5]!, products[6]!]} intent="card" density="compact" now={DEMO_NOW} /></Plate>
      <Plate label="empty"><RelatedBlock title="Variants" meta={productMeta} records={[]} empty="This product has a single variant" /></Plate>
      <Plate label="loading: rows reserved, no count"><RelatedBlock title="Pick lists" meta={productMeta} records={[]} loading viewAllHref="#" /></Plate>
    </Plates>
  )
}

function SplitGrid({ kind }: { kind: 'split' | 'grid' }) {
  const box = (t: string) => ({ block: 'header', props: { source: 'explicit', title: t, variant: 'compact' } })
  if (kind === 'split') {
    const ratios = [['sidebar', 'main + 20rem aside'], ['wide-aside', 'main + aside up to 24rem'], ['half', 'two equal columns'], ['media-first', 'media leads, buy box follows'], ['aside-first', '18rem controls before the content']] as const
    return (
      <Plates cols={1}>
        <Plate label="ratio=sidebar, order detail with its timeline" tone="canvas">
          <PageBlocks page={[{ block: 'split', ratio: 'sidebar', children: [[{ block: 'detail', props: { meta: orderMeta, record: orders[0], now: DEMO_NOW } }], [{ block: 'activity', props: { events: orderEvents.slice(0, 3), density: 'compact', now: DEMO_NOW } }]] }]} />
        </Plate>
        {ratios.slice(1).map(([r, note]) => (
          <Plate key={r} label={`ratio=${r}`} note={note} tone="canvas">
            <PageBlocks page={[{ block: 'split', ratio: r, children: [[box('Main')], [box('Aside')]] }]} />
          </Plate>
        ))}
        <Plate label="stacked below the container threshold" note="Same definition in a 22rem container" tone="canvas">
          <div className="max-w-[22rem]"><PageBlocks page={[{ block: 'split', ratio: 'sidebar', children: [[box('Main')], [box('Aside')]] }]} /></div>
        </Plate>
      </Plates>
    )
  }
  return (
    <Plates cols={1}>
      {([1, 2, 3, 4] as const).map(n => (
        <Plate key={n} label={`columns=${n}`} note={n === 4 ? 'Steps 1, 2, 3, 4 by container width' : undefined} tone="canvas">
          <PageBlocks page={[{ block: 'grid', columns: n, children: ['Recent orders', 'Approvals', 'Quotes', 'Low stock'].slice(0, Math.max(n, 2)).map(t => [box(t)]) }]} />
        </Plate>
      ))}
    </Plates>
  )
}

export const messages: ChatMessage[] = [
  { id: 'm1', author: people.brian, organization: 'Wanjiru General Stores', at: '2026-10-12T09:12:00+03:00', body: 'Can you do KES 1,650 per bale if we take 60 bales a week through December?', visibility: 'public' },
  { id: 'm2', author: people.faith, organization: 'Mwangaza Wholesalers', at: '2026-10-12T09:40:00+03:00', body: 'Margin floor is 1,680 at that volume. Check with finance before countering.', visibility: 'internal', mine: true },
  { id: 'm3', author: people.faith, organization: 'Mwangaza Wholesalers', at: '2026-10-12T10:02:00+03:00', body: 'We can offer KES 1,690 per bale for 60 bales weekly, delivered Mondays.', visibility: 'public', mine: true },
]

function Chat() {
  const [list, setList] = useState(messages)
  return (
    <Plates cols={2}>
      <Plate label="Seller view · internal notes by policy"><ChatBlock title="Quote SM-QT-000318" messages={list} canInternal now={DEMO_NOW} onSend={(body, visibility) => setList(l => [...l, { id: String(l.length + 1), author: people.faith, organization: 'Mwangaza Wholesalers', at: DEMO_NOW, body, visibility, mine: true }])} /></Plate>
      <Plate label="Buyer view, internal notes hidden, compact"><ChatBlock title="Quote SM-QT-000318" messages={list.map(m => ({ ...m, mine: !m.mine }))} density="compact" now={DEMO_NOW} onSend={() => undefined} /></Plate>
      <Plate label="empty"><ChatBlock messages={[]} onSend={() => undefined} /></Plate>
      <Plate label="loading · read-only"><ChatBlock messages={[]} state="loading" canWrite={false} /></Plate>
    </Plates>
  )
}

const map: Record<string, () => ReactNode> = {
  'B-01': Headers, 'B-02': Filters, 'B-03': Lists, 'B-04': Details, 'B-05': Stats, 'B-06': Activity, 'B-07': Related,
  'B-08': () => <SplitGrid kind="split" />, 'B-09': () => <SplitGrid kind="grid" />, 'B-10': Chat,
}

export default function BlockSpecimens({ code }: { code: string }) {
  const S = map[code]
  return S ? <S /> : null
}
