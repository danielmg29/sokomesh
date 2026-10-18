'use client'

// Divergent (spec p.55): comparison transposes records into columns aligned on the category
// contract's comparable fields, with sticky labels and explicit gaps. Cells still render through
// the kernel's FieldView, so every widget looks as it does everywhere else.

import type { Route } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { StockAvailabilityIndicator } from '@/components/commerce/stock'
import type { Stock } from '@/components/commerce/types'
import { FieldView } from '@/components/kernel/fields/FieldView'
import type { ImageValue } from '@/components/kernel/fields/types'
import { Switch } from '@/components/ui/choice'
import { Stamp } from '@/components/ui/stamp'
import { cn } from '@/lib/cn'
import type { FieldMeta } from '@/lib/contract/types'
import { formatMoney } from '@/lib/money'

export type CompareProduct = {
  id: string
  name: string
  seller: string
  image?: ImageValue
  unitPrice: string
  unit: string
  /** Normalised by the backend (e.g. price per kg) so columns compare like with like. */
  normalisedPrice?: { amount: string; per: string }
  stock: Stock
  values: Record<string, unknown>
  /** The product's page. */
  href?: Route
  /** What a buyer can do with this column (the page passes add-to-cart for the cheapest pack). */
  action?: ReactNode
}

export function ProductComparisonBlock({ products, fields }: { products: readonly CompareProduct[]; fields: readonly FieldMeta[] }) {
  const [sticky, setSticky] = useState(true)
  const cols = Math.min(4, Math.max(2, products.length))
  const shown = products.slice(0, cols)
  const cheapest = shown.reduce<CompareProduct | null>((best, p) => (p.normalisedPrice && (!best?.normalisedPrice || Number(p.normalisedPrice.amount) < Number(best.normalisedPrice.amount)) ? p : best), null)
  const grid = { gridTemplateColumns: `minmax(9rem,12rem) repeat(${shown.length}, minmax(12rem,1fr))` }
  const label = cn('px-3 py-2.5 text-sm font-semibold text-muted', sticky && 'sticky left-0 z-10 bg-surface')
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Product comparison">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-md text-muted">Comparing {shown.length} products on the category&apos;s comparable attributes. Prices are each product&apos;s cheapest pack today, also per normalised unit so packs of different sizes compare fairly.</p>
        <Switch label="Keep labels visible" checked={sticky} onCheckedChange={setSticky} className="w-auto" />
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-surface" role="table" aria-label="Comparison">
        <div role="rowgroup">
          <div role="row" className="grid border-b border-border" style={grid}>
            <span role="columnheader" className={cn(label, 'self-end')}>Product</span>
            {shown.map(p => (
              <div role="columnheader" key={p.id} className="flex flex-col gap-2 border-l border-border p-3">
                {p.image ? <Image src={p.image.url} alt={p.image.alt} width={240} height={180} className="aspect-[4/3] w-full rounded-sm bg-well object-contain p-3" /> : null}
                {p.href ? <Link href={p.href} className="font-semibold leading-snug hover:text-primary hover:underline">{p.name}</Link> : <span className="font-semibold leading-snug">{p.name}</span>}
                <span className="text-sm text-muted">{p.seller}</span>
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup">
          <div role="row" className="grid border-b border-border" style={grid}>
            <span role="rowheader" className={label}>Price</span>
            {shown.map(p => (
              <div role="cell" key={p.id} className="flex flex-col gap-1 border-l border-border px-3 py-2.5">
                <span className="font-display text-lg font-bold tabular">{formatMoney(p.unitPrice)} <span className="font-sans text-sm font-normal text-muted">/ {p.unit}</span></span>
                {p.normalisedPrice ? <span className="flex flex-wrap items-center gap-1.5 text-sm tabular">{formatMoney(p.normalisedPrice.amount)} per {p.normalisedPrice.per}{cheapest?.id === p.id ? <Stamp tone="signal" size="sm">Lowest per {p.normalisedPrice.per}</Stamp> : null}</span> : <span className="text-sm text-muted">No normalised price</span>}
              </div>
            ))}
          </div>
          <div role="row" className="grid border-b border-border" style={grid}>
            <span role="rowheader" className={label}>Stock</span>
            {shown.map(p => <div role="cell" key={p.id} className="border-l border-border px-3 py-2.5"><StockAvailabilityIndicator stock={p.stock} /></div>)}
          </div>
          {fields.map(f => (
            <div role="row" key={f.name} className="grid border-b border-border last:border-b-0" style={grid}>
              <span role="rowheader" className={label}>{f.label}{f.unit ? <span className="font-normal"> ({f.unit})</span> : null}</span>
              {shown.map(p => {
                const v = p.values[f.name]
                const missing = v === null || v === undefined || v === ''
                return (
                  <div role="cell" key={p.id} className={cn('border-l border-border px-3 py-2.5 text-md', missing && 'bg-sunken/60')}>
                    {missing ? <span className="text-sm text-muted italic">Not stated by seller</span> : <FieldView field={f} value={v} context="comfortable" />}
                  </div>
                )
              })}
            </div>
          ))}
          {shown.some(p => p.action) ? (
            <div role="row" className="grid" style={grid}>
              <span role="rowheader" className={label}><span className="sr-only">Actions</span></span>
              {shown.map(p => <div role="cell" key={p.id} className="flex flex-col gap-2 border-l border-border p-3">{p.action}</div>)}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
