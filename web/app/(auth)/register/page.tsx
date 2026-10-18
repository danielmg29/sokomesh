import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Register } from '@/features/auth/AuthForms'

export const metadata: Metadata = { title: 'Create an account' }

export default function RegisterPage() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-display">Create an account</h1>
        <p className="text-lg text-muted">One account for your business. Add colleagues once you are in.</p>
      </div>
      <Suspense fallback={<p role="status" className="text-md text-muted">Loading…</p>}>
        <Register />
      </Suspense>
    </>
  )
}
