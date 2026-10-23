import { describe, expect, test } from 'vitest'
import artefact from '../../../contract/ac-contract.json'
import { orderLook } from '@/components/commerce/orders'
import { card } from '@/features/analytics/SellerAnalytics'
import { policyFor, type PolicyLike } from '@/lib/client/approval'
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

const policy = (over: Partial<PolicyLike>): PolicyLike => ({
  name: 'Large orders', threshold_amount: '50000.00', approver_role_keys: ['buyer_owner'], exempt_approvers: true, is_active: true, ...over,
})

describe('purchase approval mirror (SM-F-12)', () => {
  const policies = [policy({}), policy({ name: 'Very large orders', threshold_amount: '200000.00', approver_role_keys: ['buyer_owner'], exempt_approvers: false })]

  test('the strictest active policy the total reaches applies', () => {
    expect(policyFor(policies, 'buyer_purchaser', '49999.99')).toBeUndefined()
    expect(policyFor(policies, 'buyer_purchaser', '50000.00')?.name).toBe('Large orders')
    expect(policyFor(policies, 'buyer_purchaser', '250000.00')?.name).toBe('Very large orders')
    expect(policyFor([policy({ is_active: false })], 'buyer_purchaser', '60000.00')).toBeUndefined()
  })

  test("an approver's own order skips a policy only when the policy says so", () => {
    expect(policyFor(policies, 'buyer_owner', '60000.00')).toBeUndefined()
    expect(policyFor(policies, 'buyer_owner', '250000.00')?.name).toBe('Very large orders')
  })

  test('the contract publishes the exemption on by default', () => {
    const field = contract.models.approval_policy!.fields.find(f => f.name === 'exempt_approvers')!
    expect(field).toMatchObject({ type: 'boolean', default: true })
  })
})
