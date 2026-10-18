'use client'

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { useState } from 'react'
import { DayPicker, type DateRange, type Matcher } from 'react-day-picker'
import { cn } from '@/lib/cn'
import { TIME_ZONE, formatDate } from '@/lib/format'
import { useFieldControlProps } from './form-field'
import { Icon } from './icon'
import { triggerStyles } from './input'

const classNames = {
  root: 'p-3 text-md',
  months: 'flex flex-col gap-4 sm:flex-row',
  month: 'flex flex-col gap-3',
  month_caption: 'flex h-8 items-center justify-center font-display font-bold',
  nav: 'absolute inset-x-3 top-3 flex justify-between',
  button_previous: 'grid size-8 place-items-center rounded-sm hover:bg-sunken disabled:opacity-40',
  button_next: 'grid size-8 place-items-center rounded-sm hover:bg-sunken disabled:opacity-40',
  month_grid: 'border-collapse',
  weekdays: 'flex',
  weekday: 'caps w-9 text-muted',
  week: 'mt-1 flex',
  day: 'size-9 p-0 text-center',
  day_button: 'size-9 rounded-sm tabular hover:bg-sunken aria-selected:font-semibold',
  selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary-hover',
  today: '[&>button]:underline [&>button]:decoration-signal [&>button]:decoration-2 [&>button]:underline-offset-4',
  outside: 'text-muted/70',
  disabled: '[&>button]:cursor-not-allowed [&>button]:text-muted/60 [&>button]:line-through',
  range_middle: '[&>button]:bg-primary-soft [&>button]:text-foreground [&>button]:rounded-none',
  range_start: '[&>button]:rounded-r-none',
  range_end: '[&>button]:rounded-l-none',
}

const components = {
  Chevron: ({ orientation }: { orientation?: 'left' | 'right' | 'up' | 'down' }) => <Icon icon={orientation === 'left' ? ChevronLeft : ChevronRight} />,
}

type CalendarProps =
  | { mode: 'single'; selected?: Date; onSelect?: (d: Date | undefined) => void; disabled?: Matcher | Matcher[]; className?: string; numberOfMonths?: number }
  | { mode: 'range'; selected?: DateRange; onSelect?: (r: DateRange | undefined) => void; disabled?: Matcher | Matcher[]; className?: string; numberOfMonths?: number }

/** Month grid in Nairobi time, weeks starting Monday. */
export function Calendar(props: CalendarProps) {
  const common = { timeZone: TIME_ZONE, weekStartsOn: 1 as const, showOutsideDays: true, classNames, components, className: cn('relative', props.className), numberOfMonths: props.numberOfMonths }
  return props.mode === 'single'
    ? <DayPicker {...common} mode="single" selected={props.selected} onSelect={props.onSelect} disabled={props.disabled} />
    : <DayPicker {...common} mode="range" selected={props.selected} onSelect={props.onSelect} disabled={props.disabled} />
}

/** Date field: typed trigger plus calendar popover. Value is an ISO date (YYYY-MM-DD). */
export function DatePicker({ value, onValueChange, disabled, placeholder = 'Choose a date', notBefore }: {
  value?: string | null; onValueChange?: (iso: string | null) => void; disabled?: boolean; placeholder?: string; notBefore?: Date
}) {
  const field = useFieldControlProps()
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T12:00:00+03:00`) : undefined
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger {...field} disabled={disabled} className={cn(triggerStyles, 'flex h-(--density-control-height) items-center gap-2 px-3 text-left text-md tabular')}>
        <Icon icon={CalendarDays} className="text-muted" />
        <span className={cn(!value && 'text-muted')}>{value ? formatDate(`${value}T12:00:00+03:00`) : placeholder}</span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align="start" sideOffset={4} className="z-50 rounded-sm border border-border-strong bg-surface shadow-overlay data-[state=open]:animate-reveal">
          <Calendar
            mode="single"
            selected={selected}
            disabled={notBefore ? { before: notBefore } : undefined}
            onSelect={d => {
              onValueChange?.(d ? new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d) : null)
              setOpen(false)
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
