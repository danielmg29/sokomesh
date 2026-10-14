import type { ComponentProps, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Density } from '@/lib/design/tokens.generated'

const gaps = { none: 'gap-0', xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6', xl: 'gap-10' } as const
export type Gap = keyof typeof gaps

type Base = { as?: ElementType; gap?: Gap; className?: string; children?: ReactNode } & Omit<ComponentProps<'div'>, 'className' | 'children'>

/** Vertical rhythm. */
export function Stack({ as: As = 'div', gap = 'md', className, ...props }: Base) {
  return <As className={cn('flex min-w-0 flex-col', gaps[gap], className)} {...props} />
}

/** Horizontal group that wraps. */
export function Cluster({ as: As = 'div', gap = 'sm', align = 'center', justify = 'start', className, ...props }: Base & { align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'; justify?: 'start' | 'between' | 'end' | 'center' }) {
  return (
    <As
      className={cn(
        'flex min-w-0 flex-wrap', gaps[gap],
        { start: 'items-start', center: 'items-center', end: 'items-end', baseline: 'items-baseline', stretch: 'items-stretch' }[align],
        { start: 'justify-start', between: 'justify-between', end: 'justify-end', center: 'justify-center' }[justify],
        className,
      )}
      {...props}
    />
  )
}

const ratios = {
  sidebar: '@3xl:grid-cols-[minmax(0,1fr)_20rem]',
  'wide-aside': '@3xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]',
  half: '@3xl:grid-cols-2',
  'media-first': '@3xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]',
  /** Facets or other controls before the content they filter; the first child takes the 18rem column. */
  'aside-first': '@3xl:grid-cols-[18rem_minmax(0,1fr)]',
} as const

/** Main + aside. Stacks below the container threshold, never by viewport. */
export function Split({ ratio = 'sidebar', gap = 'lg', className, children, ...props }: Base & { ratio?: keyof typeof ratios }) {
  return (
    <div className="@container min-w-0" {...props}>
      <div className={cn('grid min-w-0 grid-cols-1', gaps[gap], ratios[ratio], className)}>{children}</div>
    </div>
  )
}

const columns = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 @xl:grid-cols-2',
  3: 'grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3',
  4: 'grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4',
} as const

/** 1–4 column container-adaptive grid. */
export function Grid({ columns: cols = 2, gap = 'md', className, children, ...props }: Base & { columns?: keyof typeof columns }) {
  return (
    <div className="@container min-w-0" {...props}>
      <div className={cn('grid min-w-0', columns[cols], gaps[gap], className)}>{children}</div>
    </div>
  )
}

/** A region with its own density; descendants read the density tokens. */
export function DensityRegion({ density, className, children, as: As = 'div' }: { density: Density; className?: string; children: ReactNode; as?: ElementType }) {
  return <As data-density={density} className={cn('min-w-0', className)}>{children}</As>
}

/** Page width and gutters. */
export function Container({ className, size = 'wide', ...props }: ComponentProps<'div'> & { size?: 'wide' | 'reading' }) {
  return <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', size === 'wide' ? 'max-w-[90rem]' : 'max-w-3xl', className)} {...props} />
}
