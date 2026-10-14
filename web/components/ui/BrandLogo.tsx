import Image from 'next/image'
import { brandName, brandTagline, logoBox, logos, reversedLogos, type LogoVariant } from '@/lib/brand'

type Props = {
  variant?: LogoVariant
  width: number
  /** `auto` follows the theme; `dark` is for grounds that are dark in both themes (chrome mastheads). */
  ground?: 'auto' | 'dark'
  preload?: boolean
  className?: string
}

/**
 * A brand logo at or above its minimum size, wrapped in its required clear space. Dark grounds get the
 * reversed files (brand-owner approved): light wordmark, lifted-forest tagline, forest raised one step.
 */
export function BrandLogo({ variant = 'mark', width, ground = 'auto', preload, className }: Props) {
  const box = logoBox(variant, width)
  const alt = variant === 'lockup' ? `${brandName}: ${brandTagline}` : brandName
  // Both files carry the name: the one hidden by the theme is display:none, so it leaves the accessibility tree.
  const image = (src: string, cls?: string) => (
    <Image src={src} width={box.width} height={box.height} alt={alt} preload={preload} unoptimized className={cls} />
  )
  return (
    // Clear space is a brand-asset rule derived from the rendered size, not a spacing token.
    <span className={className} style={{ display: 'inline-block', padding: box.clearSpace }}>
      {ground === 'dark'
        ? image(reversedLogos[variant])
        : <>{image(logos[variant].src, 'dark:hidden')}{image(reversedLogos[variant], 'hidden dark:block')}</>}
    </span>
  )
}
