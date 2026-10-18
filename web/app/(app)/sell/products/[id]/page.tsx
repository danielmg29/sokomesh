import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { ProductEditor } from '@/features/catalog/SellerCatalog'

export const metadata: Metadata = { title: 'Product' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

async function Detail({ params }: { params: PageProps<'/sell/products/[id]'>['params'] }) {
  const { id } = await params
  return <ProductEditor id={id} />
}

export default function Page({ params }: PageProps<'/sell/products/[id]'>) {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading" />}>
      <Detail params={params} />
    </Suspense>
  )
}
