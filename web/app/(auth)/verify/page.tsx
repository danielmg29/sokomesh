import type { Metadata } from 'next'
import { Verify } from '@/features/auth/AuthForms'

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false } }

export default function VerifyPage() {
  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-display">Confirm your email</h1>
      <Verify />
    </>
  )
}
