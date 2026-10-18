import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { QuotePage } from '@/features/quotes/QuotePages'

export const metadata: Metadata = { title: 'Quote' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

async function Detail({ params }: { params: PageProps<'/quotes/[id]'>['params'] }) {
  const { id } = await params
  return <QuotePage id={id} />
}

export default function Page({ params }: PageProps<'/quotes/[id]'>) {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading the quote" />}>
      <Detail params={params} />
    </Suspense>
  )
}
