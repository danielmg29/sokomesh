import type { Metadata } from 'next'
import { FulfilmentListPage } from '@/features/fulfillment/FulfilmentPages'

export const metadata: Metadata = { title: 'Fulfilment' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <FulfilmentListPage />
}
