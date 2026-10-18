import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { buttonStyles } from '@/components/ui/button'
import { ComparePage } from '@/features/storefront/Storefront'
import { StorefrontError, comparison } from '@/lib/server/storefront'

export const metadata: Metadata = { title: 'Compare products', robots: { index: false } }

// SM-F-09: `?products=<id>,<id>` (at most four, one category); the API projects the comparison.
async function Comparison({ searchParams }: { searchParams: PageProps<'/compare'>['searchParams'] }) {
  const raw = (await searchParams).products
  const ids = [...new Set((Array.isArray(raw) ? raw.join(',') : raw ?? '').split(',').map(s => s.trim()).filter(Boolean))]
  if (!ids.length) {
    return <EmptyState kind="no-data" title="Nothing to compare yet" description="Use Compare on two to four products of one category, then open the comparison."
      action={<Link href="/catalogue" className={buttonStyles({ variant: 'primary' })}>Browse the catalogue</Link>} />
  }
  const state = await comparison(ids).catch((err: unknown) => (err instanceof StorefrontError ? err : new StorefrontError(503, 'Try again in a moment.')))
  if (state instanceof StorefrontError) {
    return <ErrorState kind={state.status < 500 ? 'non-retryable' : 'retryable'} title="These products cannot be compared" detail={state.detail} />
  }
  return <ComparePage state={state} />
}

export default function Page({ searchParams }: PageProps<'/compare'>) {
  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 py-10 sm:px-8 lg:py-14">
      <Suspense fallback={<LoadingState variant="skeleton" shape="block" label="Loading the comparison" />}>
        <Comparison searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
