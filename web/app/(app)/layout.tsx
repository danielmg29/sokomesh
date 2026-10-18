import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppFrame } from '@/features/account/AppFrame'

export const metadata: Metadata = { robots: { index: false } }

// Signed-in pages render on the client once the session is known (signed-out visitors are sent to sign-in
// first), so there is no server shell for instant-navigation validation to check; each page opts out too.
export const instant = false

export default function SignedInLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>
}
