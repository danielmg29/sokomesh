import type { Metadata } from 'next'
import { ProfilePage } from '@/features/account/ProfilePage'

export const metadata: Metadata = { title: 'Profile' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <ProfilePage />
}
