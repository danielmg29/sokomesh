import type { Metadata } from 'next'
import { AdminSellers } from '@/features/marketplace/AdminPages'

export const metadata: Metadata = { title: 'Sellers' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <AdminSellers />
}
