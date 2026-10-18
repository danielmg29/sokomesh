import { connection } from 'next/server'
import { Suspense } from 'react'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { CategoryShowcase, MarketingCTA, MercantileHero, ProductRail, TradeStatement, WholesaleMetricsStrip, buyerValue, heroPanels, sellerValue, statementCopy } from '@/features/marketing/Marketing'
import { BuyerSellerValueSplit } from '@/features/marketing/MarketingInteractive'
import { categoryHref, productHref, sceneFor } from '@/features/storefront/Storefront'
import { ProductMeta } from '@/lib/contract/generated'
import { categories, products } from '@/lib/server/storefront'
import scenes from '@/public/images/scenes/scenes.json'

// Landing (SM-F-22): the two doors, then the live market from the API (real counts, categories and
// published products), the statement, the two value stories and the close. Sections are held apart by
// space rather than boxes, as on the storefronts this follows.
async function LiveMarket() {
  await connection()
  const data = await Promise.all([categories(), products()]).catch(() => null)
  if (!data) return <ErrorState kind="retryable" title="The catalogue could not be loaded" detail="Accounts and sign-in still work. Try the catalogue again in a moment." />
  const [cats, prods] = data
  const shown = cats.filter(c => c.product_count > 0)
  const sellers = new Set(prods.map(p => p.seller.id)).size
  const oil = prods.find(p => p.category.slug === 'cooking-oils')?.primary_image ?? prods[0]?.primary_image
  return (
    <>
      <WholesaleMetricsStrip label="The demo market today" source="Counted live from the published catalogue."
        metrics={[{ label: 'Published products', value: String(prods.length) }, { label: 'Approved wholesalers', value: String(sellers) }, { label: 'Categories', value: String(shown.length) }]} />
      <CategoryShowcase layout="photo" categories={shown.map(c => {
        const first = prods.find(p => p.category.slug === c.slug)?.primary_image
        return { key: c.slug, name: c.name, products: c.product_count, image: first?.url ?? '', alt: '', scene: sceneFor(c.slug), href: categoryHref(c) }
      })} />
      <ProductRail title="Newly published" meta={ProductMeta} records={prods.slice(0, 4)} href={productHref} all={{ label: 'All products', href: '/catalogue' }} />
      {oil ? <TradeStatement {...statementCopy} product={{ src: oil.url, width: oil.width, height: oil.height }} link={{ label: 'Browse the catalogue', href: '/catalogue' }} /> : null}
    </>
  )
}

export default function Home() {
  return (
    <>
      <MercantileHero panels={heroPanels} />
      <div className="@container mx-auto flex w-full max-w-[96rem] flex-col gap-20 px-4 py-14 @xl:px-8 @5xl:gap-28 @5xl:py-20">
        <Suspense fallback={<LoadingState variant="skeleton" shape="cards" rows={4} label="Loading the catalogue" />}>
          <LiveMarket />
        </Suspense>
        <BuyerSellerValueSplit layout="stories" buyer={buyerValue} seller={sellerValue} scenes={{ buyer: scenes['story-delivery'], seller: scenes['story-stock'] }} />
        <MarketingCTA scene={scenes['category-grains']} />
      </div>
    </>
  )
}
