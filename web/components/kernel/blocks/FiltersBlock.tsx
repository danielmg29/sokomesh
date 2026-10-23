'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import type { FieldMeta, ModelMeta } from '@/lib/contract/types'
import type { ComboOption } from '@/components/ui/combobox'
import { FieldFilter } from '../fields/FieldInput'
import type { FilterValue } from '../fields/types'

export type FilterValues = Record<string, FilterValue | undefined>

type Props = {
  meta: ModelMeta
  values: FilterValues
  onChange: (values: FilterValues) => void
  search?: string
  onSearchChange?: (q: string) => void
  /** expanded: a sidebar; collapsed: a button with the active count; sheet: narrow screens. */
  layout?: 'expanded' | 'collapsed' | 'sheet'
  options?: Record<string, readonly ComboOption[]>
  /** Facet counts keyed by field then choice value. */
  counts?: Record<string, Record<string, number>>
  /** Lowest and highest value per range field in the current results, from the list's facets. */
  bounds?: Record<string, { min: string | null; max: string | null } | undefined>
  /** Limit to these filterable fields, in this order (from an override). */
  fields?: readonly string[]
  className?: string
}

/** Human summary of one active filter, for the removable chips. */
function describe(field: FieldMeta, v: FilterValue): string {
  const label = field.label ?? field.name
  if (v.op === 'in' && Array.isArray(v.value)) return `${label}: ${v.value.map(x => field.choices?.find(c => c.value === x)?.label ?? x).join(', ')}`
  if (v.op === 'range' && v.value && typeof v.value === 'object') {
    const r = v.value as { min?: string; max?: string }
    const pre = field.widget === 'currency' ? `${field.currency ?? 'KES'} ` : ''
    return `${label}: ${r.min ? `${pre}${r.min}` : 'any'} to ${r.max ? `${pre}${r.max}` : 'any'}`
  }
  if (v.op === 'eq' && typeof v.value === 'boolean') return `${label}: ${v.value ? 'Yes' : 'No'}`
  if (v.op === 'near') return `${label}: within ${String(v.value)} km`
  return `${label}: ${String(v.value)}`
}

/** Search plus typed filters for every field whose contract metadata declares filter operators. */
export function FiltersBlock({ meta, values, onChange, search, onSearchChange, layout = 'expanded', options = {}, counts, bounds, fields, className }: Props) {
  const [open, setOpen] = useState(false)
  const filterable = (fields ? fields.map(n => meta.fields.find(f => f.name === n)) : meta.fields.filter(f => f.filter?.length))
    .filter((f): f is FieldMeta => Boolean(f))
  const active = filterable.filter(f => values[f.name])
  const set = (name: string, v: FilterValue | undefined) => onChange({ ...values, [name]: v })
  const clearAll = () => onChange({})

  const searchBox = meta.search?.length && onSearchChange ? (
    <Input type="search" aria-label={`Search ${meta.labelPlural ?? meta.label}`} placeholder={`Search ${(meta.labelPlural ?? meta.label).toLowerCase()}…`} prefix={<Icon icon={Search} />} value={search ?? ''} onChange={e => onSearchChange(e.target.value)} />
  ) : null

  const controls = (
    <div className="flex flex-col divide-y divide-border">
      {filterable.map(f => (
        <section key={f.name} className="flex flex-col gap-2.5 py-4 first:pt-0" aria-labelledby={`flt-${f.name}`}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 id={`flt-${f.name}`} className="font-sans text-md font-semibold">{f.label}</h3>
            {values[f.name] ? <button type="button" className="text-sm text-primary hover:underline" onClick={() => set(f.name, undefined)}>Clear</button> : null}
          </div>
          <FieldFilter field={f} value={values[f.name]} onChange={v => set(f.name, v)} options={options[f.name]} counts={counts?.[f.name]} bounds={bounds?.[f.name]} />
        </section>
      ))}
    </div>
  )

  const chips = active.length ? (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {active.map(f => (
        <span key={f.name} className="inline-flex items-center gap-1 rounded-xs border border-signal-border bg-signal-soft py-0.5 pr-1 pl-2 text-sm font-medium motion-reflow">
          {describe(f, values[f.name]!)}
          <button type="button" className="grid size-5 place-items-center rounded-xs hover:bg-signal" aria-label={`Remove filter ${f.label}`} onClick={() => set(f.name, undefined)}>
            <Icon icon={X} />
          </button>
        </span>
      ))}
      <Button variant="link" size="sm" onClick={clearAll}>Clear all</Button>
    </div>
  ) : null

  if (layout === 'expanded') {
    return (
      <aside className={cn('flex min-w-0 flex-col gap-4', className)} aria-label="Filters">
        {searchBox}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Filters</h2>
          {active.length ? <Button variant="link" size="sm" onClick={clearAll}>Clear all ({active.length})</Button> : null}
        </div>
        {controls}
      </aside>
    )
  }

  const trigger = (
    <Button variant="secondary" leadingIcon={SlidersHorizontal} aria-expanded={layout === 'collapsed' ? open : undefined} onClick={layout === 'collapsed' ? () => setOpen(o => !o) : undefined}>
      Filters{active.length ? <Badge emphasis="signal">{active.length}</Badge> : null}
    </Button>
  )
  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 flex-1">{searchBox}</div>
        {layout === 'sheet' ? (
          <Sheet side="bottom" title="Filters" description={`${active.length} active`} trigger={trigger} footer={<><Button variant="secondary" onClick={clearAll}>Clear all</Button><Button variant="primary" asChild><span>Show results</span></Button></>}>
            {controls}
          </Sheet>
        ) : trigger}
      </div>
      {chips}
      {layout === 'collapsed' && open ? <div className="rounded-md border border-border bg-surface p-4 animate-reveal">{controls}</div> : null}
    </div>
  )
}

const direction = (f: FieldMeta, desc: boolean) =>
  f.type === 'decimal' || f.type === 'integer' ? (desc ? 'high to low' : 'low to high')
  : f.type === 'datetime' || f.type === 'date' ? (desc ? 'newest first' : 'oldest first')
  : desc ? 'Z to A' : 'A to Z'

/**
 * "Sort by" over a model's allow-listed ordering (contract `ordering`, e.g. "-updated_at"). Labels come from
 * each field's label and type ("Price per pack, low to high"), so no field name is written here and no sort
 * the backend has not allowed can be chosen.
 */
export function SortSelect({ meta, value, onChange, label = 'Sort by' }: { meta: ModelMeta; value: string; onChange: (value: string) => void; label?: string }) {
  const byName = new Map(meta.fields.map(f => [f.name, f]))
  const options = (meta.ordering ?? []).flatMap(o => {
    const desc = o.startsWith('-')
    const f = byName.get(o.replace(/^-/, ''))
    return f ? [{ value: o, label: `${f.label}, ${direction(f, desc)}` }] : []
  })
  if (!options.length) return null
  return (
    <FormField label={label} className="flex-row items-center gap-2">
      <Select options={options} value={value} onValueChange={onChange} className="w-60" />
    </FormField>
  )
}
