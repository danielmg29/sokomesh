import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { AdminContract } from '@/features/categories/ContractPages'

export const metadata: Metadata = { title: 'Category contract' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

async function Detail({ params }: { params: PageProps<'/admin/categories/[id]'>['params'] }) {
  const { id } = await params
  return <AdminContract id={id} />
}

export default function Page({ params }: PageProps<'/admin/categories/[id]'>) {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading" />}>
      <Detail params={params} />
    </Suspense>
  )
}
