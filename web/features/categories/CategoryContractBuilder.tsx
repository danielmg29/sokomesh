'use client'

// Divergent (spec p.55): authoring a category contract is a schema editor, not a record form,
// so it cannot be projected from metadata. It still renders its previews with the kernel's
// field, filter and form renderers, so "one contract drives every surface" is shown, not claimed.

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { FieldFilter, FieldInput } from '@/components/kernel/fields/FieldInput'
import type { FilterValue } from '@/components/kernel/fields/types'
import { Button, IconButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/choice'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/disclosure'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Stamp } from '@/components/ui/stamp'
import { TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import type { FieldMeta } from '@/lib/contract/types'

export type Attribute = {
  key: string
  label: string
  type: 'enum' | 'decimal' | 'integer' | 'string' | 'boolean'
  unit?: string
  required: boolean
  facet: boolean
  comparable: boolean
  choices?: string[]
}

type Status = 'draft' | 'published'

const typeOptions = [
  { value: 'enum', label: 'Choice' }, { value: 'decimal', label: 'Measurement' }, { value: 'integer', label: 'Count' }, { value: 'string', label: 'Text' }, { value: 'boolean', label: 'Yes / no' },
]

/** The derived field metadata a published contract emits for each attribute. */
export function attributeToField(a: Attribute): FieldMeta {
  const widget = a.type === 'enum' ? 'select' : a.type === 'decimal' ? 'decimal' : a.type === 'integer' ? 'integer' : a.type === 'boolean' ? 'boolean' : 'text'
  return {
    name: a.key, label: a.label, type: a.type === 'string' ? 'string' : a.type, widget, required: a.required, unit: a.unit, decimalPlaces: a.type === 'decimal' ? 2 : undefined,
    choices: a.choices?.map(c => ({ value: c.toLowerCase().replace(/\s+/g, '_'), label: c })),
    filter: a.facet ? (a.type === 'enum' ? ['in'] : a.type === 'boolean' ? ['eq'] : ['range']) : [],
  }
}

function problems(attrs: readonly Attribute[]) {
  const out: Record<string, string> = {}
  const seen = new Set<string>()
  for (const a of attrs) {
    if (!/^[a-z][a-z0-9_]*$/.test(a.key)) out[a.key] = 'Keys use lowercase letters, numbers and underscores.'
    else if (seen.has(a.key)) out[a.key] = 'Another attribute already uses this key.'
    else if (a.facet && a.type === 'string') out[a.key] = 'Free text cannot be a buyer filter; make it a choice.'
    else if (a.type === 'enum' && !a.choices?.length) out[a.key] = 'Add at least one choice.'
    seen.add(a.key)
  }
  return out
}

export function CategoryContractBuilder({ category, version, attributes: initial, status: initialStatus = 'draft' }: { category: string; version: number; attributes: readonly Attribute[]; status?: Status }) {
  const [attrs, setAttrs] = useState<Attribute[]>([...initial])
  const [status, setStatus] = useState<Status>(initialStatus)
  const [sample, setSample] = useState<Record<string, unknown>>({})
  const [facets, setFacets] = useState<Record<string, FilterValue | undefined>>({})
  const errors = problems(attrs)
  const invalid = Object.keys(errors).length > 0
  const published = status === 'published'
  const fields = attrs.map(attributeToField)
  const update = (i: number, patch: Partial<Attribute>) => { setAttrs(list => list.map((a, j) => (j === i ? { ...a, ...patch } : a))); if (published) setStatus('draft') }
  const look = published ? { tone: 'success' as const, label: `Published v${version}` } : invalid ? { tone: 'danger' as const, label: 'Invalid' } : { tone: 'info' as const, label: `Draft v${version + 1}` }

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4" aria-label={`Category contract: ${category}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col"><h3 className="font-display text-xl font-bold">{category}</h3><span className="text-sm text-muted">Category contract. Published versions are immutable; edits create the next draft.</span></div>
        <div className="flex items-center gap-2">
          <Stamp tone={look.tone} fresh={published}>{look.label}</Stamp>
          <Button variant="primary" size="sm" disabled={invalid || published} onClick={() => setStatus('published')}>Publish v{version + 1}</Button>
        </div>
      </div>
      <Tabs defaultValue="attributes">
        <TabsList>
          <TabsTrigger value="attributes" count={attrs.length}>Attributes</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="facets" count={attrs.filter(a => a.facet).length}>Facets</TabsTrigger>
          <TabsTrigger value="comparison" count={attrs.filter(a => a.comparable).length}>Comparison</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
        </TabsList>
        <TabsContent value="attributes" className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-sm border border-border" data-density="compact">
            <Table caption="Attributes">
              <THead><tr><Th>Key</Th><Th>Label</Th><Th>Type</Th><Th>Unit</Th><Th>Required</Th><Th>Filter</Th><Th>Compare</Th><Th><span className="sr-only">Remove</span></Th></tr></THead>
              <TBody>
                {attrs.map((a, i) => (
                  <Tr key={i} className={cn(errors[a.key] && 'bg-tone-danger-bg/30')}>
                    <Td><Input aria-label={`Key for ${a.label}`} value={a.key} onChange={e => update(i, { key: e.target.value })} className="h-8 w-36 font-mono text-sm" aria-invalid={Boolean(errors[a.key]) || undefined} />{errors[a.key] ? <p className="mt-1 max-w-48 text-xs font-medium text-tone-danger">{errors[a.key]}</p> : null}</Td>
                    <Td><Input aria-label={`Label for ${a.key}`} value={a.label} onChange={e => update(i, { label: e.target.value })} className="h-8 w-40" /></Td>
                    <Td><div className="w-36"><Select options={typeOptions} value={a.type} onValueChange={v => update(i, { type: v as Attribute['type'] })} /></div></Td>
                    <Td><Input aria-label={`Unit for ${a.key}`} value={a.unit ?? ''} onChange={e => update(i, { unit: e.target.value || undefined })} className="h-8 w-20" disabled={a.type === 'enum' || a.type === 'boolean' || a.type === 'string'} /></Td>
                    <Td><Checkbox aria-label={`${a.label} required`} checked={a.required} onCheckedChange={c => update(i, { required: c === true })} /></Td>
                    <Td><Checkbox aria-label={`${a.label} is a buyer filter`} checked={a.facet} onCheckedChange={c => update(i, { facet: c === true })} /></Td>
                    <Td><Checkbox aria-label={`${a.label} is compared`} checked={a.comparable} onCheckedChange={c => update(i, { comparable: c === true })} /></Td>
                    <Td><IconButton icon={Trash2} label={`Remove ${a.label}`} size="icon-sm" onClick={() => { setAttrs(list => list.filter((_, j) => j !== i)); setStatus('draft') }} /></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <Button size="sm" variant="secondary" leadingIcon={Plus} className="self-start" onClick={() => { setAttrs(list => [...list, { key: `attribute_${list.length + 1}`, label: 'New attribute', type: 'enum', required: false, facet: false, comparable: false, choices: ['Option A'] }]); setStatus('draft') }}>Add attribute</Button>
        </TabsContent>
        <TabsContent value="units">
          <ul className="flex flex-col divide-y divide-border rounded-sm border border-border text-md">
            {attrs.filter(a => a.unit).map(a => <li key={a.key} className="flex justify-between px-3 py-2"><span>{a.label}</span><span className="text-muted">stored in <b className="font-semibold text-foreground">{a.unit}</b> · compared per {a.unit}</span></li>)}
          </ul>
        </TabsContent>
        <TabsContent value="facets">
          <p className="mb-3 text-md text-muted">Buyers filter search results by these attributes. The preview uses the same filter renderers as the storefront.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.filter(f => f.filter?.length).map(f => (
              <div key={f.name} className="flex flex-col gap-2 rounded-sm border border-border p-3"><span className="font-semibold">{f.label}</span><FieldFilter field={f} value={facets[f.name]} onChange={v => setFacets(s => ({ ...s, [f.name]: v }))} /></div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="comparison">
          <ol className="flex flex-col divide-y divide-border rounded-sm border border-border text-md">
            {attrs.filter(a => a.comparable).map((a, i) => <li key={a.key} className="flex justify-between px-3 py-2"><span><span className="mr-2 text-muted tabular">{i + 1}</span>{a.label}</span>{a.unit ? <span className="text-muted">normalised to {a.unit}</span> : null}</li>)}
          </ol>
        </TabsContent>
        <TabsContent value="display">
          <p className="text-md text-muted">Card meta shows the first two comparable attributes; the detail page shows all of them in contract order.</p>
        </TabsContent>
      </Tabs>
      <section className="flex flex-col gap-3 border-t border-border pt-4" aria-label="Derived surfaces">
        <h4 className="font-sans text-md font-semibold">What this contract generates</h4>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3 rounded-sm border border-border bg-background p-3">
            <span className="caps text-muted">Seller form</span>
            {fields.map(f => <FieldInput key={f.name} field={f} value={sample[f.name] ?? null} onChange={v => setSample(s => ({ ...s, [f.name]: v }))} mirror={false} />)}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 rounded-sm border border-border bg-background p-3"><span className="caps text-muted">Export columns</span><code className="font-mono text-sm break-words">sku,name,{attrs.map(a => a.key).join(',')},price_kes,available</code></div>
            <div className="flex flex-col gap-1.5 rounded-sm border border-border bg-background p-3"><span className="caps text-muted">Buyer filters</span><span className="text-md">{fields.filter(f => f.filter?.length).map(f => f.label).join(' · ') || 'None'}</span></div>
            <div className="flex flex-col gap-1.5 rounded-sm border border-border bg-background p-3"><span className="caps text-muted">Comparison rows</span><span className="text-md">{attrs.filter(a => a.comparable).map(a => a.label).join(' · ') || 'None'}</span></div>
          </div>
        </div>
      </section>
    </section>
  )
}
