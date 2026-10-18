import type { Metadata } from 'next'
import { SettingsPage } from '@/features/account/SettingsPage'

export const metadata: Metadata = { title: 'Settings' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <SettingsPage />
}
