'use client'

import { Check, Minus } from 'lucide-react'
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive, ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useFieldControlProps } from './form-field'
import { Icon } from './icon'

type CheckboxProps = {
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
  disabled?: boolean
  label?: ReactNode
  description?: ReactNode
  name?: string
  /** Accessible name when there is no visible label (e.g. row selection). */
  'aria-label'?: string
  className?: string
}

/** BIND: the box fills and the mark lands in one short motion. Supports indeterminate. */
export function Checkbox({ label, description, className, ...props }: CheckboxProps) {
  const id = useId()
  const field = useFieldControlProps()
  const box = (
    <CheckboxPrimitive.Root
      id={label ? id : field.id}
      aria-describedby={field['aria-describedby']}
      className={cn(
        'peer grid size-5 shrink-0 place-items-center rounded-xs border border-border-strong bg-surface text-primary-foreground',
        'motion-bind transition-[background-color,border-color]',
        'hover:border-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
        'disabled:cursor-not-allowed disabled:border-border disabled:bg-sunken',
        !label && className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="animate-stamp">
        <Icon icon={props.checked === 'indeterminate' ? Minus : Check} strokeWidth={3} className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
  if (!label) return box
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <div className="pt-px">{box}</div>
      <div className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={id} className="text-md font-medium has-[~*]:mb-0 peer-disabled:text-muted">{label}</label>
        {description ? <span className="text-sm text-muted">{description}</span> : null}
      </div>
    </div>
  )
}

type SwitchProps = {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  label: ReactNode
  description?: ReactNode
  /** State words read beside the track, so on/off never relies on position or colour. */
  stateLabels?: [on: string, off: string]
  className?: string
}

export function Switch({ label, description, stateLabels = ['On', 'Off'], className, checked, defaultChecked, ...props }: SwitchProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col">
        <label htmlFor={id} className="text-md font-medium">{label}</label>
        {description ? <span className="text-sm text-muted">{description}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <SwitchPrimitive.Root
          id={id}
          checked={checked}
          defaultChecked={defaultChecked}
          className={cn(
            'peer relative inline-flex h-6 w-11 shrink-0 items-center rounded-xs border border-border-strong bg-sunken p-0.5',
            'motion-bind transition-[background-color,border-color] data-[state=checked]:border-primary data-[state=checked]:bg-primary',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
          {...props}
        >
          <SwitchPrimitive.Thumb className="block size-4.5 rounded-xs bg-surface shadow-raised motion-bind transition-transform data-[state=checked]:translate-x-5" />
        </SwitchPrimitive.Root>
        {/* Visible state words; the switch role already announces on/off to assistive tech. */}
        <span aria-hidden="true" className="w-8 text-sm font-semibold text-muted peer-data-[state=checked]:hidden">{stateLabels[1]}</span>
        <span aria-hidden="true" className="hidden w-8 text-sm font-semibold text-primary peer-data-[state=checked]:inline">{stateLabels[0]}</span>
      </div>
    </div>
  )
}

type RadioOption = { value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }

export function RadioGroup({ options, value, defaultValue, onValueChange, orientation = 'vertical', className, name, 'aria-label': ariaLabel }: {
  options: RadioOption[]; value?: string; defaultValue?: string; onValueChange?: (v: string) => void; orientation?: 'vertical' | 'horizontal'; className?: string; name?: string; 'aria-label'?: string
}) {
  const base = useId()
  return (
    <RadioPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      orientation={orientation}
      name={name}
      aria-label={ariaLabel}
      className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap', className)}
    >
      {options.map(o => (
        <div key={o.value} className="flex items-start gap-2.5">
          <RadioPrimitive.Item
            id={`${base}-${o.value}`}
            value={o.value}
            disabled={o.disabled}
            className="mt-px grid size-5 shrink-0 place-items-center rounded-full border border-border-strong bg-surface hover:border-foreground data-[state=checked]:border-primary disabled:cursor-not-allowed disabled:bg-sunken"
          >
            <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-primary animate-stamp" />
          </RadioPrimitive.Item>
          <label htmlFor={`${base}-${o.value}`} className="flex flex-col text-md font-medium">
            {o.label}
            {o.description ? <span className="text-sm font-normal text-muted">{o.description}</span> : null}
          </label>
        </div>
      ))}
    </RadioPrimitive.Root>
  )
}

/**
 * Segmented control: one choice among a few views or modes (e.g. MARKET / LEDGER / FLOW).
 * `tone="chrome"` sits on a masthead; the default sits on surfaces.
 */
export function Segmented<T extends string>({ items, value, onValueChange, label, size = 'md', tone = 'default', className }: {
  items: readonly { value: T; label: ReactNode }[]; value: T; onValueChange: (v: T) => void; label: string; size?: 'sm' | 'md'; tone?: 'default' | 'chrome'; className?: string
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={v => { if (v) onValueChange(v as T) }}
      aria-label={label}
      className={cn('inline-flex max-w-full overflow-x-auto rounded-sm border p-0.5 [scrollbar-width:thin]', tone === 'chrome' ? 'border-chrome-muted/50' : 'border-border-strong bg-surface', className)}
    >
      {items.map(i => (
        <ToggleGroupPrimitive.Item
          key={i.value}
          value={i.value}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-xs px-3 font-semibold whitespace-nowrap motion-bind transition-[color,background-color,transform] active:translate-y-px',
            tone === 'chrome'
              ? 'text-chrome-muted hover:text-chrome-foreground data-[state=on]:bg-chrome-foreground data-[state=on]:text-chrome'
              : 'text-muted hover:text-foreground data-[state=on]:bg-inverse data-[state=on]:text-inverse-foreground',
            size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm',
            'pointer-coarse:h-(--touch-target)',
          )}
        >
          {i.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}
