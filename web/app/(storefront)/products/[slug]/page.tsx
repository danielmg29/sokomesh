import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { ProductDetail } from '@/features/storefront/Storefront'
import { product, products } from '@/lib/server/storefront'

// ProductPage (SM-F-22): title, description, canonical URL, image and schema.org JSON-LD all come from the
// API's derived `page` block, so the page states nothing the backend did not publish.
export async function generateMetadata({ params }: PageProps<'/products/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const p = await product(slug).catch(() => null)
  if (!p) return { title: 'Product not found', robots: { index: false } }
  const { page } = p
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.canonical_url },
    openGraph: {
      type: 'website', title: page.title, description: page.description, url: page.canonical_url,
      images: page.primary_image_url && p.primary_image ? [{ url: page.primary_image_url, width: p.primary_image.width, height: p.primary_image.height, alt: p.primary_image.alt }] : undefined,
    },
  }
}

async function Product({ params }: { params: PageProps<'/products/[slug]'>['params'] }) {
  const { slug } = await params
  let found
  try {
    const p = await product(slug)
    found = p ? { p, related: (await products(`category__eq=${p.category.id}&page_size=5`)).filter(r => r.id !== p.id) } : null
  } catch {
    return <ErrorState kind="retryable" title="This product could not be loaded" detail="Try again in a moment." />
  }
  if (!found) notFound()
  return <ProductDetail product={found.p} related={found.related} />
}

export default function Page({ params }: PageProps<'/products/[slug]'>) {
  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 py-8 sm:px-8 lg:py-12">
      <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading the product" />}>
        <Product params={params} />
      </Suspense>
    </div>
  )
}
