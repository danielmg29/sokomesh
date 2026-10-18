import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignIn } from '@/features/auth/AuthForms'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

export default function LoginPage() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-display">Sign in</h1>
        <p className="text-lg text-muted">Order from approved wholesalers, or manage what you sell.</p>
      </div>
      <Suspense fallback={<p role="status" className="text-md text-muted">Loading…</p>}>
        <SignIn />
      </Suspense>
    </>
  )
}
