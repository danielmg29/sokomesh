import type { Metadata } from 'next'
import { AdminOrganizations } from '@/features/marketplace/AdminPages'

export const metadata: Metadata = { title: 'Buyer approvals' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <AdminOrganizations />
}
