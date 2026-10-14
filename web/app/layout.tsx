import type { Metadata, Viewport } from 'next'
import { Archivo, JetBrains_Mono } from 'next/font/google'
import { brandName, brandTagline, icons, siteDescription, socialCard } from '@/lib/brand'
import { colorHex, colorHexDark } from '@/lib/design/tokens.generated'
import { themeScript } from '@/lib/theme'
import './globals.css'

// Brand typography (constitution, amended 2026-10-13): one grotesque in two widths. Archivo at its
// normal width sets interface text; its SemiExpanded width (type-display-width) sets headings and
// money figures, so quantities read like trade signage. The width axis is loaded with the font.
// JetBrains Mono carries identifiers only (SKUs, order, quote, TXN and request ids): unambiguous
// 0/O and 1/l on every platform, where ui-monospace is not.
const sans = Archivo({ variable: '--font-archivo', subsets: ['latin'], axes: ['wdth'] })
const code = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'], weight: ['400', '500', '600'] })

const title = `${brandName}: ${brandTagline}`

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: title, template: `%s · ${brandName}` },
  description: siteDescription,
  applicationName: brandName,
  icons: {
    icon: [
      { url: icons.ico, sizes: '32x32' },
      { url: icons.svg, type: 'image/svg+xml' },
    ],
    apple: [{ url: icons.appleTouch, sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: icons.safariMask, color: colorHex.primary }],
  },
  openGraph: {
    type: 'website',
    siteName: brandName,
    title,
    description: siteDescription,
    images: [{ url: socialCard.src, width: socialCard.width, height: socialCard.height, alt: title }],
  },
  twitter: { card: 'summary_large_image', title, description: siteDescription, images: [socialCard.src] },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: colorHex.primary },
    { media: '(prefers-color-scheme: dark)', color: colorHexDark.chrome },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // data-theme is set before hydration by themeScript, so the server markup cannot match it.
    <html lang="en" className={`${sans.variable} ${code.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
