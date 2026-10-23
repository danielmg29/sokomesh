// Paying an order (SM-F-14): the order's `pay` command sends the prompt; on the sandbox the buyer answers it
// from the simulated phone (`POST payments/<id>/simulate`). The order is read again while a prompt is
// waiting, every few seconds and for a bounded time, so the page follows the provider's result.

import { useMutation } from '@tanstack/react-query'
import { OrderMeta } from '../contract/generated'
import type { ActionMeta, Rec } from '../contract/types'
import { ApiError, api } from './api'
import type { OrderRecord, PaymentRecord, SandboxOutcome } from './records'
import { useCommand, useRefresh } from './resources'

const payAction = OrderMeta.actions.find(a => a.name === 'pay') as ActionMeta

/** The attempt that decides what the buyer sees: the newest one. */
export const latestPayment = (order: Pick<OrderRecord, 'payments'>): PaymentRecord | undefined => order.payments?.[0]

/** How often the order is read again while a prompt waits, and for how long at most. */
export const PAYMENT_POLL = { everyMs: 3000, forMs: 5 * 60_000 } as const

export function usePayment(order: OrderRecord) {
  const command = useCommand(OrderMeta)
  const refresh = useRefresh()
  const simulate = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: SandboxOutcome }) => api<Rec>(`payments/${id}/simulate`, { method: 'POST', body: { outcome } }),
    onSettled: () => refresh(OrderMeta.path!),
  })
  return {
    canPay: (order._can ?? []).includes('pay'),
    paying: command.pending === 'pay',
    pay: (phone: string) => command.run(payAction, order, { phone }),
    answering: simulate.isPending ? simulate.variables.outcome : null,
    answer: async (id: string, outcome: SandboxOutcome) => {
      try {
        await simulate.mutateAsync({ id, outcome })
      } catch (err) {
        throw err instanceof ApiError ? err.error : err
      }
    },
  }
}
