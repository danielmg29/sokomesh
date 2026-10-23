import type { Metadata } from 'next'
import { HomePage } from '@/features/dashboard/HomePage'

export const metadata: Metadata = { title: 'Home' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <HomePage />
}
