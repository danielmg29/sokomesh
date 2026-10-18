'use client'

import { ChevronDown } from 'lucide-react'
import { Accordion as AccordionPrimitive, Collapsible as CollapsiblePrimitive, Tabs as TabsPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './icon'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, variant = 'line', ...props }: ComponentProps<typeof TabsPrimitive.List> & { variant?: 'line' | 'boxed' }) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex max-w-full overflow-x-auto overflow-y-hidden',
        // The rule is an inset shadow, painted under the triggers, so the active underline covers it without
        // overflowing the scroll box (a negative margin there showed a vertical scrollbar).
        variant === 'line' ? 'gap-5 shadow-[inset_0_-1px_0_var(--color-border)]' : 'gap-0.5 rounded-sm border border-border-strong bg-sunken p-0.5',
        className,
      )}
      data-variant={variant}
      {...props}
    />
  )
}

export function TabsTrigger({ className, count, ...props }: ComponentProps<typeof TabsPrimitive.Trigger> & { count?: ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'group inline-flex shrink-0 items-center gap-2 text-md font-semibold whitespace-nowrap text-muted motion-bind transition-colors hover:text-foreground',
        'in-data-[variant=line]:border-b-2 in-data-[variant=line]:border-transparent in-data-[variant=line]:pb-2.5 in-data-[variant=line]:pt-1',
        'in-data-[variant=line]:data-[state=active]:border-primary in-data-[variant=line]:data-[state=active]:text-foreground',
        'in-data-[variant=boxed]:h-8 in-data-[variant=boxed]:rounded-xs in-data-[variant=boxed]:px-3 in-data-[variant=boxed]:data-[state=active]:bg-surface in-data-[variant=boxed]:data-[state=active]:text-foreground in-data-[variant=boxed]:data-[state=active]:shadow-raised',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {props.children}
      {count !== undefined ? <span className="rounded-xs bg-sunken px-1.5 text-xs tabular group-data-[state=active]:bg-primary-soft group-data-[state=active]:text-primary">{count}</span> : null}
    </TabsPrimitive.Trigger>
  )
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-4 outline-none data-[state=active]:animate-reveal', className)} {...props} />
}

type AccordionItem = { value: string; title: ReactNode; meta?: ReactNode; content: ReactNode }

/** REVEAL groups of dense detail. `single` keeps one open at a time. */
export function Accordion({ items, type = 'multiple', defaultValue, className }: {
  items: AccordionItem[]
  type?: 'single' | 'multiple'
  defaultValue?: string[]
  className?: string
}) {
  const rootClass = cn('divide-y divide-border border-y border-border', className)
  const body = items.map(i => (
    <AccordionPrimitive.Item key={i.value} value={i.value}>
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-3 py-3 text-left font-semibold hover:text-primary">
          <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <span>{i.title}</span>
            {i.meta ? <span className="text-sm font-normal text-muted">{i.meta}</span> : null}
          </span>
          <Icon icon={ChevronDown} className="text-muted motion-reveal transition-transform group-data-[state=open]:rotate-180" />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="pb-4 data-[state=open]:animate-reveal">{i.content}</AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  ))
  return type === 'single'
    ? <AccordionPrimitive.Root type="single" collapsible defaultValue={defaultValue?.[0]} className={rootClass}>{body}</AccordionPrimitive.Root>
    : <AccordionPrimitive.Root type="multiple" defaultValue={defaultValue} className={rootClass}>{body}</AccordionPrimitive.Root>
}

export const Collapsible = CollapsiblePrimitive.Root
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger

export function CollapsibleContent({ className, ...props }: ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return <CollapsiblePrimitive.Content className={cn('data-[state=open]:animate-reveal', className)} {...props} />
}
