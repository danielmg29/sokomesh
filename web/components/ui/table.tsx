import { ScrollArea as ScrollPrimitive, Separator as SeparatorPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Bordered data table. Density comes from the nearest data-density region. */
export function Table({ className, caption, children, ...props }: ComponentProps<'table'> & { caption?: ReactNode }) {
  return (
    <table className={cn('w-full border-collapse text-(length:--density-text) tabular', className)} {...props}>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      {children}
    </table>
  )
}

export function THead({ className, sticky, ...props }: ComponentProps<'thead'> & { sticky?: boolean }) {
  return <thead className={cn('bg-sunken', sticky && 'sticky top-0 z-10', className)} {...props} />
}

export function TBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} />
}

export function Tr({ className, selected, interactive, ...props }: ComponentProps<'tr'> & { selected?: boolean; interactive?: boolean }) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cn('border-b border-border', interactive && 'hover:bg-sunken/60', selected && 'bg-primary-soft hover:bg-primary-soft', className)}
      {...props}
    />
  )
}

export function Th({ className, numeric, ...props }: ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'caps px-(--density-cell-padding-x) py-2 text-left whitespace-nowrap text-muted',
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, numeric, ...props }: ComponentProps<'td'> & { numeric?: boolean }) {
  return <td className={cn('px-(--density-cell-padding-x) py-(--density-row-padding-y) align-middle', numeric && 'text-right tabular', className)} {...props} />
}

/** Bordered frame that scrolls wide tables horizontally with a visible, themed scrollbar. */
export function ScrollArea({ className, children, orientation = 'horizontal', label }: { className?: string; children: ReactNode; orientation?: 'horizontal' | 'vertical' | 'both'; label?: string }) {
  return (
    <ScrollPrimitive.Root type="auto" className={cn('relative overflow-hidden', className)}>
      <ScrollPrimitive.Viewport className="size-full" aria-label={label} tabIndex={label ? 0 : undefined}>{children}</ScrollPrimitive.Viewport>
      {orientation !== 'vertical' ? (
        <ScrollPrimitive.Scrollbar orientation="horizontal" className="flex h-2.5 touch-none border-t border-border bg-sunken p-0.5 select-none">
          <ScrollPrimitive.Thumb className="relative flex-1 rounded-xs bg-border-strong" />
        </ScrollPrimitive.Scrollbar>
      ) : null}
      {orientation !== 'horizontal' ? (
        <ScrollPrimitive.Scrollbar orientation="vertical" className="flex w-2.5 touch-none border-l border-border bg-sunken p-0.5 select-none">
          <ScrollPrimitive.Thumb className="relative flex-1 rounded-xs bg-border-strong" />
        </ScrollPrimitive.Scrollbar>
      ) : null}
      <ScrollPrimitive.Corner />
    </ScrollPrimitive.Root>
  )
}

export function Separator({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical'; className?: string }) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
    />
  )
}
