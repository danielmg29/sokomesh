import type { Metadata } from 'next'
import { AdminContracts } from '@/features/categories/ContractPages'

export const metadata: Metadata = { title: 'Category contracts' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <AdminContracts />
}
