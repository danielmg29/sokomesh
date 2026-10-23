import type { Metadata } from 'next'
import { CasesPage } from '@/features/returns/ReturnPages'

export const metadata: Metadata = { title: 'Returns and disputes' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <CasesPage side="buyer" />
}
