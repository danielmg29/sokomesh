// Brand asset registry: the only module that names files under public/brand/. Usage rules
// (minimum sizes, clear space) come from the kit's ASSET_USAGE; see docs/design/brand-assets.md.
// Name, tagline and colours come from design/tokens via lib/design/tokens.generated.ts.
import { brand } from '@/lib/design/tokens.generated'

export const brandName = brand.name
export const brandTagline = brand.tagline
export const siteDescription =
  'Multi-vendor wholesale ordering and inventory for regional wholesalers and independent retailers.'

const BASE = '/brand'

/**
 * `markRatio` is the mark's share of the asset width, used for clear space
 * (one quarter of the mark width on every side). The lockup mark is a 512 box at 0.59 scale.
 */
export const logos = {
  mark: { src: `${BASE}/logo/logo-mark.svg`, width: 512, height: 512, markRatio: 1, minWidth: 20 },
  lockup: { src: `${BASE}/logo/logo-horizontal.svg`, width: 1600, height: 400, markRatio: (512 * 0.59) / 1600, minWidth: 160 },
} as const

/**
 * Dark-ground counterparts (approved by the brand owner 2026-10-13). They mirror the light files: the
 * wordmark goes to brand surface, the tagline to the lifted forest, and the mark's forest rises one
 * lightness step in the same hue so the crate reads on dark panels without a plate.
 */
export const reversedLogos: Record<keyof typeof logos, string> = {
  mark: `${BASE}/logo/logo-mark-reversed.svg`,
  lockup: `${BASE}/logo/logo-horizontal-reversed.svg`,
}

export type LogoVariant = keyof typeof logos

export const icons = {
  ico: `${BASE}/icons/favicon.ico`, // 16, 32 and 48 px
  svg: `${BASE}/icons/favicon.svg`, // preferred modern favicon
  appleTouch: `${BASE}/icons/apple-touch-icon-180.png`,
  pwa192: `${BASE}/icons/icon-192.png`,
  pwa512: `${BASE}/icons/icon-512.png`,
  safariMask: `${BASE}/icons/mask-icon.svg`,
} as const

export const socialCard = { src: `${BASE}/social/social-card-1200x630.png`, width: 1200, height: 630 } as const

/** Pixel size and clear space for a logo request, never below the brand minimum. */
export function logoBox(variant: LogoVariant, requestedWidth: number) {
  const logo = logos[variant]
  const width = Math.max(requestedWidth, logo.minWidth)
  return {
    width,
    height: Math.round((width * logo.height) / logo.width),
    clearSpace: Math.ceil((width * logo.markRatio) / 4),
  }
}
