import type { Metadata } from 'next'
import { AuditPage } from '@/features/reconciliation/ReconciliationPages'

export const metadata: Metadata = { title: 'Audit trail' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <AuditPage />
}
