'use client'

import { Search } from 'lucide-react'
import { Checkbox, Segmented } from '@/components/ui/choice'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/calendar'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { KENYA_COUNTIES } from '@/lib/kenya'
import { asString, asStringList, type FilterProps, type FilterValue } from './types'

type Range = { min?: string; max?: string }

const asRange = (v: FilterValue | undefined): Range => (v && typeof v.value === 'object' && v.value !== null ? (v.value as Range) : {})
const rangeInvalid = (r: Range) => r.min !== undefined && r.max !== undefined && r.min !== '' && r.max !== '' && Number(r.min) > Number(r.max)

export function TextFilter({ field, value, onChange }: FilterProps) {
  return (
    <Input
      type="search"
      aria-label={`Filter by ${field.label ?? field.name}`}
      prefix={<Icon icon={Search} />}
      placeholder={`Contains…`}
      value={asString(value?.value) ?? ''}
      onChange={e => onChange(e.target.value ? { op: 'contains', value: e.target.value } : undefined)}
    />
  )
}

/** Checkbox list for finite choices (`in`). Active choices show first-class; none means "any". */
export function ChoiceFilter({ field, value, onChange, counts }: FilterProps) {
  const selected = asStringList(value?.value)
  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]
    onChange(next.length ? { op: 'in', value: next } : undefined)
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{field.label ?? field.name}</legend>
      {(field.choices ?? []).map(c => (
        <Checkbox
          key={c.value}
          label={counts ? <span className="flex w-full justify-between gap-3">{c.label}<span className="font-normal text-muted tabular">{counts[c.value] ?? 0}</span></span> : c.label}
          checked={selected.includes(c.value)}
          disabled={counts !== undefined && !counts[c.value] && !selected.includes(c.value)}
          onCheckedChange={() => toggle(c.value)}
        />
      ))}
    </fieldset>
  )
}

export function BooleanFilter({ field, value, onChange }: FilterProps) {
  const current = value?.value === true ? 'yes' : value?.value === false ? 'no' : 'any'
  return (
    <Segmented
      label={field.label ?? field.name}
      value={current}
      onValueChange={v => onChange(v === 'any' ? undefined : { op: 'eq', value: v === 'yes' })}
      items={[{ value: 'any', label: 'Any' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
    />
  )
}

/** Min/max for money, quantities and numbers (`range`). Flags a minimum above the maximum. */
export function RangeFilter({ field, value, onChange }: FilterProps) {
  const r = asRange(value)
  const set = (patch: Range) => {
    const next = { ...r, ...patch }
    onChange(next.min || next.max ? { op: 'range', value: next } : undefined)
  }
  const prefix = field.widget === 'currency' ? (field.currency ?? 'KES') : undefined
  const suffix = field.widget === 'quantity' ? field.unit : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label={`Minimum ${field.label ?? ''}`} inputMode="decimal" placeholder="Min" prefix={prefix} suffix={suffix} value={r.min ?? ''} onChange={e => set({ min: e.target.value.replace(/[^\d.]/g, '') })} aria-invalid={rangeInvalid(r) || undefined} />
        <Input aria-label={`Maximum ${field.label ?? ''}`} inputMode="decimal" placeholder="Max" prefix={prefix} suffix={suffix} value={r.max ?? ''} onChange={e => set({ max: e.target.value.replace(/[^\d.]/g, '') })} aria-invalid={rangeInvalid(r) || undefined} />
      </div>
      {rangeInvalid(r) ? <p className="text-sm font-medium text-tone-danger" role="alert">The minimum is above the maximum.</p> : null}
    </div>
  )
}

export function DateRangeFilter({ field, value, onChange }: FilterProps) {
  const r = asRange(value)
  const set = (patch: Range) => {
    const next = { ...r, ...patch }
    onChange(next.min || next.max ? { op: 'range', value: next } : undefined)
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label={field.label ?? field.name}>
      <DatePicker value={r.min ?? null} onValueChange={v => set({ min: v ?? undefined })} placeholder="From" />
      <DatePicker value={r.max ?? null} onValueChange={v => set({ max: v ?? undefined })} placeholder="To" />
      {rangeInvalid({ min: r.min?.replace(/-/g, ''), max: r.max?.replace(/-/g, '') }) ? <p className="text-sm font-medium text-tone-danger sm:col-span-2" role="alert">The start date is after the end date.</p> : null}
    </div>
  )
}

export function RelationFilter({ value, onChange, options = [] }: FilterProps) {
  return <Combobox options={options} value={asString(value?.value)} onValueChange={v => onChange(v ? { op: 'eq', value: v } : undefined)} placeholder="Any" />
}

const counties = KENYA_COUNTIES.map(c => ({ value: c, label: c }))

export function RegionFilter({ value, onChange }: FilterProps) {
  return <Combobox options={counties} value={asString(value?.value)} onValueChange={v => onChange(v ? { op: 'eq', value: v } : undefined)} placeholder="Any county" />
}

const radii = [{ value: 'any', label: 'Anywhere' }, { value: '10', label: '10 km' }, { value: '25', label: '25 km' }, { value: '50', label: '50 km' }] as const

export function NearFilter({ field, value, onChange }: FilterProps) {
  const current = asString(value?.value) ?? 'any'
  return (
    <Segmented
      label={`${field.label ?? 'Distance'} from your delivery address`}
      size="sm"
      value={current as (typeof radii)[number]['value']}
      onValueChange={v => onChange(v === 'any' ? undefined : { op: 'near', value: v })}
      items={radii}
    />
  )
}
