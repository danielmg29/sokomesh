'use client'

import { Avatar as AvatarPrimitive } from 'radix-ui'
import type { ReactNode, ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Count or short label. Rectangular; tone-free (use Stamp for states). */
export function Badge({ children, emphasis = 'quiet', className }: { children: ReactNode; emphasis?: 'quiet' | 'strong' | 'signal'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-xs px-1.5 text-xs font-semibold leading-5 tabular',
        emphasis === 'quiet' && 'bg-sunken text-foreground',
        emphasis === 'strong' && 'bg-inverse text-inverse-foreground',
        emphasis === 'signal' && 'bg-signal text-signal-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
}

/** Person or organization. Square with restrained radius; initials when no image. */
export function Avatar({ name, src, size = 'md', className }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-primary-soft font-semibold text-primary select-none',
        size === 'sm' && 'size-6 text-xs',
        size === 'md' && 'size-8 text-xs',
        size === 'lg' && 'size-11 text-sm',
        className,
      )}
    >
      {src ? <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback delayMs={src ? 300 : 0} aria-label={name}>
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

/** Keyboard key hint. */
export function Kbd({ children, className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border-strong bg-surface px-1 font-mono text-xs text-muted', className)} {...props}>
      {children}
    </kbd>
  )
}
