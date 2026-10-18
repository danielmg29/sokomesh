import type { Metadata } from 'next'
import { NotificationsPage } from '@/features/account/NotificationsPage'

export const metadata: Metadata = { title: 'Notifications' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <NotificationsPage />
}
