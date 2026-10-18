'use client'

// SM-F-19 seller analytics: the cards, the daily chart, the top products and the CSV export all come from
// the backend's metric definitions (`GET analytics`), so they always reconcile. The period lives in the URL.
// Which way a change is good news is part of each definition (`better`), not decided here.

import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SellerAnalyticsGrid, type AnalyticsPeriod, type AnalyticsRange } from '@/components/commerce/admin'
import type { Metric } from '@/components/kernel/blocks/DataBlocks'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { api } from '@/lib/client/api'
import type { AnalyticsAnswer, MetricResult } from '@/lib/client/records'
import { API_BASE } from '@/lib/contract/generated'
import { formatDay } from '@/lib/format'
import { formatMoney } from '@/lib/money'

const RANGES: Record<AnalyticsRange, number> = { '7d': 7, '30d': 30, '90d': 90 }
// The cards and chart; the product table is its own breakdown query.
const CARDS = 'revenue,orders,average_order_value,fill_rate,cancellation_rate,stock_risk'

/** Today in East Africa Time and `days - 1` days before it, as ISO dates. */
function span(days: number): { from: string; to: string } {
  const eat = new Date(Date.now() + 3 * 3_600_000)
  const to = eat.toISOString().slice(0, 10)
  const from = new Date(eat.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
  return { from, to }
}

/** A metric value as the card shows it; "" from the API means there was nothing to average or divide. */
const shown = (m: MetricResult, value: string) =>
  value === '' ? 'No data' : m.unit === 'KES' ? formatMoney(value) : m.unit === 'percent' ? `${value}%` : Number(value).toLocaleString('en-KE')

/**
 * The card: the value and, for metrics of a period, the change against the period before. A period
 * before with nothing in it gives no comparison (a change from zero has no meaningful percentage).
 */
export function card(m: MetricResult): Metric {
  const now = Number(m.value)
  const before = Number(m.previous)
  const comparable = m.previous !== null && m.previous !== '' && m.value !== '' && (before !== 0 || now === 0)
  const change = before === 0 ? 0 : ((now - before) / before) * 100
  const direction = now > before ? 'up' : now < before ? 'down' : 'flat'
  return {
    key: m.key,
    label: m.name,
    value: shown(m, m.value),
    note: m.description,
    comparison: comparable ? {
      label: `vs previous period (${shown(m, m.previous!)})`,
      delta: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      direction,
      good: direction === 'flat' || (direction === 'up') === (m.better !== 'lower'),
    } : undefined,
  }
}

export function SellerAnalytics() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const range = (Object.keys(RANGES) as AnalyticsRange[]).find(r => r === params.get('range')) ?? '30d'
  const { from, to } = span(RANGES[range])
  const query = `date_from=${from}&date_to=${to}`
  const cards = useQuery({ queryKey: ['analytics', range, from], queryFn: ({ signal }) => api<AnalyticsAnswer>(`analytics?metrics=${CARDS}&dimension=day&${query}`, { signal }) })
  const top = useQuery({ queryKey: ['analytics', range, from, 'product'], queryFn: ({ signal }) => api<AnalyticsAnswer>(`analytics?metrics=product_revenue&dimension=product&${query}`, { signal }) })
  const header = <HeaderBlock level={1} source="explicit" title="Analytics" description="How your orders are doing, from the same definitions the export uses. Days run in East Africa Time." />
  if (cards.isError) return <>{header}<ErrorState kind="retryable" title="Analytics did not load" onRetry={() => void cards.refetch()} /></>
  const answer = cards.data
  const revenue = answer?.metrics.find(m => m.key === 'revenue')
  const breakdown = top.data?.metrics[0]?.breakdown ?? []
  const period: AnalyticsPeriod | undefined = answer ? {
    metrics: answer.metrics.map(card),
    daily: (revenue?.series ?? []).map(p => ({ key: p.bucket, label: formatDay(`${p.bucket}T12:00:00+03:00`), value: Number(p.value), display: formatMoney(p.value) })),
    topProducts: breakdown.map(b => ({ rank: b.rank, product: b.label, units: `${(b.units ?? 0).toLocaleString('en-KE')} packs`, revenue: b.value })),
  } : undefined
  const empty = answer && answer.metrics.every(m => Number(m.value) === 0)
  return (
    <>
      {header}
      <SellerAnalyticsGrid range={range} onRange={r => router.replace(`${pathname}?range=${r}` as Route, { scroll: false })}
        periods={period ? { [range]: period } : {}} state={!answer ? 'loading' : empty ? 'empty' : 'ready'} definitionVersion={answer?.definitions_version ?? '…'}
        exportHref={`${API_BASE}analytics/export?metrics=${CARDS},product_revenue&dimension=day&${query}`}
        note={revenue ? `${revenue.description} Daily figures use the day the order was placed.` : undefined} />
    </>
  )
}
