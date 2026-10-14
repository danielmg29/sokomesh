import type { MetadataRoute } from 'next'
import { brandName, icons, siteDescription } from '@/lib/brand'
import { colorHex } from '@/lib/design/tokens.generated'

// Derived from tokens and the brand registry, replacing the kit's static site.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandName,
    short_name: brandName,
    description: siteDescription,
    start_url: '/',
    display: 'standalone',
    background_color: colorHex.background,
    theme_color: colorHex.primary,
    icons: [
      { src: icons.pwa192, sizes: '192x192', type: 'image/png' },
      { src: icons.pwa512, sizes: '512x512', type: 'image/png' },
    ],
  }
}
