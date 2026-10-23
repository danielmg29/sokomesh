// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import artefact from '../../../contract/ac-contract.json'
import { pollWhileWaiting, reservationOf } from '@/components/commerce/payment'
import { movementOf } from '@/features/inventory/InventoryPage'
import { api } from '@/lib/client/api'
import { withUploads } from '@/lib/client/files'
import { displayOf } from '@/lib/contract/display'
import { FulfillmentTaskMeta, InventoryBalanceMeta } from '@/lib/contract/generated'
import type { ModelMeta } from '@/lib/contract/types'
import { PAYMENT_POLL, latestPayment } from '@/lib/client/payments'
import type { MovementRecord, OrderRecord, PaymentRecord, ReservationRecord } from '@/lib/client/records'
import type { ActionMeta, Contract } from '@/lib/contract/types'

const contract = artefact as Contract

const payment = (over: Partial<PaymentRecord>): PaymentRecord => ({
  id: 'p1', status: 'pending', amount: '100.00', currency: 'KES', provider: 'sandbox', reference: 'SBX-1', phone: '0712 *** 678', attempt: 1,
  sent_at: new Date().toISOString(), confirmed_at: null, failure: null, refunded_amount: '0.00', results_received: 0, duplicates: 0, sandbox: true, confirms: true, ...over,
})
const order = (over: Partial<OrderRecord>) => ({ id: 'o1', order_number: 'SM-ORD-1', status: 'awaiting_payment', payments: [payment({})], ...over }) as OrderRecord

afterEach(() => vi.restoreAllMocks())

describe('payment polling (SM-F-14)', () => {
  test('the order is read again only while its prompt waits, for a bounded time', () => {
    expect(pollWhileWaiting(order({}))).toBe(PAYMENT_POLL.everyMs)
    expect(pollWhileWaiting(order({ payments: [payment({ status: 'confirmed' })] }))).toBe(false)
    expect(pollWhileWaiting(order({ status: 'submitted' }))).toBe(false)
    expect(pollWhileWaiting(order({ payments: [] }))).toBe(false)
    const old = new Date(Date.now() - PAYMENT_POLL.forMs - 1000).toISOString()
    expect(pollWhileWaiting(order({ payments: [payment({ sent_at: old })] }))).toBe(false)
    expect(pollWhileWaiting(undefined)).toBe(false)
  })

  test('the newest attempt is the one shown', () => {
    expect(latestPayment(order({ payments: [payment({ id: 'new' }), payment({ id: 'old', status: 'failed' })] }))?.id).toBe('new')
  })
})

describe('holds and the ledger (SM-F-07, SM-F-13)', () => {
  test('a hold cancelled with its order reads as released stock', () => {
    const hold: ReservationRecord = { id: 'r1', reference: 'RSV-1', product: 'Maize flour', sku: 'MF-2', quantity: 4, unit: 'bale', status: 'cancelled', expires_at: '2026-10-19T10:00:00Z' }
    expect(reservationOf(hold, 'SM-ORD-1')).toMatchObject({ id: 'RSV-1', status: 'released', orderReference: 'SM-ORD-1' })
  })

  test('a movement keeps the change in available and what is on hand after it', () => {
    const damage = contract.models.inventory_balance!.fields.find(f => f.name === 'reason_code')!.choices!.find(c => c.value === 'damage')!.label
    const m: MovementRecord = {
      id: 'm1', occurred_at: '2026-10-19T10:00:00Z', variant: { id: 'v', label: 'MF-2' }, movement_type: 'shipment', quantity: 0, available_after: 20, on_hand_after: 16,
      unit: 'bale', reference_label: 'SM-ORD-1', reason_code: 'damage', note: 'torn', actor: null,
    }
    expect(movementOf(m)).toMatchObject({ type: 'shipment', quantity: 0, balanceAfter: 20, onHandAfter: 16, actor: 'SokoMesh', reason: `${damage}: torn` })
  })

  test('the ledger knows returns', () => {
    const types = contract.models.inventory_movement!.fields.find(f => f.name === 'movement_type')!.choices!.map(c => c.value)
    expect(types).toContain('return')
  })
})

describe('commands with files (SM-F-16, SM-F-18)', () => {
  const action = { name: 'add_evidence', label: 'Add evidence', kind: 'command', policy: 'return_case.evidence' } as ActionMeta
  beforeEach(() => { document.cookie = 'csrftoken=test-token; path=/' })

  test('a chosen file is uploaded first and the command carries its id', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'f-1' }), { status: 201 }))
    const run = vi.fn().mockResolvedValue({})
    await withUploads(run)(action, { id: 'c1' }, { evidence_file: { name: 'a.jpg', size: 3, type: 'image/jpeg', state: 'ready', file: new File(['abc'], 'a.jpg') }, note: 'x' })
    expect(fetch).toHaveBeenCalledOnce()
    expect(run).toHaveBeenCalledWith(action, { id: 'c1' }, { evidence_file: 'f-1', note: 'x' })
  })

  test("the upload's refusal is reported on the form's field", async () => {
    const refused = { code: 'VALIDATION', detail: 'Not allowed.', fields: { file: ['Only JPEG, PNG or PDF.'] }, retryable: false }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(refused), { status: 400 }))
    const run = vi.fn()
    await expect(withUploads(run)(action, { id: 'c1' }, { evidence_file: { name: 'a.exe', size: 3, type: 'x', state: 'ready', file: new File(['abc'], 'a.exe') } }))
      .rejects.toMatchObject({ fields: { evidence_file: ['Only JPEG, PNG or PDF.'] } })
    expect(run).not.toHaveBeenCalled()
  })
})

describe('the first write of a visit', () => {
  test('reads the session first when there is no CSRF cookie yet, then sends the token', async () => {
    document.cookie = 'csrftoken=; Max-Age=0; path=/'
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input).endsWith('/session')) document.cookie = 'csrftoken=fresh; path=/'
      return new Response(JSON.stringify({}), { status: 200 })
    })
    await api('auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'x' } })
    expect(fetch.mock.calls.map(c => String(c[0]))).toEqual(['/api/v1/session', '/api/v1/auth/login'])
    expect((fetch.mock.calls[1]![1]!.headers as Record<string, string>)['X-CSRFToken']).toBe('fresh')
  })
})

describe('record names', () => {
  test('a relation display field reads as its label, an empty one as the model', () => {
    expect(displayOf(FulfillmentTaskMeta as unknown as ModelMeta, { id: 't1', order: { id: 'o1', label: 'SO-2026-0151' } })).toBe('SO-2026-0151')
    expect(displayOf(InventoryBalanceMeta as unknown as ModelMeta, { id: 'b1', product: null })).toBe(InventoryBalanceMeta.label)
  })
})
