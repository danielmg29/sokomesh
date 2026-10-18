'use client'

import { Archive, Check, ClipboardCheck, FileText, Package, PackageCheck, Printer, Scale, ShoppingCart, Truck, Undo2, Warehouse } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Cluster, DensityRegion, Grid, Split, Stack } from '@/components/layout/primitives'
import { PageSection } from '@/components/layout/section'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Stamp, conditionMark, toneMark } from '@/components/ui/stamp'
import { Thread } from '@/components/ui/thread'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/contract/types'
import { colorHex, colorHexDark } from '@/lib/design/tokens.generated'
import { formatDateTime, formatPhone, formatQuantity, formatRelative, formatTime } from '@/lib/format'
import { formatMoney } from '@/lib/money'
import { icons, logos } from '@/lib/brand'
import { DEMO_NOW } from '../fixtures'
import { Note, Plate, Plates } from '../kit'

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return ((x! + 0.05) / (y! + 0.05)).toFixed(2) }

type Role = keyof typeof colorHex
const roles: { name: Role; on: Role; use: string }[] = [
  { name: 'background', on: 'foreground', use: 'Canvas behind every page' },
  { name: 'surface', on: 'foreground', use: 'Panels, ledgers, fields' },
  { name: 'sunken', on: 'muted', use: 'Table heads, inset regions' },
  { name: 'foreground', on: 'surface', use: 'Body text' },
  { name: 'muted', on: 'surface', use: 'Secondary text' },
  { name: 'border', on: 'foreground', use: 'Decorative rules' },
  { name: 'border-strong', on: 'surface', use: 'Control boundaries (3:1)' },
  { name: 'primary', on: 'primary-foreground', use: 'Primary actions, success stamps' },
  { name: 'primary-soft', on: 'primary', use: 'Selection, active navigation' },
  { name: 'signal', on: 'signal-foreground', use: 'Trade signal: reserved, active filter, focus' },
  { name: 'signal-soft', on: 'foreground', use: 'Signal regions' },
  { name: 'signal-border', on: 'signal-soft', use: 'Edge of signal regions' },
  { name: 'inverse', on: 'inverse-foreground', use: 'Opposite of the ground: on-chips, tooltips, bulk bar' },
  { name: 'chrome', on: 'chrome-foreground', use: 'Mastheads; darkest layer in both themes' },
]

function Swatch({ hex, on, theme }: { hex: string; on: string; theme: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-border text-sm font-bold" style={{ background: hex, color: on }} aria-hidden="true">Aa</span>
      <span className="flex flex-col text-xs text-muted tabular"><span className="font-semibold text-foreground">{theme}</span><span>{hex}</span><span>{ratio(hex.slice(0, 7), on.slice(0, 7))}:1</span></span>
    </span>
  )
}

function ColourRoles() {
  return (
    <Stack gap="md">
      <Note>Semantic roles alias the four brand primitives (primary {colorHex.primary}, signal {colorHex.signal}, ink {colorHex.foreground}, surface {colorHex.background}). Every role has a light and a dark value with the same name; ratios are the role&apos;s pairing in each theme. Signal amber is never text on the light canvas (1.69:1).</Note>
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border @3xl:grid-cols-2 @6xl:grid-cols-3">
        {roles.map(r => (
          <li key={r.name} className="flex flex-col gap-2 bg-surface p-3">
            <span className="flex flex-col">
              <code className="font-mono text-sm font-semibold">{r.name}</code>
              <span className="text-sm text-muted">{r.use}, with {r.on}</span>
            </span>
            <span className="flex flex-wrap gap-x-5 gap-y-2">
              <Swatch theme="Light" hex={colorHex[r.name]!} on={colorHex[r.on]!} />
              <Swatch theme="Dark" hex={colorHexDark[r.name]!} on={colorHexDark[r.on]!} />
            </span>
          </li>
        ))}
      </ul>
    </Stack>
  )
}

const tones: Tone[] = ['neutral', 'info', 'success', 'warning', 'danger', 'signal']
const toneUse: Record<Tone, string> = { neutral: 'Cancelled, archived', info: 'Submitted, awaiting', success: 'Confirmed, paid', warning: 'Low stock, repriced', danger: 'Out of stock, failed', signal: 'Reserved, your price' }

function Tones() {
  return (
    <Plates cols={2}>
      <Plate label="Tone, stamp, dot">
        <ul className="flex flex-col gap-2.5">
          {tones.map(t => (
            <li key={t} className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3">
              <code className="font-mono text-sm">{t}</code>
              <Stamp tone={t}>{toneUse[t].split(',')[0]}</Stamp>
              <Stamp tone={t} presentation="dot">{toneUse[t].split(', ')[1]}</Stamp>
            </li>
          ))}
        </ul>
      </Plate>
      <Plate label="Marks" note="State reads in greyscale">
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {[...Object.entries(toneMark), ...Object.entries(conditionMark)].map(([k, M]) => (
            <li key={k} className="flex items-center gap-2"><Icon icon={M} strokeWidth={2.25} className="size-4" /><code className="font-mono">{k}</code></li>
          ))}
        </ul>
      </Plate>
      <Plate label="Greyscale check" span>
        <div className="flex flex-wrap gap-2 grayscale">{tones.map(t => <Stamp key={t} tone={t}>{toneUse[t].split(',')[0]}</Stamp>)}</div>
      </Plate>
    </Plates>
  )
}

const scale: { cls: string; label: string; sample: string; face: 'display' | 'sans' }[] = [
  { cls: 'text-5xl', label: '5xl · 52/56', sample: 'Trade without the tangle', face: 'display' },
  { cls: 'text-4xl', label: '4xl · 38/44', sample: 'Component inventory', face: 'display' },
  { cls: 'text-3xl', label: '3xl · 30/36', sample: 'Mwangaza Wholesalers', face: 'display' },
  { cls: 'text-2xl', label: '2xl · 24/32', sample: 'Order SM-ORD-004215', face: 'display' },
  { cls: 'text-xl', label: 'xl · 20/28', sample: 'Delivery to Naivasha', face: 'display' },
  { cls: 'text-lg', label: 'lg · 18/28', sample: 'Check the phone ending 678', face: 'sans' },
  { cls: 'text-base', label: 'base · 16/26', sample: 'Prices are confirmed and stock is reserved when you start checkout.', face: 'sans' },
  { cls: 'text-md', label: 'md · 14/20', sample: 'Default interface text for forms, tables and menus.', face: 'sans' },
  { cls: 'text-sm', label: 'sm · 13/18', sample: 'Dense ledger cells and metadata', face: 'sans' },
  { cls: 'text-xs', label: 'xs · 12/16', sample: 'LABELS AND CAPTIONS, NEVER SMALLER', face: 'sans' },
]

function Typography() {
  return (
    <Stack gap="md">
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {scale.map(s => (
          <li key={s.cls} className="grid grid-cols-1 items-baseline gap-1 px-4 py-3 @2xl:grid-cols-[8rem_minmax(0,1fr)]">
            <code className="font-mono text-xs text-muted">{s.label}</code>
            <span className={cn(s.cls, s.face === 'display' ? 'font-display font-extrabold tracking-display' : 'font-sans', 'truncate')}>{s.sample}</span>
          </li>
        ))}
      </ul>
      <Note>Headings: Plus Jakarta Sans at 700 or 800, balanced. Interface: Inter at 400 to 600. Reading text sits at 16/26 within 68 characters. Monospace only for SKUs, references and identifiers.</Note>
    </Stack>
  )
}

function Formatting() {
  const rows: [string, ReactNode][] = [
    ['Money', <span key="m" className="tabular">{formatMoney('1740')} · {formatMoney('-1250.5')} · {formatMoney('1234567.891')}</span>],
    ['Table money', <span key="t" className="tabular">Price (KES) column: 1,740.00 · 48,250.00</span>],
    ['Quantity', <span key="q">{formatQuantity(96, { one: 'bale', other: 'bales' })} · {formatQuantity(1, { one: 'carton', other: 'cartons' })} · {formatQuantity(25, 'kg')}</span>],
    ['Time', <span key="d" className="tabular">{formatDateTime('2026-10-12T14:52:00+03:00')} · {formatTime('2026-10-12T14:52:00+03:00')}</span>],
    ['Relative', <span key="r">{formatRelative('2026-10-12T11:32:00+03:00', DEMO_NOW)} · {formatRelative('2026-10-12T11:52:00+03:00', DEMO_NOW)}</span>],
    ['Phone', <span key="p" className="tabular">{formatPhone('0712345678')}</span>],
    ['Reference', <code key="c" className="font-mono text-sm">SM-ORD-004215 · TXN-1770727500-12345</code>],
  ]
  return (
    <Stack gap="md">
      <dl className="grid grid-cols-1 divide-y divide-border rounded-md border border-border bg-surface">
        {rows.map(([k, v]) => <div key={k} className="grid grid-cols-1 gap-1 px-4 py-2.5 @xl:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-sm font-semibold text-muted">{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <Note>Money arrives as decimal strings and is added in integer cents (BigInt), never floats. It always shows the currency and two decimals, except in columns whose header names the currency.</Note>
    </Stack>
  )
}

function SpacingDensity() {
  const units = [1, 2, 3, 4, 5, 6, 7, 8]
  return (
    <Plates cols={1}>
      <Plate label="Spacing · 4 px unit" note="p-4 = brand spacing 4 = 16 px">
        <div className="flex flex-wrap items-end gap-4">
          {units.map(u => <div key={u} className="flex flex-col items-center gap-1"><span className="block bg-primary" style={{ width: `calc(var(--space-unit) * ${u})`, height: `calc(var(--space-unit) * ${u})` }} /><span className="text-xs text-muted tabular">{u * 4}</span></div>)}
        </div>
      </Plate>
      <Plate label="Density regions" note="Same components, three densities">
        <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
          {(['compact', 'comfortable', 'spacious'] as const).map(d => (
            <DensityRegion key={d} density={d} className="flex flex-col gap-(--density-gap) rounded-sm border border-border p-3">
              <span className="caps text-muted">{d}</span>
              <Input aria-label={`${d} input`} defaultValue="Mavuno Maize Flour 2 kg" />
              <Button variant="primary">Add to cart</Button>
              <span className="text-(length:--density-text) text-muted">Rows and controls grow together.</span>
            </DensityRegion>
          ))}
        </div>
      </Plate>
    </Plates>
  )
}

function Surfaces() {
  const items = [
    { name: 'flat', cls: '' }, { name: 'bordered', cls: 'border border-border bg-surface' },
    { name: 'raised', cls: 'border border-border-strong bg-surface shadow-raised' }, { name: 'inset', cls: 'border border-border bg-sunken' },
  ]
  return (
    <Plates cols={2}>
      <Plate label="Surfaces" note="Only overlays lift" tone="canvas">
        <div className="grid grid-cols-2 gap-3">{items.map(s => <div key={s.name} className={cn('grid h-20 place-items-center rounded-md text-sm font-semibold', s.cls)}>{s.name}</div>)}</div>
      </Plate>
      <Plate label="Radii" note="Rectangles over pills">
        <div className="flex flex-wrap items-end gap-4">
          {[['xs · 2', 'rounded-xs'], ['sm · 4', 'rounded-sm'], ['md · 8', 'rounded-md'], ['lg · 14 (media)', 'rounded-lg']].map(([l, c]) => (
            <div key={l} className="flex flex-col items-center gap-1.5"><span className={cn('block size-14 border-2 border-primary bg-primary-soft', c)} /><span className="text-xs text-muted">{l}</span></div>
          ))}
        </div>
      </Plate>
    </Plates>
  )
}

const grammar = [
  { name: 'REVEAL', ms: 200, use: 'Expose more: menus, row detail, accordions.', cls: 'animate-reveal' },
  { name: 'BIND', ms: 140, use: 'Reserve, select, approve, commit: checkbox fill, stamp of a choice.', cls: 'animate-stamp' },
  { name: 'TRANSFER', ms: 280, use: 'Move through a workflow: sheets, steps, toasts.', cls: 'animate-transfer' },
  { name: 'REFLOW', ms: 240, use: 'Respond to filter, sort or grouping.', cls: 'animate-reveal' },
  { name: 'STAMP', ms: 180, use: 'Confirm authoritative state: Paid, Accepted.', cls: 'animate-stamp' },
  { name: 'THREAD', ms: 340, use: 'Communicate progression: step connectors, mesh.', cls: 'animate-thread' },
]

function Motion() {
  const [run, setRun] = useState(0)
  return (
    <Stack gap="md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>Every animation names one of six meanings or it is removed. 120 to 340 ms, exponential ease-out, no bounce, at most 8 px of travel. Reduced motion shows end states.</Note>
        <Button variant="secondary" size="sm" onClick={() => setRun(r => r + 1)}>Replay all</Button>
      </div>
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border @2xl:grid-cols-2 @5xl:grid-cols-3">
        {grammar.map(g => (
          <li key={g.name} className="flex flex-col gap-3 bg-surface p-4">
            <div className="flex items-baseline justify-between"><span className="font-display text-lg font-bold">{g.name}</span><span className="text-sm text-muted tabular">{g.ms} ms</span></div>
            <p className="text-sm text-muted">{g.use}</p>
            <div key={`${g.name}-${run}`} className="flex h-10 items-center">
              {g.name === 'THREAD' ? <span className="h-0.5 w-full bg-primary animate-thread" />
                : g.name === 'STAMP' ? <span className={g.cls}><Stamp tone="success" fresh>Paid</Stamp></span>
                : g.name === 'BIND' ? <span className={cn(g.cls, 'grid size-6 place-items-center rounded-xs bg-primary text-primary-foreground')}><Icon icon={Check} strokeWidth={3} /></span>
                : <span className={cn(g.cls, 'rounded-sm border border-border-strong bg-sunken px-3 py-1.5 text-sm font-medium')}>{g.name === 'TRANSFER' ? 'Step 2 · Review' : g.name === 'REFLOW' ? '12 results' : 'Order detail'}</span>}
            </div>
          </li>
        ))}
      </ul>
    </Stack>
  )
}

function Icons() {
  const set = [Package, PackageCheck, Truck, ShoppingCart, Warehouse, Scale, ClipboardCheck, Printer, FileText, Archive, Undo2, Check]
  return (
    <Plates cols={2}>
      <Plate label="Outline set" note="1.75 stroke, square caps, mitred joins">
        <div className="flex flex-wrap gap-4 text-foreground">{set.map((I, i) => <Icon key={i} icon={I} className="size-6" />)}</div>
      </Plate>
      <Plate label="Rules">
        <ul className="flex flex-col gap-1.5 text-md">
          <li>Decorative icons are hidden from assistive tech.</li>
          <li>Icon-only buttons always carry a label.</li>
          <li>No icon-in-a-circle containers; icons sit inline with their words.</li>
        </ul>
      </Plate>
    </Plates>
  )
}

function FocusSurfaces() {
  return (
    <Plates cols={2}>
      <Plate label="Focus-visible" note="Tab to see it">
        <Cluster gap="md"><Button variant="primary">Confirm order</Button><Button variant="secondary">Print pick list</Button><a href="#focus" className="text-primary underline">Order history</a></Cluster>
        <p className="mt-3 text-sm text-muted">Amber ring inside an ink outline: the ink carries 14.98:1, the amber keeps the brand.</p>
      </Plate>
      <Plate label="Selection, caret, numerals">
        <p className="text-md">Select this text to see the signal selection. <span className="tabular">1,111.10 · 9,999.90</span> align in tables.</p>
        <Input aria-label="Caret colour" defaultValue="The caret is brand green" className="mt-3" />
      </Plate>
      <Plate label="Scrollbars" span>
        <div className="h-24 overflow-auto rounded-sm border border-border p-3 text-sm"><div className="h-60">Themed track and thumb from sunken and strong-border tokens. Scroll this region.</div></div>
      </Plate>
    </Plates>
  )
}

function BrandAssets() {
  return (
    <Plates cols={2}>
      <Plate label="Mark" note={`Minimum ${logos.mark.minWidth} px · clear space ¼ mark`}>
        <Cluster gap="md" align="end">{[20, 32, 48, 80].map(w => <span key={w} className="outline-1 outline-dashed outline-border-strong"><BrandLogo variant="mark" width={w} /></span>)}</Cluster>
      </Plate>
      <Plate label="Lockup" note={`Minimum ${logos.lockup.minWidth} px; tagline legible from about 320 px. Auth pages and the footer`}>
        <Stack gap="sm"><span className="self-start outline-1 outline-dashed outline-border-strong"><BrandLogo variant="lockup" width={264} /></span><span className="self-start outline-1 outline-dashed outline-border-strong"><BrandLogo variant="lockup" width={360} /></span></Stack>
      </Plate>
      <Plate label="Wordmark" note={`Minimum ${logos.wordmark.minWidth} px; no tagline. Public header and app navigation`}>
        <Stack gap="sm"><span className="self-start outline-1 outline-dashed outline-border-strong"><BrandLogo variant="wordmark" width={196} /></span><span className="self-start outline-1 outline-dashed outline-border-strong"><BrandLogo variant="wordmark" width={212} /></span></Stack>
      </Plate>
      <Plate label="Icons in public/brand" span>
        <Cluster gap="lg" align="end">
          {/* eslint-disable-next-line @next/next/no-img-element -- showing the raw served files */}
          {[icons.svg, icons.appleTouch, icons.pwa192].map(src => <figure key={src} className="flex flex-col items-center gap-1"><img src={src} alt="" width={48} height={48} className="size-12" /><figcaption className="font-mono text-xs text-muted">{src.replace('/brand/icons/', '')}</figcaption></figure>)}
        </Cluster>
      </Plate>
    </Plates>
  )
}

function Layouts() {
  const box = (t: string) => <div className="rounded-sm border border-dashed border-border-strong bg-sunken px-3 py-4 text-center text-sm font-medium">{t}</div>
  return (
    <Plates cols={2}>
      <Plate label="Stack · Cluster">{<Stack gap="sm">{box('Stack')}<Cluster>{box('Cluster')}{box('wraps')}{box('items')}</Cluster></Stack>}</Plate>
      <Plate label="Split" note="Stacks below its container threshold">{<Split ratio="sidebar">{box('Main')}{box('Aside 20rem')}</Split>}</Plate>
      <Plate label="Grid" note="1 to 4 columns by container" span>{<Grid columns={4}>{box('1')}{box('2')}{box('3')}{box('4')}</Grid>}</Plate>
      <Plate label="PageSection" note="Title and purpose left, controls right; stacks below the container's medium width" span>
        <PageSection title="Your details" description="Your name signs your orders and approvals.">{box('Form or list')}</PageSection>
      </Plate>
      <Plate label="Thread" span><Thread label="Example" steps={[{ key: 'a', label: 'Submitted', state: 'done' }, { key: 'b', label: 'Confirmed', state: 'done' }, { key: 'c', label: 'Picking', state: 'current' }, { key: 'd', label: 'Shipped', state: 'upcoming' }]} /></Plate>
    </Plates>
  )
}

const map: Record<string, () => ReactNode> = {
  'T-01': ColourRoles, 'T-02': Tones, 'T-03': Typography, 'T-04': Formatting, 'T-05': SpacingDensity, 'T-06': Surfaces,
  'T-07': Motion, 'T-08': Icons, 'T-09': FocusSurfaces, 'T-10': BrandAssets, 'T-11': Layouts,
}

export default function FoundationSpecimens({ code }: { code: string }) {
  const S = map[code]
  return S ? <S /> : null
}
