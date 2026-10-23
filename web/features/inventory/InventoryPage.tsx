'use client'

// SM-F-07 the seller's stock: one balance per tracked pack (on hand, held for checkouts, allocated to paid
// orders, available), receipts and counted adjustments as commands, and the append-only ledger of every
// movement for the pack chosen. Quantities only ever change through those commands and the order flow, so
// the ledger alone explains every number on the page.

import type { Route } from 'next'
import Link from 'next/link'
import { PackagePlus } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { InventoryLedgerBlock } from '@/components/commerce/stock'
import type { InventoryMovement } from '@/components/commerce/types'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { ProjectedForm } from '@/components/kernel/forms/ProjectedForm'
import { PageSection } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { attempt } from '@/lib/client/api'
import type { BalanceRecord, MovementRecord } from '@/lib/client/records'
import { useCommand, useList, useSave, useSource } from '@/lib/client/resources'
import { may, useSession } from '@/lib/client/session'
import { InventoryBalanceMeta, InventoryMovementMeta, VariantMeta } from '@/lib/contract/generated'
import type { Rec } from '@/lib/contract/types'

type PackRecord = Rec & { sku: string; pack_label: string; product: { id: string; label: string } | null; stock_on_hand: number | null }

/** The most recent movements read for one pack (the contract's largest page). */
const LEDGER_ROWS = InventoryMovementMeta.list.maxPageSize
const reasonLabel = (code: string) => InventoryBalanceMeta.fields.find(f => f.name === 'reason_code')?.choices?.find(c => c.value === code)?.label

export const movementOf = (m: MovementRecord): InventoryMovement => ({
  id: m.id, type: m.movement_type, quantity: m.quantity, unit: m.unit, balanceAfter: m.available_after, onHandAfter: m.on_hand_after, at: m.occurred_at,
  actor: m.actor?.label ?? 'SokoMesh', reference: m.reference_label,
  reason: [reasonLabel(m.reason_code), m.note].filter(Boolean).join(': ') || undefined,
})

function Ledger({ variant }: { variant: string }) {
  const balance = useList<BalanceRecord>(InventoryBalanceMeta, `variant__eq=${variant}&page_size=1`)
  const movements = useList<MovementRecord>(InventoryMovementMeta, `variant__eq=${variant}&page_size=${LEDGER_ROWS}`)
  if (balance.isPending || movements.isPending) return <LoadingState variant="skeleton" shape="list" label="Loading the ledger" />
  if (movements.isError || balance.isError) return <ErrorState {...errorFrom(movements.error)} size="inline" title="The ledger did not load" onRetry={() => { void balance.refetch(); void movements.refetch() }} />
  const b = balance.data.results[0]
  const rows = movements.data.results.map(movementOf)
  return (
    <PageSection title={b ? `${b.product.label} · ${b.pack_label}` : 'Ledger'}
      description={b ? `${b.available} available now: ${b.on_hand} on hand, ${b.reserved} held for checkouts, ${b.allocated} allocated to paid orders.${movements.data.next ? ` Showing the latest ${LEDGER_ROWS} movements.` : ''}` : undefined}
      actions={<Link href={'/sell/inventory' as Route} className="text-md font-semibold text-primary hover:underline">Close the ledger</Link>}>
      <div id="ledger"><InventoryLedgerBlock movements={rows} unit={b?.unit ?? 'pack'} /></div>
    </PageSection>
  )
}

export function InventoryPage() {
  const params = useSearchParams()
  const variant = params.get('variant')
  const { data: session } = useSession()
  const canTrack = may(session, 'inventory.receive')
  const source = useSource(InventoryBalanceMeta)
  const command = useCommand(InventoryBalanceMeta, [InventoryMovementMeta, VariantMeta])
  const save = useSave(InventoryBalanceMeta, [VariantMeta])
  // Packs not tracked yet carry no stock figure (`stock_on_hand` is empty until a balance exists).
  const packs = useList<PackRecord>(VariantMeta, `page_size=${VariantMeta.list.maxPageSize}`, canTrack)
  const untracked = (packs.data?.results ?? []).filter(p => p.stock_on_hand === null)
    .map(p => ({ value: p.id, label: `${p.product?.label ?? 'Product'} · ${p.pack_label}`, description: p.sku }))
  const track = canTrack ? (
    <ProjectedForm meta={InventoryBalanceMeta} fields={['variant', 'bin_label']} mode="create" recipe="sheet" submitLabel="Start tracking" options={{ variant: untracked }}
      title="Track a pack" description={untracked.length ? 'Its stock starts at zero; receive the packs you hold next. Buyers see the pack as in stock once its available figure covers one order.' : 'Every pack you sell is tracked already.'}
      trigger={<Button variant="primary" leadingIcon={PackagePlus}>Track a pack</Button>}
      onSubmit={values => attempt(() => save.mutateAsync({ body: values }), 'Now tracked')} />
  ) : null
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={InventoryBalanceMeta} title="Stock" actions={track}
        description="What you hold of each tracked pack. Checkouts hold packs for 15 minutes while the buyer pays; paid orders allocate them until they ship. Open a pack to read its ledger." />
      <ListBlock meta={InventoryBalanceMeta} records={[]} query="server" source={source} onRun={command.run} narrow="priority"
        href={r => `/sell/inventory?variant=${(r as BalanceRecord).variant.id}#ledger`}
        empty={{ kind: 'no-data', title: 'No tracked packs', description: canTrack ? 'Track a pack to keep its stock here; untracked packs show buyers no stock figure.' : 'A seller manager or warehouse colleague can start tracking packs.' }} />
      {variant ? <Ledger variant={variant} /> : null}
    </>
  )
}
