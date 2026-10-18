'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useFieldControlProps } from './form-field'
import { Icon } from './icon'
import { triggerStyles } from './input'

export type SelectOption = { value: string; label: string; disabled?: boolean; description?: string }

type SelectProps = {
  options: readonly SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  name?: string
  className?: string
  renderValue?: (option: SelectOption) => ReactNode
}

/** Finite choice. Options come from contract choices; labels are the backend's. */
export function Select({ options, value, defaultValue, onValueChange, placeholder = 'Choose…', disabled, name, className, renderValue }: SelectProps) {
  const field = useFieldControlProps()
  const current = options.find(o => o.value === value)
  return (
    <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled} name={name}>
      <SelectPrimitive.Trigger
        {...field}
        className={cn(triggerStyles, 'flex h-(--density-control-height) items-center justify-between gap-2 px-3 text-left text-md data-placeholder:text-muted', className)}
      >
        <SelectPrimitive.Value placeholder={placeholder}>{current && renderValue ? renderValue(current) : undefined}</SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <Icon icon={ChevronDown} className="text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-sm border border-border-strong bg-surface shadow-overlay animate-reveal"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map(o => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex cursor-default flex-col rounded-xs py-2 pr-3 pl-8 text-md outline-none select-none data-disabled:text-muted data-highlighted:bg-primary-soft data-[state=checked]:font-semibold"
              >
                <SelectPrimitive.ItemIndicator className="absolute top-2.5 left-2 text-primary">
                  <Icon icon={Check} />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                {o.description ? <span className="text-sm text-muted">{o.description}</span> : null}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
