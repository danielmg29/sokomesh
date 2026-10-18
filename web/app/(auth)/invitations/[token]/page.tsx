import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AcceptInvitation } from '@/features/auth/AuthForms'

export const metadata: Metadata = { title: 'Accept an invitation', robots: { index: false } }

async function Invitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <AcceptInvitation token={token} />
}

export default function InvitationPage({ params }: PageProps<'/invitations/[token]'>) {
  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-display">Join your team</h1>
      <Suspense fallback={<p role="status" className="text-md text-muted">Opening the invitation…</p>}>
        <Invitation params={params} />
      </Suspense>
    </>
  )
}
