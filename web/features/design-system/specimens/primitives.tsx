'use client'

import { Download, Pencil, Plus, Printer, ShoppingCart, Trash2, Truck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Cluster, Stack } from '@/components/layout/primitives'
import { Avatar, Badge, Kbd } from '@/components/ui/badge'
import { Button, IconButton } from '@/components/ui/button'
import { DatePicker, Calendar } from '@/components/ui/calendar'
import { ColumnChart } from '@/components/ui/chart'
import { Checkbox, RadioGroup, Segmented, Switch } from '@/components/ui/choice'
import { Combobox, MultiSelect } from '@/components/ui/combobox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { AlertDialog, Dialog, Sheet } from '@/components/ui/dialog'
import { Accordion, Collapsible, CollapsibleContent, CollapsibleTrigger, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/disclosure'
import { FormField } from '@/components/ui/form-field'
import { Icon } from '@/components/ui/icon'
import { Input, Textarea } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger, Popover, Tooltip } from '@/components/ui/overlay'
import { Progress, RangeSlider, Skeleton } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Stamp } from '@/components/ui/stamp'
import { ScrollArea, Separator, TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { FacetChips, TablePager, TableSearch, TableToolbar } from '@/components/ui/table-controls'
import { ThemeSwitch } from '@/components/ui/theme'
import { Thread } from '@/components/ui/thread'
import { useToast } from '@/components/ui/toast'
import { useTableQuery } from '@/lib/client/use-table-query'
import { formatAmount, formatMoney } from '@/lib/money'
import type { Accessors } from '@/lib/query'
import { categoryChoices, products, relationOptions, sellers } from '../fixtures'
import { Plate, Plates } from '../kit'

function Buttons() {
  return (
    <Plates cols={2}>
      <Plate label="Variants">
        <Cluster>
          <Button variant="primary" leadingIcon={ShoppingCart}>Add to cart</Button>
          <Button variant="secondary">Request quote</Button>
          <Button variant="signal">Send counter-offer</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger-outline">Reject line</Button>
          <Button variant="warning-outline">Short-ship 3</Button>
          <Button variant="danger">Revoke token</Button>
          <Button variant="link">View all orders</Button>
        </Cluster>
      </Plate>
      <Plate label="Sizes" note="lg is the FLOW touch size">
        <Cluster align="end"><Button size="sm" variant="primary">Small</Button><Button size="md" variant="primary">Medium</Button><Button size="lg" variant="primary">Large · 48 px</Button></Cluster>
      </Plate>
      <Plate label="States">
        <Cluster>
          <Button variant="primary" loading loadingLabel="Confirming order…">Confirm order</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="secondary" aria-disabled="true" title="Available when status is Submitted">Restricted</Button>
        </Cluster>
      </Plate>
      <Plate label="IconButton" note="Always labelled">
        <Cluster>
          <IconButton icon={Pencil} label="Edit product" variant="secondary" />
          <IconButton icon={Printer} label="Print pick list" />
          <IconButton icon={Trash2} label="Remove line" size="icon-sm" />
          <IconButton icon={Truck} label="Track delivery" variant="primary" />
          <IconButton icon={Download} label="Export CSV" disabled />
        </Cluster>
      </Plate>
    </Plates>
  )
}

function Inputs() {
  return (
    <Plates cols={2}>
      <Plate label="Default, prefix, suffix">
        <Stack gap="sm">
          <Input aria-label="Product name" placeholder="Product name" />
          <Input aria-label="Price" prefix="KES" defaultValue="1,740.00" inputClassName="text-right tabular" />
          <Input aria-label="Weight" suffix="kg" defaultValue="25" inputClassName="text-right tabular" />
        </Stack>
      </Plate>
      <Plate label="Error, disabled, read-only">
        <Stack gap="sm">
          <FormField label="SKU" error="Another variant already uses MVN-2K-12."><Input defaultValue="MVN-2K-12" /></FormField>
          <Input aria-label="Disabled" disabled defaultValue="Locked while publishing" />
          <Input aria-label="Read-only" readOnly defaultValue="SM-ORD-004215" />
        </Stack>
      </Plate>
      <Plate label="PasswordInput" note="The browser's password manager still recognises it">
        <Stack gap="sm">
          <FormField label="Current password"><PasswordInput autoComplete="current-password" defaultValue="Soko-Demo-2026!" /></FormField>
        </Stack>
      </Plate>
      <Plate label="Avatar with a dark-theme photograph" note="Switch the theme to see the second photograph">
        <Cluster gap="md">
          <Avatar size="xl" name="Faith Chebet" src="/images/demo/people/faith.light.webp" darkSrc="/images/demo/people/faith.dark.webp" />
          <Avatar size="lg" name="Faith Chebet" />
        </Cluster>
      </Plate>
      <Plate label="Textarea, count, over limit" span>
        <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
          <Textarea aria-label="Note" maxLength={300} defaultValue="Deliver before 10:00; the shop closes for stock-take at noon." />
          <Textarea aria-label="Over limit" maxLength={40} defaultValue="Damaged bales on arrival, three of twelve torn at the seams." />
        </div>
      </Plate>
    </Plates>
  )
}

function Choices() {
  const [cat, setCat] = useState<string>()
  const [rel, setRel] = useState<string | null>(null)
  const [many, setMany] = useState<string[]>(['Nakuru', 'Kericho'])
  const counties = ['Nakuru', 'Nairobi', 'Kiambu', 'Kericho', 'Narok', 'Kisumu'].map(c => ({ value: c, label: c }))
  const [loading, setLoading] = useState(false)
  return (
    <Plates cols={2}>
      <Plate label="Select · empty and selected">
        <Stack gap="sm">
          <Select options={categoryChoices} value={cat} onValueChange={setCat} placeholder="Choose a category" />
          <Select options={categoryChoices} defaultValue="oils" disabled />
        </Stack>
      </Plate>
      <Plate label="Combobox · disabled option with reason">
        <Combobox options={relationOptions} value={rel} onValueChange={setRel} placeholder="Choose a seller" />
      </Plate>
      <Plate label="Combobox · searching">
        <Combobox options={[]} loading={loading} onSearch={q => setLoading(q.length > 0)} placeholder="Type to search sellers" emptyText="No permitted matches." />
      </Plate>
      <Plate label="MultiSelect · max 3">
        <MultiSelect options={counties} value={many} onValueChange={setMany} max={3} />
      </Plate>
    </Plates>
  )
}

function Toggles() {
  const [radio, setRadio] = useState('restock')
  return (
    <Plates cols={3}>
      <Plate label="Checkbox">
        <Stack gap="sm">
          <Checkbox label="Accept substitutes" defaultChecked />
          <Checkbox label="Some selected" checked="indeterminate" />
          <Checkbox label="Off" />
          <Checkbox label="Disabled" disabled description="Only buyer owners can change this" />
        </Stack>
      </Plate>
      <Plate label="Switch">
        <Stack gap="md"><Switch label="Order notifications" defaultChecked /><Switch label="Weekly digest" /><Switch label="Disabled" disabled /></Stack>
      </Plate>
      <Plate label="Radio">
        <RadioGroup aria-label="Returned stock" value={radio} onValueChange={setRadio} options={[{ value: 'restock', label: 'Restock' }, { value: 'quarantine', label: 'Quarantine', description: 'Inspect before sale' }, { value: 'scrap', label: 'Scrap', disabled: true }]} />
      </Plate>
    </Plates>
  )
}

function Badges() {
  return (
    <Plates cols={3}>
      <Plate label="Badge"><Cluster><Badge>12</Badge><Badge emphasis="strong">3</Badge><Badge emphasis="signal">2 filters</Badge></Cluster></Plate>
      <Plate label="Avatar"><Cluster><Avatar name="Grace Wanjiru" size="sm" /><Avatar name="Brian Otieno" /><Avatar name="Mwangaza Wholesalers" size="lg" /></Cluster></Plate>
      <Plate label="Kbd"><Cluster><Kbd>Ctrl</Kbd><Kbd>K</Kbd><Kbd>Enter</Kbd><Kbd>Esc</Kbd></Cluster></Plate>
    </Plates>
  )
}

function Overlays() {
  const [pending, setPending] = useState(false)
  return (
    <Plates cols={2}>
      <Plate label="Dialog">
        <Dialog title="Edit delivery window" description="Order SM-ORD-004215" trigger={<Button variant="secondary">Open dialog</Button>} footer={<Button variant="primary">Save</Button>}>
          <FormField label="Deliver between"><Input defaultValue="08:00 to 10:00" /></FormField>
        </Dialog>
      </Plate>
      <Plate label="AlertDialog, destructive, pending">
        <AlertDialog title="Cancel order SM-ORD-004215?" description="The buyer is told and the reserved stock is released. This cannot be undone." confirmLabel="Cancel order" tone="destructive" pending={pending}
          trigger={<Button variant="danger-outline">Cancel order</Button>} onConfirm={() => { setPending(true); setTimeout(() => setPending(false), 1200) }} />
      </Plate>
      <Plate label="Sheet · right">
        <Sheet title="Order detail" description="SM-ORD-004215 · Wanjiru General Stores" trigger={<Button variant="secondary">Open side sheet</Button>}>
          <p className="text-md">Sheets hold detail and editors beside the list, so the list keeps its place.</p>
        </Sheet>
      </Plate>
      <Plate label="Drawer · bottom" note="Narrow-screen filters">
        <Sheet side="bottom" title="Filters" trigger={<Button variant="secondary">Open bottom drawer</Button>} footer={<Button variant="primary">Show 24 results</Button>}>
          <Checkbox label="In stock only" defaultChecked />
        </Sheet>
      </Plate>
    </Plates>
  )
}

function Disclosure() {
  return (
    <Plates cols={2}>
      <Plate label="Tabs · line">
        <Tabs defaultValue="details"><TabsList><TabsTrigger value="details">Details</TabsTrigger><TabsTrigger value="variants" count={6}>Variants</TabsTrigger><TabsTrigger value="prices" count={3}>Prices</TabsTrigger><TabsTrigger value="media" disabled>Media</TabsTrigger></TabsList>
          <TabsContent value="details"><p className="text-md">Bale of 12 × 2 kg. Dispatch within 24 hours.</p></TabsContent><TabsContent value="variants"><p className="text-md">Six variants.</p></TabsContent><TabsContent value="prices"><p className="text-md">Three rules.</p></TabsContent>
        </Tabs>
      </Plate>
      <Plate label="Tabs · boxed">
        <Tabs defaultValue="tokens"><TabsList variant="boxed"><TabsTrigger value="tokens">API tokens</TabsTrigger><TabsTrigger value="webhooks">Webhooks</TabsTrigger></TabsList><TabsContent value="tokens"><p className="text-md">Two active tokens.</p></TabsContent><TabsContent value="webhooks"><p className="text-md">One endpoint.</p></TabsContent></Tabs>
      </Plate>
      <Plate label="Accordion">
        <Accordion defaultValue={['pack']} items={[{ value: 'pack', title: 'Packaging', meta: '12 × 2 kg', content: <p className="text-md">Shrink-wrapped bale, 24.6 kg gross.</p> }, { value: 'store', title: 'Storage', content: <p className="text-md">Dry store, off the floor.</p> }, { value: 'docs', title: 'Documents', meta: '2 files', content: <p className="text-md">KEBS certificate, invoice.</p> }]} />
      </Plate>
      <Plate label="Collapsible">
        <Collapsible defaultOpen><CollapsibleTrigger className="text-md font-semibold text-primary hover:underline">Hide price explanation</CollapsibleTrigger><CollapsibleContent><p className="mt-2 text-md">Buyer-group price for Retail Partners (Rift Valley) applies from 10 bales.</p></CollapsibleContent></Collapsible>
      </Plate>
    </Plates>
  )
}

function Floating() {
  return (
    <Plates cols={3}>
      <Plate label="Popover"><Popover label="Price explanation" trigger={<Button variant="secondary">Why this price?</Button>}><p className="text-md">Quantity tier 10 to 49 bales: {formatMoney('1690')} per bale, from the Mwangaza price book.</p></Popover></Plate>
      <Plate label="DropdownMenu">
        <Menu>
          <MenuTrigger asChild><Button variant="secondary">Order actions</Button></MenuTrigger>
          <MenuContent align="start">
            <MenuLabel>SM-ORD-004215</MenuLabel>
            <MenuItem href="/design-system">Open the order (link)</MenuItem>
            <MenuItem>Confirm order</MenuItem>
            <MenuItem disabled hint="Unavailable">Ship</MenuItem>
            <MenuCheckboxItem checked>Notify buyer</MenuCheckboxItem>
            <MenuSub><MenuSubTrigger>Print</MenuSubTrigger><MenuSubContent><MenuItem>Pick list</MenuItem><MenuItem>Delivery note</MenuItem></MenuSubContent></MenuSub>
            <MenuSeparator />
            <MenuItem tone="danger">Cancel order…</MenuItem>
          </MenuContent>
        </Menu>
      </Plate>
      <Plate label="Tooltip"><Tooltip content="Minimum order is 5 bales"><Button variant="secondary">MOQ 5</Button></Tooltip></Plate>
    </Plates>
  )
}

function CommandSpecimen() {
  return (
    <Plates cols={1}>
      <Plate label="Command list" note="Inline; the palette wraps it in a dialog">
        <div className="max-w-md overflow-hidden rounded-md border border-border-strong">
          <Command><CommandInput placeholder="Search products or orders" /><CommandList>
            <CommandEmpty>No matches. Try a SKU or order number.</CommandEmpty>
            <CommandGroup heading="Products"><CommandItem>Mavuno Maize Flour 2 kg</CommandItem><CommandItem>Sukari Bora Sugar 1 kg</CommandItem></CommandGroup>
            <CommandGroup heading="Actions"><CommandItem><Icon icon={Plus} />Add product</CommandItem><CommandItem>Create quote</CommandItem></CommandGroup>
          </CommandList></Command>
        </div>
      </Plate>
    </Plates>
  )
}

function Dates() {
  const [d, setD] = useState<string | null>('2026-10-15')
  return (
    <Plates cols={2}>
      <Plate label="DatePicker"><Stack gap="sm"><DatePicker value={d} onValueChange={setD} /><DatePicker value={null} placeholder="Restock date" /></Stack></Plate>
      <Plate label="Calendar · past disabled"><div className="rounded-md border border-border"><Calendar mode="single" selected={new Date('2026-10-15T12:00:00+03:00')} disabled={{ before: new Date('2026-10-12T00:00:00+03:00') }} /></div></Plate>
    </Plates>
  )
}

type StockRow = { id: string; sku: string; product: string; onHand: number; price: string; seller: string; minutes: number }

/** Every demo product as listed by each of the four demo sellers: 32 rows, fixed figures, no randomness. */
const stockRows: StockRow[] = products.flatMap((p, i) => Object.values(sellers).map((seller, j) => ({
  id: `${p.id}-${seller.id}`, sku: `${String(p.sku)}-${seller.id.slice(4).toUpperCase()}`, product: String(p.name),
  onHand: (i * 37 + j * 53) % 7 === 0 ? 0 : (i * 41 + j * 29) % 180, price: (Number(p.unit_price) + j * 35).toFixed(2), seller: seller.label, minutes: 3 + ((i * 7 + j * 11) % 240),
})))
const level = (r: StockRow) => (r.onHand === 0 ? 'out' : r.onHand < 20 ? 'low' : 'in')
const stockAccess: Accessors<StockRow> = {
  text: r => [r.sku, r.product, r.seller],
  value: (r, key) => (key === 'level' ? level(r) : r[key as keyof StockRow]),
}
const levels = [{ value: 'in', label: 'In stock' }, { value: 'low', label: 'Low' }, { value: 'out', label: 'Out' }]

/** The primitives composed into a live table: search, two facets with live counts and pages, all client-side. */
function LiveStockTable() {
  const t = useTableQuery(stockRows, stockAccess, { pageSize: 10 })
  const sellerCounts = t.counts('seller')
  const levelCounts = t.counts('level')
  const chips = (key: string) => {
    const v = t.query.filters[key]?.value
    return Array.isArray(v) ? v.map(String) : []
  }
  const setChips = (key: string) => (next: string[]) => t.setFilter(key, next.length ? { op: 'in', value: next } : undefined)
  return (
    <div className="flex flex-col gap-3">
      <TableToolbar active={t.active} onClear={t.clear}
        search={<TableSearch label="Search stock" placeholder="SKU, product or seller…" value={t.query.q} onChange={t.setSearch} />}
        facets={<>
          <FacetChips label="Seller" options={Object.values(sellers).map(x => ({ value: x.label, label: x.label.replace(/ (Ltd|Traders|Distributors|Supplies)$/, ''), count: sellerCounts[x.label] ?? 0 }))} value={chips('seller')} onChange={setChips('seller')} />
          <FacetChips label="Stock" options={levels.map(l => ({ ...l, count: levelCounts[l.value] ?? 0 }))} value={chips('level')} onChange={setChips('level')} />
        </>} />
      <div className="overflow-hidden rounded-md border border-border">
        {t.result.total ? (
          <ScrollArea label="Stock, scrolls sideways">
            <Table caption="Stock by seller"><THead><tr><Th>SKU</Th><Th>Product</Th><Th numeric>On hand</Th><Th numeric>Price (KES)</Th><Th>Seller</Th><Th>Updated</Th></tr></THead>
              <TBody>{t.result.rows.map(r => <Tr key={r.id} interactive><Td className="whitespace-nowrap"><code className="font-mono">{r.sku}</code></Td><Td className="font-medium whitespace-nowrap">{r.product}</Td><Td numeric>{r.onHand}</Td><Td numeric>{formatAmount(r.price)}</Td><Td className="whitespace-nowrap">{r.seller}</Td><Td className="whitespace-nowrap text-muted">{r.minutes < 60 ? `${r.minutes} min ago` : `${Math.floor(r.minutes / 60)} h ago`}</Td></Tr>)}</TBody>
            </Table>
          </ScrollArea>
        ) : <p className="px-3 py-8 text-center text-md text-muted">Nothing matches. Clear the search or a filter.</p>}
        <TablePager result={t.result} onPage={t.setPage} onPageSize={t.setPageSize} noun={{ one: 'listing', other: 'listings' }} unfiltered={stockRows.length} className="border-t border-border" />
      </div>
    </div>
  )
}

/** The table controls in their states, each on its own so the state is visible without interaction. */
function TableControlsSpecimen() {
  const [q, setQ] = useState('maize')
  const [chips, setChips] = useState<string[]>(['low'])
  const noop = () => undefined
  const pager = (page: number, pageCount: number, total: number, unfiltered?: number) => (
    <div className="rounded-md border border-border bg-surface">
      <TablePager result={{ page, pageCount, pageSize: 10, total, from: total ? (page - 1) * 10 + 1 : 0, to: Math.min(total, page * 10) }} onPage={noop} onPageSize={noop} noun={{ one: 'order', other: 'orders' }} unfiltered={unfiltered} />
    </div>
  )
  return (
    <Plates cols={2}>
      <Plate label="live: search, facets, pages" note="32 demo listings" span><LiveStockTable /></Plate>
      <Plate label="TableSearch · typed"><TableToolbar search={<TableSearch label="Search orders" value={q} onChange={setQ} />} active onClear={() => setQ('')} /></Plate>
      <Plate label="FacetChips · counts, zero disabled"><FacetChips label="Stock" options={[{ value: 'in', label: 'In stock', count: 21 }, { value: 'low', label: 'Low', count: 6 }, { value: 'out', label: 'Out', count: 0 }]} value={chips} onChange={setChips} /></Plate>
      <Plate label="TablePager · first page">{pager(1, 3, 27)}</Plate>
      <Plate label="middle page, numbers with gaps">{pager(5, 9, 87)}</Plate>
      <Plate label="last page">{pager(3, 3, 27)}</Plate>
      <Plate label="filtered, from the full count">{pager(1, 1, 4, 27)}</Plate>
      <Plate label="no matches">{pager(1, 1, 0, 27)}</Plate>
      <Plate label="narrow container"><div className="max-w-xs">{pager(2, 3, 27)}</div></Plate>
    </Plates>
  )
}

function Tables() {
  const rows = [['MVN-2K-12', 'Mavuno Maize Flour 2 kg', '96', '1,740.00'], ['SKB-1K-24', 'Sukari Bora Sugar 1 kg', '14', '3,960.00'], ['JUA-3L-06', 'Jua Gold Cooking Oil 3 L', '0', '5,220.00']]
  return (
    <Plates cols={1}>
      <Plate label="Table, hover, selected, scroll">
        <div className="overflow-hidden rounded-md border border-border">
          <ScrollArea label="Products, scrolls sideways">
            <Table caption="Products"><THead><tr><Th>SKU</Th><Th>Product</Th><Th numeric>On hand</Th><Th numeric>Price (KES)</Th><Th>Seller</Th><Th>Updated</Th></tr></THead>
              <TBody>{rows.map((r, i) => <Tr key={r[0]} interactive selected={i === 1}><Td><code className="font-mono">{r[0]}</code></Td><Td className="font-medium whitespace-nowrap">{r[1]}</Td><Td numeric>{r[2]}</Td><Td numeric>{r[3]}</Td><Td className="whitespace-nowrap">Mwangaza Wholesalers Ltd</Td><Td className="whitespace-nowrap text-muted">9 min ago</Td></Tr>)}</TBody>
            </Table>
          </ScrollArea>
        </div>
      </Plate>
      <Plate label="Table with search, filters and pages" note="see P-19 for the controls"><LiveStockTable /></Plate>
      <Plate label="Separator"><Cluster gap="md"><span>Goods</span><Separator orientation="vertical" className="h-5" /><span>Delivery</span><Separator orientation="vertical" className="h-5" /><span>Total</span></Cluster></Plate>
    </Plates>
  )
}

function FeedbackPrimitives() {
  const toast = useToast()
  return (
    <Plates cols={2}>
      <Plate label="Skeleton"><Stack gap="sm"><Skeleton className="h-5 w-2/3" label="Loading" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-24 w-full" /></Stack></Plate>
      <Plate label="Progress"><Stack gap="md"><Progress value={62} label="Upload" /><Progress value={18} max={24} label="Lines picked" tone="warning" /><Progress value={null} label="Processing" /></Stack></Plate>
      <Plate label="Toast" note="Bounded queue of 3" span>
        <Cluster>
          <Button variant="secondary" onClick={() => toast({ tone: 'success', title: 'Order confirmed: SM-ORD-004215', description: 'Wanjiru General Stores has been told.' })}>Success</Button>
          <Button variant="secondary" onClick={() => toast({ tone: 'info', title: 'Prompt sent to +254 ••• ••• 678' })}>Info</Button>
          <Button variant="secondary" onClick={() => toast({ tone: 'warning', title: 'Prices changed on 2 lines', description: 'Review the cart before checkout.' })}>Warning</Button>
          <Button variant="secondary" onClick={() => toast({ tone: 'danger', title: 'The service is temporarily unavailable.', action: { label: 'Try again', onAction: () => undefined, altText: 'Try again' } })}>Error with retry</Button>
        </Cluster>
      </Plate>
    </Plates>
  )
}

function FormParts() {
  return (
    <Plates cols={2}>
      <Plate label="Label · help"><FormField label="Trading name" help="Shown to buyers on every product." required><Input defaultValue="Mwangaza Wholesalers" /></FormField></Plate>
      <Plate label="Error replaces help"><FormField label="KRA PIN" help="Eleven characters." error="Use eleven characters, for example P051234567X." required><Input defaultValue="P05123" /></FormField></Plate>
    </Plates>
  )
}

function StampSpecimen() {
  return (
    <Plates cols={2}>
      <Plate label="Sizes · detail"><Cluster><Stamp tone="success">Paid</Stamp><Stamp tone="warning" size="sm" detail="14 bales">Low stock</Stamp><Stamp tone="signal" detail="until 14:52">Reserved</Stamp></Cluster></Plate>
      <Plate label="Conditions"><Cluster><Stamp tone="info" condition="pending">Awaiting M-Pesa</Stamp><Stamp tone="info" condition="processing">Scanning</Stamp><Stamp tone="warning" condition="partial">18 of 24 shipped</Stamp><Stamp tone="neutral" condition="restricted">Seller only</Stamp><Stamp tone="neutral" condition="unknown">Not reported</Stamp></Cluster></Plate>
    </Plates>
  )
}

function ThreadSpecimen() {
  return (
    <Plates cols={1}>
      <Plate label="Horizontal · certainty by pattern"><Thread label="Payment" steps={[{ key: 'a', label: 'Created', state: 'done' }, { key: 'b', label: 'Prompt sent', state: 'done' }, { key: 'c', label: 'Awaiting PIN', state: 'current', detail: 'sent 11:41' }, { key: 'd', label: 'Confirmed', state: 'upcoming' }]} /></Plate>
      <Plate label="Stale and failed"><Thread label="Delivery" steps={[{ key: 'a', label: 'Handed over', state: 'done' }, { key: 'b', label: 'In transit', state: 'stale', detail: 'no update for 6 h' }, { key: 'c', label: 'Delivered', state: 'upcoming' }]} /><div className="mt-4"><Thread label="Quote" steps={[{ key: 'a', label: 'Requested', state: 'done' }, { key: 'b', label: 'Declined', state: 'failed' }, { key: 'c', label: 'Accepted', state: 'skipped' }]} /></div></Plate>
      <Plate label="Vertical"><Thread orientation="vertical" label="Approval" steps={[{ key: 'a', label: 'Level 1 · Buyer owner', detail: 'Grace Wanjiru approved', state: 'done' }, { key: 'b', label: 'Level 2 · Finance', state: 'current' }]} /></Plate>
    </Plates>
  )
}

function SegmentedRange() {
  const [m, setM] = useState<'MARKET' | 'LEDGER' | 'FLOW'>('LEDGER')
  const [r, setR] = useState<[number, number]>([1500, 6000])
  return (
    <Plates cols={2}>
      <Plate label="Segmented"><Segmented label="Mode" value={m} onValueChange={setM} items={[{ value: 'MARKET', label: 'MARKET' }, { value: 'LEDGER', label: 'LEDGER' }, { value: 'FLOW', label: 'FLOW' }]} /></Plate>
      <Plate label="RangeSlider · price"><RangeSlider min={0} max={10000} step={50} value={r} onValueChange={setR} label="Price per pack" formatValue={n => formatMoney(String(n))} /></Plate>
    </Plates>
  )
}

const day = (i: number) => new Date(Date.UTC(2026, 8, 13 + i)).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })
const revenue = [182, 214, 96, 0, 248, 301, 276, 190, 233, 260, 128, 0, 312, 338, 290, 244, 268, 301, 156, 0, 345, 362, 318, 289, 297, 331, 174, 0, 371, 352]
const chartData = revenue.map((v, i) => ({ key: String(i), label: day(i), value: v * 1000, display: formatMoney(String(v * 1000)) }))

const kTick = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n))
const mTick = (n: number) => (n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `KES ${Math.round(n / 1000)}k` : `KES ${n}`)
const week = chartData.slice(-7)
const quarter = Array.from({ length: 90 }, (_, i) => { const v = (i % 7 === 6 ? 0 : 140 + ((i * 53) % 170)) * 1000; return { key: `q${i}`, label: `Day ${i + 1}`, value: v, display: formatMoney(String(v)) } })
const millions = chartData.slice(0, 12).map((d, i) => { const v = d.value * 9 + i * 120_000; return { ...d, key: `m${i}`, label: `Week ${i + 1}`, value: v, display: formatMoney(String(v)) } })
const quiet = week.map(d => ({ ...d, value: 0, display: formatMoney('0') }))

function ChartSpecimen() {
  return (
    <Plates cols={2}>
      <Plate label="30 days, hover, focus and arrow keys" span><ColumnChart data={chartData} title="Confirmed revenue per day (KES), demo" valueLabel="Revenue (KES)" formatTick={kTick} /></Plate>
      <Plate label="7 days"><ColumnChart data={week} title="Last 7 days, demo" valueLabel="Revenue (KES)" formatTick={kTick} height={160} /></Plate>
      <Plate label="long axis labels" note="Axis widens to its widest label"><ColumnChart data={millions} title="Weekly revenue, demo" valueLabel="Revenue (KES)" categoryLabel="Week" formatTick={mTick} height={160} /></Plate>
      <Plate label="90 days" note="Columns narrow, the gap stays 2px"><ColumnChart data={quarter} title="Last 90 days, demo" valueLabel="Revenue (KES)" formatTick={kTick} height={160} /></Plate>
      <Plate label="no sales in range" note="Zero is drawn as no column, not a guess"><ColumnChart data={quiet} title="Last 7 days, demo" valueLabel="Revenue (KES)" formatTick={kTick} height={120} /></Plate>
    </Plates>
  )
}

function ThemeSwitchSpecimen() {
  return (
    <Plates cols={2}>
      <Plate label="on surface, with labels" note="Changes this whole page"><ThemeSwitch /></Plate>
      <Plate label="on chrome, icon only"><div className="on-chrome inline-flex rounded-md bg-chrome p-3"><ThemeSwitch tone="chrome" labels="icon" /></div></Plate>
    </Plates>
  )
}

const map: Record<string, () => ReactNode> = {
  'P-01': Buttons, 'P-02': Inputs, 'P-03': Choices, 'P-04': Toggles, 'P-05': Badges, 'P-06': Overlays, 'P-07': Disclosure, 'P-08': Floating,
  'P-09': CommandSpecimen, 'P-10': Dates, 'P-11': Tables, 'P-12': FeedbackPrimitives, 'P-13': FormParts, 'P-14': StampSpecimen, 'P-15': ThreadSpecimen,
  'P-16': SegmentedRange, 'P-17': ChartSpecimen, 'P-18': ThemeSwitchSpecimen, 'P-19': TableControlsSpecimen,
}

export default function PrimitiveSpecimens({ code }: { code: string }) {
  const S = map[code]
  return S ? <S /> : null
}
