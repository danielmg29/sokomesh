import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { CatalogueListing } from '@/features/storefront/Storefront'
import { apiListParams } from '@/lib/query'
import { StorefrontError, categories, productPage } from '@/lib/server/storefront'

export const metadata: Metadata = {
  title: 'Catalogue',
  description: 'Wholesale flour, sugar, cooking oil, tea, household and dairy products from approved Kenyan wholesalers, priced per pack in KES.',
  alternates: { canonical: '/catalogue' },
}

// The URL is the list query: filters, search, sort, page size and cursor go to the API as they are.
async function Catalogue({ searchParams }: { searchParams: PageProps<'/catalogue'>['searchParams'] }) {
  const params = apiListParams(await searchParams)
  const data = await Promise.all([categories(), productPage(params.toString())]).catch((err: unknown) => (err instanceof Error ? err : new Error(String(err))))
  if (data instanceof Error) {
    if (data instanceof StorefrontError && data.status === 422) {
      return <ErrorState kind="non-retryable" title="This catalogue link has filters that no longer apply" detail="Open the catalogue again and choose the filters you need." />
    }
    return <ErrorState kind="retryable" title="The catalogue could not be loaded" detail="Try again in a moment." />
  }
  const [cats, page] = data
  // One category chosen (as the filter writes it, or a single-value list): its contract's facets join in.
  const one = params.get('category__eq') ?? params.get('category__in')
  const chosen = one && !one.includes(',') ? cats.find(c => c.id === one) : undefined
  return <CatalogueListing categories={cats} page={page} chosen={chosen} />
}

export default function Page({ searchParams }: PageProps<'/catalogue'>) {
  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 py-10 @container sm:px-8 lg:py-14">
      <Suspense fallback={<LoadingState variant="skeleton" shape="cards" rows={8} label="Loading the catalogue" />}>
        <Catalogue searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
