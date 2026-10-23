import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandLogo } from '@/components/ui/BrandLogo'
import scenes from '@/public/images/scenes/scenes.json'

// Account pages as an editorial split (after the storefront references): the form on a quiet ground,
// a graded scene photograph beside it with the market's terms. Below the two-column width the
// photograph goes and the form leads.
const scene = scenes['hero-retail']

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-10 px-4 py-6 sm:px-10 lg:px-16 lg:py-10">
        <Link href="/" aria-label="SokoMesh home" className="-m-3 self-start"><BrandLogo variant="lockup" width={264} preload /></Link>
        <main id="main" className="flex w-full max-w-[34rem] flex-1 flex-col justify-center gap-8 self-center lg:self-start">{children}</main>
        <p className="text-sm text-muted">Prices in KES, times in East Africa Time. A portfolio concept with demo data.</p>
      </div>
      <aside aria-hidden="true" className="on-chrome relative isolate hidden overflow-hidden bg-chrome lg:block">
        <Image src={scene.src} alt="" fill sizes="45vw" priority placeholder="blur" blurDataURL={scene.blurDataURL}
          className="-z-10 object-cover" style={{ objectPosition: `${scene.focus[0] * 100}% ${scene.focus[1] * 100}%` }} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-10 text-chrome-foreground">
          <p className="max-w-[18ch] font-display text-4xl font-extrabold tracking-display">Every wholesaler you use, in one cart.</p>
          <p className="max-w-[40ch] text-lg text-chrome-foreground/90">Approved sellers, real stock and M-Pesa payment, reviewed before trading starts.</p>
        </div>
      </aside>
    </div>
  )
}
