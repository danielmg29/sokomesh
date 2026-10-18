import type { Metadata } from 'next'
import { QuotesPage } from '@/features/quotes/QuotePages'

export const metadata: Metadata = { title: 'Quotes' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

export default function Page() {
  return <QuotesPage side="seller" />
}
