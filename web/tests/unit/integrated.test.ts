import { describe, expect, test } from 'vitest'
import artefact from '../../../contract/ac-contract.json'
import { orderLook } from '@/components/commerce/orders'
import { card } from '@/features/analytics/SellerAnalytics'
import type { MetricResult } from '@/lib/client/records'
import type { Contract } from '@/lib/contract/types'

const contract = artefact as Contract

const metric = (over: Partial<MetricResult>): MetricResult => ({
  key: 'revenue', name: 'Revenue', unit: 'KES', better: 'higher', description: '', version: 1, dimensions: ['day'], value: '1200.00', previous: '1000.00', ...over,
})

describe('order labels come from the contract (SM-F-15)', () => {
  test('every order status has the backend label and tone', () => {
    const status = contract.models.order!.fields.find(f => f.name === 'status')!
    for (const c of status.choices ?? []) expect(orderLook[c.value as keyof typeof orderLook]).toMatchObject({ label: c.label, tone: c.tone ?? 'neutral' })
    expect(orderLook.pending_approval.label).toBe('Awaiting approval')
  })
})

describe('metric cards (SM-F-19)', () => {
  test('a rise is good news only when the definition says higher is better', () => {
    expect(card(metric({})).comparison).toMatchObject({ direction: 'up', delta: '+20.0%', good: true })
    expect(card(metric({ key: 'cancellation_rate', unit: 'percent', better: 'lower', value: '12.0', previous: '10.0' })).comparison).toMatchObject({ direction: 'up', good: false })
  })

  test('metrics of the present and empty ratios have no comparison', () => {
    expect(card(metric({ key: 'stock_risk', unit: 'count', previous: null, value: '4' })).comparison).toBeUndefined()
    const empty = card(metric({ key: 'fill_rate', unit: 'percent', value: '', previous: '' }))
    expect(empty.value).toBe('No data')
    expect(empty.comparison).toBeUndefined()
  })

  test('a metric that starts from nothing has no percentage change', () => {
    expect(card(metric({ value: '500.00', previous: '0.00' })).comparison).toBeUndefined()
    expect(card(metric({ value: '0.00', previous: '0.00' })).comparison).toMatchObject({ direction: 'flat', delta: '0.0%' })
  })
})
