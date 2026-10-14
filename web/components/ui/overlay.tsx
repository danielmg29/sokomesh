'use client'

import { Check, ChevronRight } from 'lucide-react'
import { DropdownMenu as MenuPrimitive, Popover as PopoverPrimitive, Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './icon'

const floating = 'z-50 rounded-sm border border-border-strong bg-surface shadow-overlay data-[state=open]:animate-reveal'

export function Popover({ trigger, children, align = 'start', className, open, onOpenChange, label }: {
  trigger: ReactNode; children: ReactNode; align?: 'start' | 'center' | 'end'; className?: string; open?: boolean; onOpenChange?: (o: boolean) => void; label?: string
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align={align} sideOffset={6} aria-label={label} className={cn(floating, 'w-72 p-3', className)}>
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export const PopoverClose = PopoverPrimitive.Close

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={150}>{children}</TooltipPrimitive.Provider>
}

/** Short explanation on hover and focus. Never the only place essential information lives. */
export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6} className="z-50 max-w-64 rounded-xs bg-inverse px-2.5 py-1.5 text-sm text-inverse-foreground data-[state=delayed-open]:animate-reveal">
          {content}
          <TooltipPrimitive.Arrow className="fill-inverse" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export const Menu = MenuPrimitive.Root
export const MenuTrigger = MenuPrimitive.Trigger
export const MenuGroup = MenuPrimitive.Group
export const MenuSub = MenuPrimitive.Sub

export function MenuContent({ className, align = 'end', ...props }: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content align={align} sideOffset={4} className={cn(floating, 'min-w-52 p-1', className)} {...props} />
    </MenuPrimitive.Portal>
  )
}

const item = 'relative flex cursor-default items-center gap-2.5 rounded-xs px-2.5 py-2 text-md outline-none select-none data-disabled:text-muted data-highlighted:bg-primary-soft'

export function MenuItem({ className, tone, icon, hint, ...props }: ComponentProps<typeof MenuPrimitive.Item> & { tone?: 'danger'; icon?: ReactNode; hint?: ReactNode }) {
  return (
    <MenuPrimitive.Item className={cn(item, tone === 'danger' && 'text-tone-danger data-highlighted:bg-tone-danger-bg', className)} {...props}>
      {icon}
      <span className="flex-1">{props.children}</span>
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </MenuPrimitive.Item>
  )
}

export function MenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem className={cn(item, 'pl-8', className)} {...props}>
      <MenuPrimitive.ItemIndicator className="absolute left-2.5 text-primary"><Icon icon={Check} /></MenuPrimitive.ItemIndicator>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn('caps px-2.5 pt-2 pb-1 text-muted', className)} {...props} />
}

export function MenuSeparator() {
  return <MenuPrimitive.Separator className="my-1 h-px bg-border" />
}

export function MenuSubTrigger({ children, className, ...props }: ComponentProps<typeof MenuPrimitive.SubTrigger>) {
  return (
    <MenuPrimitive.SubTrigger className={cn(item, className)} {...props}>
      <span className="flex-1">{children}</span>
      <Icon icon={ChevronRight} className="text-muted" />
    </MenuPrimitive.SubTrigger>
  )
}

export function MenuSubContent({ className, ...props }: ComponentProps<typeof MenuPrimitive.SubContent>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent sideOffset={4} className={cn(floating, 'min-w-48 p-1', className)} {...props} />
    </MenuPrimitive.Portal>
  )
}
