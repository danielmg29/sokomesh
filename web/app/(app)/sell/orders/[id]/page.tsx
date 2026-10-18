import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { OrderPage } from '@/features/orders/OrderPages'

export const metadata: Metadata = { title: 'Order' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

async function Detail({ params }: { params: PageProps<'/sell/orders/[id]'>['params'] }) {
  const { id } = await params
  return <OrderPage id={id} />
}

export default function Page({ params }: PageProps<'/sell/orders/[id]'>) {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading the order" />}>
      <Detail params={params} />
    </Suspense>
  )
}
