'use client'

import { Check, ChevronsUpDown, LoaderCircle, X } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command'
import { useFieldControlProps } from './form-field'
import { Icon } from './icon'
import { triggerStyles } from './input'

export type ComboOption = { value: string; label: string; description?: string; disabled?: boolean; reason?: string }

type BaseProps = {
  options: readonly ComboOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: ReactNode
  loading?: boolean
  disabled?: boolean
  /** Server-side search: called as the query changes; options are then the server's results. */
  onSearch?: (query: string) => void
  className?: string
}

function Trigger({ children, open, disabled, className }: { children: ReactNode; open: boolean; disabled?: boolean; className?: string }) {
  const field = useFieldControlProps()
  return (
    <PopoverPrimitive.Trigger
      {...field}
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      className={cn(triggerStyles, 'flex min-h-(--density-control-height) items-center justify-between gap-2 px-3 py-1 text-left text-md', className)}
    >
      {children}
      <Icon icon={ChevronsUpDown} className="text-muted" />
    </PopoverPrimitive.Trigger>
  )
}

function Options({ options, selected, onPick, emptyText, loading, searchPlaceholder, onSearch, maxReached }: {
  options: readonly ComboOption[]; selected: (v: string) => boolean; onPick: (v: string) => void; emptyText: ReactNode; loading?: boolean; searchPlaceholder: string; onSearch?: (q: string) => void; maxReached?: boolean
}) {
  return (
    <Command shouldFilter={!onSearch}>
      <CommandInput placeholder={searchPlaceholder} onValueChange={onSearch} />
      <CommandList>
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-4 text-md text-muted" role="status"><Icon icon={LoaderCircle} className="animate-spin" />Searching…</div>
        ) : (
          <CommandEmpty>{emptyText}</CommandEmpty>
        )}
        <CommandGroup>
          {options.map(o => {
            const isSelected = selected(o.value)
            const blocked = o.disabled || (maxReached && !isSelected)
            return (
              <CommandItem key={o.value} value={`${o.label} ${o.value}`} disabled={blocked} onSelect={() => onPick(o.value)}>
                <Icon icon={Check} className={cn('text-primary', !isSelected && 'invisible')} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{o.label}</span>
                  {o.description || (o.disabled && o.reason) ? <span className="truncate text-sm text-muted">{o.disabled && o.reason ? o.reason : o.description}</span> : null}
                </span>
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

/** Searchable single choice (relations, long option lists). */
export function Combobox({ options, value, onValueChange, placeholder = 'Search and choose…', searchPlaceholder = 'Type to search', emptyText = 'No matches.', loading, disabled, onSearch, className }: BaseProps & { value?: string | null; onValueChange?: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Trigger open={open} disabled={disabled} className={className}>
        <span className={cn('truncate', !current && 'text-muted')}>{current?.label ?? placeholder}</span>
      </Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align="start" sideOffset={4} className="z-50 w-(--radix-popover-trigger-width) min-w-64 overflow-hidden rounded-sm border border-border-strong bg-surface shadow-overlay data-[state=open]:animate-reveal">
          <Options
            options={options}
            selected={v => v === value}
            onPick={v => { onValueChange?.(v === value ? null : v); setOpen(false) }}
            emptyText={emptyText}
            loading={loading}
            searchPlaceholder={searchPlaceholder}
            onSearch={onSearch}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/** Searchable multiple choice with a bounded maximum (contract limit). */
export function MultiSelect({ options, value = [], onValueChange, max, placeholder = 'Choose one or more…', searchPlaceholder = 'Type to search', emptyText = 'No matches.', loading, disabled, onSearch, className }: BaseProps & { value?: string[]; onValueChange?: (v: string[]) => void; max?: number }) {
  const [open, setOpen] = useState(false)
  const chosen = value.map(v => options.find(o => o.value === v)).filter((o): o is ComboOption => Boolean(o))
  const maxReached = max !== undefined && value.length >= max
  const toggle = (v: string) => onValueChange?.(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  return (
    <div className="flex flex-col gap-1.5">
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <Trigger open={open} disabled={disabled} className={className}>
          <span className={cn('truncate', !chosen.length && 'text-muted')}>
            {chosen.length ? `${chosen.length} selected` : placeholder}
          </span>
        </Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content align="start" sideOffset={4} className="z-50 w-(--radix-popover-trigger-width) min-w-64 overflow-hidden rounded-sm border border-border-strong bg-surface shadow-overlay data-[state=open]:animate-reveal">
            <Options options={options} selected={v => value.includes(v)} onPick={toggle} emptyText={emptyText} loading={loading} searchPlaceholder={searchPlaceholder} onSearch={onSearch} maxReached={maxReached} />
            {max !== undefined ? (
              <p className={cn('border-t border-border px-3 py-2 text-sm', maxReached ? 'font-semibold text-tone-warning' : 'text-muted')} aria-live="polite">
                {value.length} of {max} chosen{maxReached ? ' · remove one to add another' : ''}
              </p>
            ) : null}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {chosen.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected">
          {chosen.map(o => (
            <li key={o.value} className="inline-flex items-center gap-1 rounded-xs border border-border-strong bg-sunken py-0.5 pr-1 pl-2 text-sm font-medium">
              {o.label}
              <button type="button" disabled={disabled} onClick={() => toggle(o.value)} className="grid size-5 place-items-center rounded-xs text-muted hover:bg-surface hover:text-foreground" aria-label={`Remove ${o.label}`}>
                <Icon icon={X} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
