import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { CategoryPage } from '@/features/storefront/Storefront'
import { apiListParams } from '@/lib/query'
import { StorefrontError, categories, productPage } from '@/lib/server/storefront'

export async function generateMetadata({ params }: PageProps<'/catalogue/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const category = (await categories().catch(() => [])).find(c => c.slug === slug)
  if (!category) return { title: 'Category not found' }
  return { title: category.name, description: category.description, alternates: { canonical: `/catalogue/${slug}` } }
}

// The category is the route's own filter; everything else in the URL (its contract's buyer filters
// included) goes to the API as it is.
async function Category({ params, searchParams }: Pick<PageProps<'/catalogue/[slug]'>, 'params' | 'searchParams'>) {
  const [{ slug }, search] = await Promise.all([params, searchParams])
  let found
  try {
    const category = (await categories()).find(c => c.slug === slug)
    found = category ? { category, page: await productPage(apiListParams(search, { category__eq: category.id }).toString()) } : null
  } catch (err) {
    if (err instanceof StorefrontError && err.status === 422) {
      return <ErrorState kind="non-retryable" title="This link has filters the category no longer offers" detail="Open the category again and choose the filters you need." />
    }
    return <ErrorState kind="retryable" title="This category could not be loaded" detail="Try again in a moment." />
  }
  if (!found) notFound()
  return <CategoryPage category={found.category} page={found.page} />
}

export default function Page({ params, searchParams }: PageProps<'/catalogue/[slug]'>) {
  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 py-10 sm:px-8 lg:py-14">
      <Suspense fallback={<LoadingState variant="skeleton" shape="cards" rows={8} label="Loading the category" />}>
        <Category params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
