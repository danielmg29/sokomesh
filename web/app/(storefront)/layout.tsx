import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import { CompareTray } from '@/components/commerce/compare'
import { MarketingFooter } from '@/features/marketing/Marketing'
import { MarketingHeader } from '@/features/marketing/MarketingInteractive'
import { StorefrontAccount } from '@/features/storefront/StorefrontAccount'
import { StorefrontHeader, storefrontLinks } from '@/features/storefront/Storefront'
import { categories } from '@/lib/server/storefront'

// The public pages: the three-tier header with the live category row, the page, the chrome footer.
// Categories are read at request time from the cached storefront data, so building the site does not
// need the API running; while they load the header shows without its category row.
async function Header() {
  await connection()
  const list = await categories().catch(() => [])
  return <StorefrontHeader categories={list} />
}

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Suspense fallback={<MarketingHeader sticky search={false} current="" links={storefrontLinks} account={<StorefrontAccount />} />}>
        <Header />
      </Suspense>
      <main id="main" className="flex-1">{children}</main>
      <MarketingFooter />
      <CompareTray />
    </div>
  )
}
