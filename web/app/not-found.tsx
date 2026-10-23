import type { Metadata } from 'next'
import Link from 'next/link'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { buttonStyles } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } }

// Any address nothing answers: an editorial split like the account pages, with the ways back that work for
// everyone (the catalogue) and for people signed in (their orders).
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-10">
        <Link href="/" aria-label="SokoMesh home" className="-m-2 inline-block"><BrandLogo variant="wordmark" width={196} /></Link>
      </header>
      <main id="main" className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 content-center gap-10 px-4 py-16 sm:px-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-end">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-sm text-muted">404</p>
          <h1 className="max-w-[14ch] font-display text-5xl font-extrabold tracking-display text-balance md:text-6xl">This page is not on the market.</h1>
        </div>
        <div className="flex flex-col gap-5 border-t border-foreground pt-5">
          <p className="max-w-[52ch] text-lg text-muted">The address may be old, or the product, order or case may have been removed or belong to another organization.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/catalogue" className={buttonStyles({ variant: 'primary', size: 'lg' })}>Browse the catalogue</Link>
            <Link href="/orders" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>Your orders</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
