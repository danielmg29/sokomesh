import { BrandLogo } from '@/components/ui/BrandLogo'
import { siteDescription } from '@/lib/brand'
import { CONTRACT_VERSION } from '@/lib/contract/generated'

// Structurally neutral placeholder until the visual direction is confirmed
// (docs/design/visual-direction.md). The public storefront replaces it as a divergent surface.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-8">
      <h1 className="max-w-full">
        <BrandLogo variant="lockup" width={400} preload className="max-w-full [&_img]:h-auto [&_img]:max-w-full" />
      </h1>
      <p className="font-display text-xl text-pretty">{siteDescription}</p>
      <p className="text-sm text-foreground/70">Contract {CONTRACT_VERSION}</p>
    </main>
  )
}
