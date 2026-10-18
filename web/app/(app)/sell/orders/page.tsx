import type { Metadata } from 'next'
import { OrdersPage } from '@/features/orders/OrderPages'

export const metadata: Metadata = { title: 'Orders' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <OrdersPage side="seller" />
}
