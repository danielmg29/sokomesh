// A mirror of the server's purchase-approval rule (apps/orders/checkout.py `applicable_policy`, `exempt_role`),
// for warnings before checkout only: the API decides when the order is placed.

import { compareMoney } from '@/lib/money'

/** The fields of an `approval_policy` record this mirror reads. */
export type PolicyLike = { name: string; threshold_amount: string; approver_role_keys: readonly string[]; exempt_approvers: boolean; is_active: boolean }

/**
 * The policy an order of `total` would wait under when placed by someone with `role`: the strictest active
 * policy it reaches (the highest threshold at or below it), unless that policy lets the role's own orders skip.
 */
export function policyFor<P extends PolicyLike>(policies: readonly P[], role: string | undefined, total: string): P | undefined {
  const strictest = policies
    .filter(p => p.is_active && compareMoney(total, p.threshold_amount) >= 0)
    .sort((a, b) => compareMoney(b.threshold_amount, a.threshold_amount))[0]
  if (!strictest) return undefined
  return strictest.exempt_approvers && role && strictest.approver_role_keys.includes(role) ? undefined : strictest
}
