'use client'

import { Progress as ProgressPrimitive, Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/** Placeholder for loading content. Reserves the final size so nothing shifts. */
export function Skeleton({ className, label }: { className?: string; label?: string }) {
  return <span role={label ? 'status' : undefined} aria-label={label} className={cn('block rounded-xs bg-sunken animate-skeleton', className)} />
}

/** Determinate progress (uploads, fulfilment counts) or indeterminate when value is null. */
export function Progress({ value, max = 100, label, tone = 'primary', className }: { value: number | null; max?: number; label: string; tone?: 'primary' | 'warning' | 'danger'; className?: string }) {
  const pct = value === null ? null : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <ProgressPrimitive.Root value={value} max={max} aria-label={label} className={cn('relative h-1.5 w-full overflow-hidden rounded-xs bg-sunken', className)}>
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full motion-thread transition-[width]',
          tone === 'primary' && 'bg-primary', tone === 'warning' && 'bg-tone-warning', tone === 'danger' && 'bg-tone-danger',
          pct === null && 'w-1/3 animate-skeleton',
        )}
        style={pct === null ? undefined : { width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

/** Range slider with two thumbs for price filters. Values are whole currency units. */
export function RangeSlider({ min, max, step = 1, value, onValueChange, onValueCommit, label, formatValue }: {
  min: number; max: number; step?: number; value: [number, number]; onValueChange: (v: [number, number]) => void
  /** When the thumb is released (or moved by keyboard): the moment to apply the range. */
  onValueCommit?: (v: [number, number]) => void
  label: string; formatValue: (n: number) => string
}) {
  return (
    <div className="flex flex-col gap-2">
      <SliderPrimitive.Root
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={v => onValueChange([v[0]!, v[1]!])}
        onValueCommit={onValueCommit ? v => onValueCommit([v[0]!, v[1]!]) : undefined}
        aria-label={label}
        className="relative flex h-5 w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track className="relative h-1 grow bg-sunken">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        {value.map((v, i) => (
          <SliderPrimitive.Thumb
            key={i}
            aria-label={`${label} ${i === 0 ? 'minimum' : 'maximum'}`}
            aria-valuetext={formatValue(v)}
            className="block size-4 rounded-xs border-2 border-primary bg-surface shadow-raised hover:bg-primary-soft"
          />
        ))}
      </SliderPrimitive.Root>
      <div className="flex justify-between text-sm tabular text-muted">
        <span>{formatValue(value[0])}</span>
        <span>{formatValue(value[1])}</span>
      </div>
    </div>
  )
}
