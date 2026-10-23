import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { CasePage } from '@/features/returns/ReturnPages'

export const metadata: Metadata = { title: 'Case' }
// Rendered on the client once the session is known (see app/(app)/layout.tsx).
export const instant = false

async function Detail({ params }: { params: PageProps<'/returns/[id]'>['params'] }) {
  const { id } = await params
  return <CasePage id={id} side="buyer" />
}

export default function Page({ params }: PageProps<'/returns/[id]'>) {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" shape="detail" label="Loading the case" />}>
      <Detail params={params} />
    </Suspense>
  )
}
