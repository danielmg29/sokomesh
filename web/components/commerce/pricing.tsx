'use client'

import { ArrowRight, Info, Pencil, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { unitLabel } from '@/components/kernel/fields/types'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/disclosure'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Stamp } from '@/components/ui/stamp'
import { ScrollArea, TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/contract/types'
import { formatDate } from '@/lib/format'
import { addMoney, compareMoney, formatAmount, formatMoney, multiplyMoney, percentChange } from '@/lib/money'
import type { Money, PriceTier, Stock } from './types'
import { StockAvailabilityIndicator } from './stock'

const range = (t: PriceTier, unit: string) => (t.maxQuantity ? `${t.minQuantity} to ${t.maxQuantity}` : `${t.minQuantity}+`) + ` ${unitLabel(unit, 2)}`

/** Quantity tiers with the buyer's active tier marked; `previous` shows a repricing diff. */
export function PriceTierTable({ tiers, unit, quantity, previous, density = 'comfortable', explanation, currency = 'KES' }: {
  tiers: readonly PriceTier[]; unit: string; quantity?: number; previous?: readonly PriceTier[]; density?: 'compact' | 'comfortable'; explanation?: string; currency?: string
}) {
  const active = quantity === undefined ? -1 : tiers.findIndex(t => quantity >= t.minQuantity && (t.maxQuantity === undefined || quantity <= t.maxQuantity))
  const base = tiers[0]?.unitPrice
  return (
    <div className="flex flex-col gap-2" data-density={density}>
      <ScrollArea className="rounded-md border border-border bg-surface" label={`Price per ${unit} by quantity`}>
        <Table caption={`Price per ${unit} by quantity`}>
          <THead><tr><Th>Quantity</Th><Th numeric>Price per {unit} ({currency})</Th><Th numeric>Saving</Th></tr></THead>
          <TBody>
            {tiers.map((t, i) => {
              const before = previous?.[i]?.unitPrice
              const changed = before !== undefined && compareMoney(before, t.unitPrice) !== 0
              return (
                <Tr key={t.minQuantity} selected={i === active}>
                  <Td className="font-medium whitespace-nowrap">{range(t, unit)}{i === active ? <Stamp tone="signal" size="sm" className="ml-2">Your price</Stamp> : null}</Td>
                  <Td numeric className="whitespace-nowrap">
                    {changed ? <><del className="mr-2 text-muted">{formatAmount(before!)}</del><ins className="font-semibold no-underline">{formatAmount(t.unitPrice)}</ins></> : <span className={cn(i === active && 'font-semibold')}>{formatAmount(t.unitPrice)}</span>}
                  </Td>
                  <Td numeric className="text-muted">{base && i > 0 ? percentChange(base, t.unitPrice) : 'Base price'}</Td>
                </Tr>
              )
            })}
          </TBody>
        </Table>
      </ScrollArea>
      {explanation ? <p className="flex items-start gap-1.5 text-sm text-muted"><Icon icon={Info} className="mt-0.5" />{explanation}</p> : null}
    </div>
  )
}

export type PriceRule = {
  id: string
  scope: 'base' | 'buyer-group' | 'quantity-tier'
  label: string
  buyerGroup?: string
  unitPrice?: Money
  tiers?: PriceTier[]
  /** Absent for the list price, which always applies unless a rule does. */
  effectiveFrom?: string
  effectiveTo?: string
  state: 'active' | 'future' | 'expired' | 'off' | 'conflict'
  priority: number
  conflictNote?: string
  /** A second line under the label: the SKU, the quantity it starts at. */
  detail?: string
  /** The list price is edited with the pack, not here. */
  locked?: boolean
}

const ruleLook: Record<PriceRule['state'], { tone: Tone; label: string }> = {
  active: { tone: 'success', label: 'Active' }, future: { tone: 'info', label: 'Starts later' }, expired: { tone: 'neutral', label: 'Expired' },
  off: { tone: 'neutral', label: 'Switched off' }, conflict: { tone: 'danger', label: 'Conflict' },
}

/**
 * Seller price books. The backend resolves one explainable price; the editor shows every rule that
 * competes. `ruleActions` adds per-rule controls (switch off, on); `toolbar` the add-rule control.
 */
export function PriceBookEditor({ rules, unit, product, mode: initialMode = 'view', onSave, ruleActions, toolbar, saving }: {
  rules: readonly PriceRule[]; unit: string; product: string; mode?: 'view' | 'edit'; onSave?: (id: string, unitPrice: Money) => void
  ruleActions?: (rule: PriceRule) => ReactNode; toolbar?: ReactNode; saving?: string | null
}) {
  const [mode, setMode] = useState(initialMode)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const scopes = [
    { value: 'base', label: 'Base price' }, { value: 'buyer-group', label: 'Buyer groups' }, { value: 'quantity-tier', label: 'Quantity tiers' },
  ] as const
  const conflicts = rules.filter(r => r.state === 'conflict')
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-surface p-4" aria-label={`Price book for ${product}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">Price book · {product}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {onSave ? <Button size="sm" variant={mode === 'edit' ? 'primary' : 'secondary'} leadingIcon={Pencil} aria-pressed={mode === 'edit'} onClick={() => setMode(m => (m === 'edit' ? 'view' : 'edit'))}>{mode === 'edit' ? 'Done editing' : 'Edit prices'}</Button> : null}
        </div>
      </div>
      {conflicts.length ? (
        <div role="alert" className="flex items-start gap-2 rounded-sm border border-tone-danger bg-tone-danger-bg/50 p-3 text-md">
          <Icon icon={TriangleAlert} className="mt-0.5 text-tone-danger" />
          <span>{conflicts.length} rule{conflicts.length > 1 ? 's overlap' : ' overlaps'} another for the same buyers and dates. Buyers see the higher-priority price until you end one of them.</span>
        </div>
      ) : null}
      <Tabs defaultValue="base">
        <TabsList>{scopes.map(s => <TabsTrigger key={s.value} value={s.value} count={rules.filter(r => r.scope === s.value).length}>{s.label}</TabsTrigger>)}</TabsList>
        {scopes.map(s => (
          <TabsContent key={s.value} value={s.value}>
            <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
              {rules.filter(r => r.scope === s.value).map(r => (
                <li key={r.id} className={cn('grid grid-cols-1 gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center', r.state === 'conflict' && 'bg-tone-danger-bg/30')}>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.label}</span><Stamp tone={ruleLook[r.state].tone} size="sm">{ruleLook[r.state].label}</Stamp><span className="text-sm text-muted">Priority {r.priority}</span></div>
                    {r.detail ? <span className="text-sm text-muted">{r.detail}</span> : null}
                    <span className="text-sm text-muted tabular">{!r.effectiveFrom ? 'Applies whenever no rule does' : r.effectiveTo ? `${formatDate(r.effectiveFrom)} to ${formatDate(r.effectiveTo)}` : `From ${formatDate(r.effectiveFrom)}, no end date`}{r.buyerGroup ? ` · ${r.buyerGroup}` : ''}</span>
                    {r.conflictNote ? <span className="text-sm font-medium text-tone-danger">{r.conflictNote}</span> : null}
                    {r.tiers ? <div className="mt-1"><PriceTierTable tiers={r.tiers} unit={unit} density="compact" /></div> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {r.unitPrice ? (
                      mode === 'edit' && r.state !== 'expired' && !r.locked ? (
                        <div className="flex items-center gap-2">
                          <Input aria-label={`Price per ${unit} for ${r.label}`} prefix="KES" inputMode="decimal" value={drafts[r.id] ?? r.unitPrice} onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value.replace(/[^\d.]/g, '') }))} className="w-40" inputClassName="text-right tabular" />
                          <Button size="sm" variant="primary" disabled={!drafts[r.id] || drafts[r.id] === r.unitPrice} loading={saving === r.id} loadingLabel="Saving…" onClick={() => onSave?.(r.id, drafts[r.id]!)}>Save</Button>
                        </div>
                      ) : <span className="font-display text-lg font-bold tabular sm:text-right">{formatMoney(r.unitPrice)} <span className="font-sans text-sm font-normal text-muted">/ {unit}</span></span>
                    ) : null}
                    {ruleActions?.(r)}
                  </div>
                </li>
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}

export type ReorderKind = 'price' | 'stock' | 'moq' | 'discontinued'
export type ReorderLine = {
  id: string
  product: string
  unit: string
  thenQuantity: number
  thenPrice: Money
  /** Today's terms; absent when the product is no longer sold. */
  nowQuantity?: number
  nowPrice?: Money
  stock?: Stock
  /** Every difference from the historical line (spec ReorderResult.line_differences). */
  kinds: readonly ReorderKind[]
  addable: boolean
}

const packs = (n: number, unit: string) => `${n.toLocaleString('en-KE')} ${unitLabel(unit, n) ?? unit}`

/**
 * Copying a past order into a fresh cart (SM-F-20): historical values stay as they were; every difference
 * with today (price, stock, minimum order, discontinued) is shown before anything is copied.
 */
export function ReorderDiffBlock({ orderReference, placedOn, lines, onAdd, adding, replacesCartLines = 0 }: {
  orderReference: string; placedOn: string; lines: readonly ReorderLine[]; onAdd?: () => void; adding?: boolean; replacesCartLines?: number
}) {
  const addable = lines.filter(l => l.addable)
  const thenTotal = addMoney(...lines.map(l => multiplyMoney(l.thenPrice, l.thenQuantity)), '0')
  const nowTotal = addMoney(...addable.map(l => multiplyMoney(l.nowPrice ?? l.thenPrice, l.nowQuantity ?? l.thenQuantity)), '0')
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-surface p-4" aria-label={`Reorder ${orderReference}`}>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-bold">Reorder {orderReference}</h3>
        <p className="text-md text-muted">Placed {formatDate(placedOn)}. Prices and stock below are today&apos;s; the original order is unchanged.</p>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
        {lines.map(l => {
          const changedQty = l.addable && l.nowQuantity !== undefined && l.nowQuantity !== l.thenQuantity
          return (
            <li key={l.id} className={cn('grid grid-cols-1 gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center', !l.addable && 'bg-sunken/60')}>
              <div className="flex min-w-0 flex-col gap-1">
                <span className={cn('font-semibold', !l.addable && 'text-muted')}>
                  {changedQty ? <><span className="text-muted line-through">{l.thenQuantity}</span> {l.nowQuantity}</> : l.thenQuantity} × {l.product}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  {!l.kinds.length ? <span className="text-muted">Same price, and in stock</span> : null}
                  {l.kinds.includes('discontinued') ? <Stamp tone="danger" condition="unavailable" size="sm">No longer sold</Stamp> : null}
                  {l.kinds.includes('price') && l.nowPrice ? <Stamp tone="info" size="sm" detail={percentChange(l.thenPrice, l.nowPrice)}>Price changed</Stamp> : null}
                  {l.kinds.includes('moq') && l.nowQuantity ? <Stamp tone="info" size="sm" detail={`now ${packs(l.nowQuantity, l.unit)}`}>Minimum order raised</Stamp> : null}
                  {l.kinds.includes('stock') && l.stock ? <StockAvailabilityIndicator stock={l.stock} /> : null}
                  {!l.addable && !l.kinds.includes('discontinued') ? <span className="text-muted">Left out: not enough stock</span> : null}
                </span>
              </div>
              <span className="flex items-center gap-2 text-md tabular sm:justify-end">
                <span className={cn(l.kinds.includes('price') && 'text-muted line-through')}>{formatMoney(l.thenPrice)}</span>
                {l.kinds.includes('price') && l.nowPrice ? <><Icon icon={ArrowRight} className="text-muted" /><span className="font-semibold">{formatMoney(l.nowPrice)}</span></> : null}
                <span className="text-sm text-muted">/ {unitLabel(l.unit, 1) ?? l.unit}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-md sm:max-w-sm">
        <dt className="text-muted">Original total</dt><dd className="text-right tabular">{formatMoney(thenTotal)}</dd>
        <dt className="font-semibold">Today, {addable.length} of {lines.length} lines</dt><dd className="text-right font-semibold tabular">{formatMoney(nowTotal)}</dd>
      </dl>
      {replacesCartLines ? <p className="text-sm text-muted">Your current cart ({replacesCartLines} {replacesCartLines === 1 ? 'line' : 'lines'}) will be set aside, not deleted.</p> : null}
      {onAdd ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onAdd} disabled={!addable.length} loading={adding} loadingLabel="Copying…">Copy {addable.length} {addable.length === 1 ? 'line' : 'lines'} to a new cart</Button>
        </div>
      ) : null}
    </section>
  )
}
