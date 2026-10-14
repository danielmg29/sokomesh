import type { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/lib/cn'

type Props = Omit<LucideProps, 'ref'> & { icon: LucideIcon; label?: string }

/**
 * One icon treatment for the whole product: lucide outlines with square caps and mitred
 * joins, echoing the faceted mark. Decorative unless a label is given.
 */
export function Icon({ icon: Glyph, label, className, size = '1em', strokeWidth = 1.75, ...rest }: Props) {
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
      className={cn('shrink-0', className)}
      {...rest}
    />
  )
}
