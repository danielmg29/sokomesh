'use client'

import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './icon'

/** Filterable list of options or actions (cmdk). Used by CommandPalette, Combobox and relation pickers. */
export function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive className={cn('flex w-full flex-col overflow-hidden bg-surface text-foreground', className)} {...props} />
}

export function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3" cmdk-input-wrapper="">
      <Icon icon={Search} className="text-muted" />
      <CommandPrimitive.Input
        className={cn('h-11 w-full bg-transparent text-md outline-none placeholder:text-muted focus-visible:shadow-none focus-visible:outline-none', className)}
        {...props}
      />
    </div>
  )
}

export function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List className={cn('max-h-80 overflow-y-auto overscroll-contain p-1', className)} {...props} />
}

export function CommandEmpty({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className={cn('px-3 py-6 text-center text-md text-muted', className)} {...props} />
}

export function CommandGroup({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn('[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-caps [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase', className)}
      {...props}
    />
  )
}

export function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        'flex cursor-default items-center gap-2.5 rounded-xs px-2.5 py-2 text-md outline-none select-none',
        'data-[selected=true]:bg-primary-soft data-[disabled=true]:text-muted',
        className,
      )}
      {...props}
    />
  )
}

export function CommandSeparator() {
  return <CommandPrimitive.Separator className="my-1 h-px bg-border" />
}

export const CommandLoading = CommandPrimitive.Loading
