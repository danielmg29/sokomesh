import { Check, ExternalLink, FileText, ImageOff, KeyRound, Lock, MapPin, Minus, X } from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime, formatPhone } from '@/lib/format'
import { formatAmount, formatMoney } from '@/lib/money'
import { StatusBadge } from '../feedback/StatusBadge'
import { CopyValue, RelativeTime } from './islands'
import {
  asAddress, asFile, asImage, asLocation, asNumber, asRelation, asRichText, asSecret, asString, asStringList, choiceLabel,
  formatBytes, isEmpty, unitLabel, type ViewProps,
} from './types'

/** Missing values are said, not left blank. */
export function Empty({ label = 'Not set' }: { label?: string }) {
  return (
    <span className="text-muted">
      <span aria-hidden="true" className="inline-block h-px w-3 bg-border-strong align-middle" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

const compact = (ctx: ViewProps['context']) => ctx === 'compact'

export function TextView({ value, context }: ViewProps) {
  const s = asString(value)
  if (!s) return <Empty />
  return <span className={cn('min-w-0', compact(context) && 'block truncate')} title={compact(context) ? s : undefined}>{s}</span>
}

export function TextareaView({ value, context }: ViewProps) {
  const s = asString(value)
  if (!s) return <Empty />
  return <p className={cn('whitespace-pre-line', compact(context) && 'line-clamp-2')}>{s}</p>
}

export function RichTextView({ value, context }: ViewProps) {
  const rt = asRichText(value)
  if (!rt || !rt.html) return <Empty />
  if (compact(context)) return <p className="line-clamp-2 text-muted">{rt.text}</p>
  // HTML arrives sanitised by the backend against the rich-text allow-list (spec p.5).
  return <div className="rich-text" dangerouslySetInnerHTML={{ __html: rt.html }} />
}

export function CurrencyView({ field, value, context }: ViewProps) {
  const s = asString(value)
  if (s === null) return <Empty />
  const negative = s.trim().startsWith('-')
  const text = compact(context) ? formatAmount(s, field.decimalPlaces ?? 2) : formatMoney(s, field.currency ?? 'KES', field.decimalPlaces ?? 2)
  return (
    <span data-numeric className={cn('tabular whitespace-nowrap', negative && 'text-tone-danger', context === 'media' && 'font-display text-xl font-extrabold')}>
      {text}
    </span>
  )
}

export function QuantityView({ field, value, context }: ViewProps) {
  const n = asNumber(value)
  if (n === null) return <Empty />
  const unit = unitLabel(field.unit, n)
  return (
    <span data-numeric className="tabular whitespace-nowrap">
      <span className={cn(!compact(context) && 'font-semibold')}>{n.toLocaleString('en-KE')}</span>
      {unit ? <span className="text-muted"> {unit}</span> : null}
    </span>
  )
}

export function IntegerView({ value }: ViewProps) {
  const n = asNumber(value)
  return n === null ? <Empty /> : <span data-numeric className="tabular">{n.toLocaleString('en-KE')}</span>
}

export function DecimalView({ field, value }: ViewProps) {
  const s = asString(value)
  if (s === null) return <Empty />
  return (
    <span data-numeric className="tabular whitespace-nowrap">
      {formatAmount(s, field.decimalPlaces ?? 2)}
      {field.unit ? <span className="text-muted"> {field.unit}</span> : null}
    </span>
  )
}

export function UnitView({ field, value }: ViewProps) {
  const label = choiceLabel(field, value)
  return label ? <span>{label}</span> : <Empty />
}

export function SelectView({ field, value, context }: ViewProps) {
  const choice = field.choices?.find(c => c.value === asString(value))
  if (!choice) return <Empty />
  return choice.tone ? <StatusBadge choice={choice} size={compact(context) ? 'sm' : 'md'} /> : <span>{choice.label}</span>
}

export function StatusView({ field, value, context }: ViewProps) {
  return <StatusBadge field={field} value={value} size={compact(context) ? 'sm' : 'md'} />
}

export function MultiselectView({ field, value, context }: ViewProps) {
  const values = asStringList(value)
  if (!values.length) return <Empty />
  const labels = values.map(v => field.choices?.find(c => c.value === v)?.label ?? v)
  if (compact(context)) {
    return <span title={labels.join(', ')}>{labels.length > 2 ? `${labels.slice(0, 2).join(', ')} +${labels.length - 2}` : labels.join(', ')}</span>
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {labels.map(l => <li key={l} className="rounded-xs border border-border bg-sunken px-2 py-0.5 text-sm">{l}</li>)}
    </ul>
  )
}

export function BooleanView({ value, field }: ViewProps) {
  const labels = field.choices && field.choices.length === 2 ? field.choices : null
  if (value === true || value === false) {
    const text = labels ? labels[value ? 0 : 1]!.label : value ? 'Yes' : 'No'
    return (
      <span className="inline-flex items-center gap-1.5">
        <Icon icon={value ? Check : X} className={value ? 'text-tone-success' : 'text-muted'} strokeWidth={2.5} />
        {text}
      </span>
    )
  }
  return <span className="inline-flex items-center gap-1.5 text-muted"><Icon icon={Minus} />Not decided</span>
}

export function RelationView({ value, context }: ViewProps) {
  const r = asRelation(value)
  if (!r) return <Empty />
  if (r.unavailable) {
    return <span className="inline-flex items-center gap-1.5 text-muted"><Icon icon={Lock} />{r.label || 'Unavailable to your role'}</span>
  }
  return (
    <span className={cn('inline-flex min-w-0 flex-col', compact(context) && 'flex-row items-baseline gap-1.5')}>
      <span className={cn('font-medium', compact(context) && 'truncate')}>{r.label}</span>
      {r.detail ? <span className="truncate text-sm text-muted">{r.detail}</span> : null}
    </span>
  )
}

export function DateView({ value }: ViewProps) {
  const s = asString(value)
  if (!s) return <Empty />
  const iso = s.length === 10 ? `${s}T12:00:00+03:00` : s
  return <time dateTime={s} className="tabular whitespace-nowrap">{formatDate(iso)}</time>
}

export function DatetimeView({ value }: ViewProps) {
  const s = asString(value)
  if (!s) return <Empty />
  return <time dateTime={s} className="tabular whitespace-nowrap">{formatDateTime(s)}</time>
}

export function RelativeTimeView({ value, now }: ViewProps) {
  const s = asString(value)
  if (!s) return <Empty />
  return <RelativeTime iso={s} now={now} />
}

export function ImageView({ value, context }: ViewProps) {
  const list = Array.isArray(value) ? value.map(asImage).filter((i): i is NonNullable<typeof i> => Boolean(i)) : [asImage(value)].filter((i): i is NonNullable<typeof i> => Boolean(i))
  if (!list.length) {
    return (
      <span className={cn('grid place-items-center bg-well text-muted', context === 'media' ? 'aspect-[4/3] w-full' : 'size-10 rounded-sm')}>
        <Icon icon={ImageOff} label="No image" />
      </span>
    )
  }
  if (context === 'compact') {
    const img = list[0]!
    return <Image src={img.url} alt={img.alt} width={40} height={40} className="size-10 rounded-sm border border-border bg-well object-contain p-0.5" />
  }
  if (context === 'media' || list.length === 1) {
    const img = list[0]!
    return (
      <Image
        src={img.url}
        alt={img.alt}
        width={img.width ?? 800}
        height={img.height ?? 600}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
        // Product photographs are cut-outs: the theme's well is their ground, so one file serves both themes.
        className={cn('w-full bg-well object-contain', context === 'media' ? 'aspect-[4/3] p-[6%]' : 'max-h-80 rounded-md border border-border p-4')}
      />
    )
  }
  return (
    <ul className="grid grid-cols-3 gap-2" aria-label={`${list.length} images`}>
      {list.map(img => (
        <li key={img.url}><Image src={img.url} alt={img.alt} width={240} height={180} className="aspect-[4/3] w-full rounded-sm border border-border bg-well object-contain p-2" /></li>
      ))}
    </ul>
  )
}

const fileStates: Record<string, ReactNode> = {
  uploading: <Stamp tone="info" condition="processing" size="sm">Uploading</Stamp>,
  scanning: <Stamp tone="info" condition="processing" size="sm">Scanning</Stamp>,
  ready: null,
  restricted: <Stamp tone="neutral" condition="restricted" size="sm">Restricted</Stamp>,
  error: <Stamp tone="danger" size="sm">Failed</Stamp>,
  rejected: <Stamp tone="danger" size="sm">Rejected</Stamp>,
}

export function FileView({ value }: ViewProps) {
  const f = asFile(value)
  if (!f) return <Empty label="No file" />
  const name = f.state === 'ready' && f.url
    ? <a href={f.url} className="truncate font-medium text-primary underline-offset-2 hover:underline">{f.name}</a>
    : <span className="truncate font-medium">{f.name}</span>
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Icon icon={FileText} className="text-muted" />
      {name}
      <span className="shrink-0 text-sm text-muted tabular">{formatBytes(f.size)}</span>
      {fileStates[f.state]}
    </span>
  )
}

export function EmailView({ value }: ViewProps) {
  const s = asString(value)
  if (!s) return <Empty />
  return <a href={`mailto:${s}`} className="text-primary underline-offset-2 hover:underline">{s}</a>
}

export function PhoneView({ value }: ViewProps) {
  const s = asString(value)
  if (!s) return <Empty />
  return <a href={`tel:${s.replace(/\s/g, '')}`} className="tabular whitespace-nowrap text-primary underline-offset-2 hover:underline">{formatPhone(s)}</a>
}

export function UrlView({ value }: ViewProps) {
  const s = asString(value)
  if (!s) return <Empty />
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <a href={s} target="_blank" rel="noreferrer noopener" className="inline-flex min-w-0 items-center gap-1 text-primary underline-offset-2 hover:underline">
        <span className="truncate">{s.replace(/^https?:\/\//, '')}</span>
        <Icon icon={ExternalLink} />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <CopyValue value={s} label="Copy link" />
    </span>
  )
}

export function CodeView({ value }: ViewProps) {
  const s = asString(value)
  if (!s) return <Empty />
  return (
    <span className="inline-flex items-center gap-1">
      <code className="font-mono text-sm whitespace-nowrap">{s}</code>
      <CopyValue value={s} label={`Copy ${s}`} />
    </span>
  )
}

export function AddressView({ value, context }: ViewProps) {
  const a = asAddress(value)
  if (!a) return <Empty />
  if (compact(context)) return <span className="truncate">{[a.city, a.region].filter(Boolean).join(', ')}</span>
  return (
    <address className="flex flex-col not-italic">
      {a.label ? <span className="font-semibold">{a.label}</span> : null}
      <span>{a.line1}</span>
      {a.line2 ? <span>{a.line2}</span> : null}
      <span>{[a.city, a.region, a.postalCode].filter(Boolean).join(', ')}</span>
      <span className="text-muted">{a.countryCode === 'KE' ? 'Kenya' : a.countryCode}</span>
    </address>
  )
}

export function LocationView({ value }: ViewProps) {
  const l = asLocation(value)
  if (!l) return <Empty label="No location" />
  const coords = `${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}`
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <Icon icon={MapPin} className="text-muted" />
      {l.label ? <span className="font-medium">{l.label}</span> : null}
      <span className="font-mono text-sm text-muted">{coords}</span>
      <a href={`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=16/${l.lat}/${l.lng}`} target="_blank" rel="noreferrer noopener" className="text-sm text-primary underline-offset-2 hover:underline">
        Open map<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </span>
  )
}

export function SecretView({ value }: ViewProps) {
  const s = asSecret(value)
  if (!s?.set) return <span className="inline-flex items-center gap-1.5 text-muted"><Icon icon={KeyRound} />Not set</span>
  return (
    <span className="inline-flex items-center gap-2">
      <Icon icon={KeyRound} className="text-muted" />
      <code className="font-mono text-sm">•••• •••• {s.last4 ?? '••••'}</code>
      {s.rotatedAt ? <span className="text-sm text-muted">rotated {formatDate(s.rotatedAt)}</span> : null}
    </span>
  )
}

export function JsonView({ value, context }: ViewProps) {
  if (isEmpty(value)) return <Empty />
  const text = JSON.stringify(value, null, 2)
  const keys = value && typeof value === 'object' ? Object.keys(value).length : 0
  if (compact(context)) return <code className="font-mono text-sm text-muted">{`{ ${keys} keys }`}</code>
  return (
    <details className="group rounded-sm border border-border bg-sunken">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold select-none">
        JSON · {keys} keys <span className="font-normal text-muted group-open:hidden">(show)</span>
      </summary>
      <pre className="max-h-72 overflow-auto border-t border-border px-3 py-2 font-mono text-sm">{text}</pre>
    </details>
  )
}

export function HiddenView() {
  return null
}
