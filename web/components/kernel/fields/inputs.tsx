'use client'

import {
  Bold, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, LoaderCircle, MapPin, Minus, Plus, RefreshCw, RemoveFormatting, ShieldCheck, Trash2, TriangleAlert, Upload,
} from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Button, IconButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/choice'
import { Combobox, MultiSelect } from '@/components/ui/combobox'
import { AlertDialog } from '@/components/ui/dialog'
import { useFieldControlProps } from '@/components/ui/form-field'
import { DatePicker } from '@/components/ui/calendar'
import { Icon } from '@/components/ui/icon'
import { Input, Textarea } from '@/components/ui/input'
import { Popover } from '@/components/ui/overlay'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Stamp } from '@/components/ui/stamp'
import { cn } from '@/lib/cn'
import { KENYA_COUNTIES } from '@/lib/kenya'
import { fromMinor, toMinor } from '@/lib/money'
import { sanitizeRichText } from '@/lib/richtext'
import { StatusBadge } from '../feedback/StatusBadge'
import { CopyValue } from './islands'
import { FileView, SecretView } from './views'
import {
  asAddress, asFile, asImage, asLocation, asNumber, asRelation, asRichText, asSecret, asString, asStringList,
  formatBytes, unitLabel, type AddressValue, type FileValue, type ImageUpload, type InputProps,
} from './types'

const text = (v: unknown) => asString(v) ?? ''

export function TextInput({ field, value, onChange, disabled, readOnly }: InputProps) {
  return <Input value={text(value)} onChange={e => onChange(e.target.value)} maxLength={field.maxLength} disabled={disabled} readOnly={readOnly} autoComplete="off" />
}

export function TextareaInput({ field, value, onChange, disabled, readOnly }: InputProps) {
  return <Textarea value={text(value)} onChange={e => onChange(e.target.value)} maxLength={field.maxLength} disabled={disabled} readOnly={readOnly} rows={4} />
}

export function CodeInput({ field, value, onChange, disabled, readOnly }: InputProps) {
  return (
    <Input
      value={text(value)}
      onChange={e => onChange(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
      maxLength={field.maxLength}
      disabled={disabled}
      readOnly={readOnly}
      spellCheck={false}
      autoCapitalize="characters"
      inputClassName="font-mono"
      className="font-mono"
    />
  )
}

export function EmailInput({ value, onChange, disabled, readOnly }: InputProps) {
  return <Input type="email" inputMode="email" autoComplete="email" value={text(value)} onChange={e => onChange(e.target.value.trim())} disabled={disabled} readOnly={readOnly} placeholder="name@business.co.ke" />
}

export function PhoneInput({ value, onChange, disabled, readOnly }: InputProps) {
  const local = text(value).replace(/^\+?254/, '').replace(/\D/g, '')
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      prefix="+254"
      value={local}
      maxLength={10}
      placeholder="712 345 678"
      onChange={e => { const d = e.target.value.replace(/\D/g, '').replace(/^0/, ''); onChange(d ? `+254${d}` : '') }}
      disabled={disabled}
      readOnly={readOnly}
    />
  )
}

export function UrlInput({ value, onChange, disabled, readOnly }: InputProps) {
  return <Input type="url" inputMode="url" value={text(value)} onChange={e => onChange(e.target.value.trim())} disabled={disabled} readOnly={readOnly} placeholder="https://" spellCheck={false} />
}

export function CurrencyInput({ field, value, onChange, disabled, readOnly }: InputProps) {
  const places = field.decimalPlaces ?? 2
  return (
    <Input
      inputMode="decimal"
      prefix={field.currency ?? 'KES'}
      value={text(value)}
      placeholder={`0.${'0'.repeat(places)}`}
      onChange={e => onChange(e.target.value.replace(/[^\d.-]/g, ''))}
      onBlur={e => {
        // Normalise on blur only when valid; the string never passes through a float.
        const raw = e.target.value
        if (/^-?\d+(\.\d+)?$/.test(raw) && (raw.split('.')[1]?.length ?? 0) <= places) onChange(fromMinor(toMinor(raw, places), places))
      }}
      disabled={disabled}
      readOnly={readOnly}
      inputClassName="text-right tabular"
    />
  )
}

export function DecimalInput({ field, value, onChange, disabled, readOnly }: InputProps) {
  return (
    <Input inputMode="decimal" suffix={field.unit} value={text(value)} onChange={e => onChange(e.target.value.replace(/[^\d.-]/g, ''))} disabled={disabled} readOnly={readOnly} inputClassName="text-right tabular" />
  )
}

export function IntegerInput({ field, value, onChange, disabled, readOnly }: InputProps) {
  return (
    <Input
      inputMode="numeric"
      value={value === null || value === undefined ? '' : String(value)}
      onChange={e => { const d = e.target.value.replace(/[^\d]/g, ''); onChange(d === '' ? null : Number(d)) }}
      suffix={field.unit}
      disabled={disabled}
      readOnly={readOnly}
      inputClassName="text-right tabular"
    />
  )
}

/** Stepper or free entry, stepping by the pack size; MOQ and stock limits come from metadata. */
export function QuantityInput({ field, value, onChange, disabled, readOnly }: InputProps) {
  const n = asNumber(value)
  const step = field.step ?? 1
  const min = field.min ?? 0
  const max = field.max
  const locked = disabled || readOnly
  const nudge = (dir: 1 | -1) => {
    const base = n ?? (dir > 0 ? min - step : min)
    const next = Math.max(min, base + dir * step)
    onChange(max !== undefined ? Math.min(max, next) : next)
  }
  return (
    <div className="flex items-stretch gap-1">
      <Button variant="secondary" size="icon" aria-label={`Decrease by ${step}`} disabled={locked || n === null || n - step < min} onClick={() => nudge(-1)}>
        <Icon icon={Minus} />
      </Button>
      <Input
        inputMode="numeric"
        value={n === null ? '' : String(n)}
        onChange={e => { const d = e.target.value.replace(/[^\d]/g, ''); onChange(d === '' ? null : Number(d)) }}
        suffix={unitLabel(field.unit, n ?? 2)}
        disabled={disabled}
        readOnly={readOnly}
        className="w-40"
        inputClassName="text-center font-semibold tabular"
      />
      <Button variant="secondary" size="icon" aria-label={`Increase by ${step}`} disabled={locked || (max !== undefined && (n ?? 0) + step > max)} onClick={() => nudge(1)}>
        <Icon icon={Plus} />
      </Button>
    </div>
  )
}

const LARGE_CHOICE = 8

export function SelectInput({ field, value, onChange, disabled }: InputProps) {
  const options = (field.choices ?? []).map(c => ({ value: c.value, label: c.label, description: c.help }))
  if (options.length > LARGE_CHOICE) {
    return <Combobox options={options} value={asString(value)} onValueChange={onChange} disabled={disabled} />
  }
  return <Select options={options} value={asString(value) ?? undefined} onValueChange={onChange} disabled={disabled} />
}

export const UnitInput = SelectInput

export function MultiselectInput({ field, value, onChange, disabled }: InputProps) {
  const options = (field.choices ?? []).map(c => ({ value: c.value, label: c.label }))
  return <MultiSelect options={options} value={asStringList(value)} onValueChange={onChange} max={field.maxItems} disabled={disabled} />
}

/** Status changes only through named commands; the form shows the current stamp. */
export function StatusInput({ field, value }: InputProps) {
  const control = useFieldControlProps()
  return (
    <div id={control.id} className="flex items-center gap-3 rounded-sm border border-border bg-sunken px-3 py-2">
      <StatusBadge field={field} value={value} />
      <span className="text-sm text-muted">Changes through the record&apos;s actions</span>
    </div>
  )
}

export function BooleanInput({ field, value, onChange, disabled }: InputProps) {
  return (
    <Checkbox
      label={field.label ?? field.name}
      description={field.help}
      checked={value === null || value === undefined ? 'indeterminate' : Boolean(value)}
      onCheckedChange={c => onChange(c === true)}
      disabled={disabled}
    />
  )
}

export function RelationInput({ value, onChange, disabled, options = [], loading, onSearch }: InputProps) {
  const current = asRelation(value)
  const merged = current && !options.some(o => o.value === current.id) ? [{ value: current.id, label: current.label, description: current.detail }, ...options] : options
  return (
    <Combobox
      options={merged}
      value={current?.id ?? null}
      onValueChange={id => {
        const o = merged.find(x => x.value === id)
        onChange(o ? { id: o.value, label: o.label, detail: o.description } : null)
      }}
      loading={loading}
      onSearch={onSearch}
      disabled={disabled}
      emptyText="No permitted matches. Check the spelling or ask an admin for access."
    />
  )
}

export function DateInput({ value, onChange, disabled }: InputProps) {
  return <DatePicker value={asString(value)} onValueChange={onChange} disabled={disabled} />
}

/** Date + time in East Africa Time; stored as ISO with the +03:00 offset. */
export function DatetimeInput({ value, onChange, disabled }: InputProps) {
  const iso = asString(value)
  const [date, time] = iso ? [iso.slice(0, 10), iso.slice(11, 16)] : [null, '']
  const emit = (d: string | null, t: string) => onChange(d ? `${d}T${t || '00:00'}:00+03:00` : null)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
      <DatePicker value={date} onValueChange={d => emit(d, time)} disabled={disabled} />
      <Input type="time" value={time} onChange={e => emit(date, e.target.value)} disabled={disabled || !date} suffix="EAT" aria-label="Time" />
    </div>
  )
}

const toolbar: { icon: typeof Bold; label: string; command: string; arg?: string }[] = [
  { icon: Bold, label: 'Bold', command: 'bold' },
  { icon: Italic, label: 'Italic', command: 'italic' },
  { icon: Heading3, label: 'Heading', command: 'formatBlock', arg: 'h3' },
  { icon: List, label: 'Bulleted list', command: 'insertUnorderedList' },
  { icon: ListOrdered, label: 'Numbered list', command: 'insertOrderedList' },
  { icon: RemoveFormatting, label: 'Clear formatting', command: 'removeFormat' },
]

/** WYSIWYG for the four designated fields only. Output is allow-listed HTML plus plain text. */
export function RichTextInput({ field, value, onChange, disabled }: InputProps) {
  const control = useFieldControlProps()
  const ref = useRef<HTMLDivElement>(null)
  const initial = useRef(asRichText(value)?.html ?? '')
  const [link, setLink] = useState('')
  const textLength = asRichText(value)?.text.length ?? 0
  const over = field.maxLength !== undefined && textLength > field.maxLength

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initial.current
  }, [])

  const emit = () => { if (ref.current) onChange(sanitizeRichText(ref.current.innerHTML)) }
  const run = (command: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    emit()
  }

  return (
    <div className={cn('flex flex-col rounded-sm border border-border-strong bg-surface', over && 'border-tone-danger', disabled && 'bg-sunken')}>
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-border p-1">
        {toolbar.map(t => (
          <IconButton key={t.label} icon={t.icon} label={t.label} size="icon-sm" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => run(t.command, t.arg)} />
        ))}
        <Popover
          label="Add link"
          trigger={<Button size="icon-sm" variant="ghost" aria-label="Add link" disabled={disabled}><Icon icon={Link2} /></Button>}
        >
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (/^https:\/\//.test(link)) { run('createLink', link); setLink('') } }}>
            <Input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://" aria-label="Link address" />
            <Button type="submit" size="md" variant="primary">Add</Button>
          </form>
        </Popover>
      </div>
      <div
        ref={ref}
        id={control.id}
        role="textbox"
        aria-multiline="true"
        aria-describedby={control['aria-describedby']}
        aria-invalid={over || control['aria-invalid'] || undefined}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        className="rich-text min-h-36 px-3 py-2 text-md leading-relaxed outline-none focus-visible:shadow-none focus-visible:outline-none"
      />
      {field.maxLength ? (
        <span className={cn('self-end px-3 pb-2 text-xs tabular', over ? 'font-semibold text-tone-danger' : 'text-muted')} aria-live="polite">
          {textLength.toLocaleString('en-KE')} / {field.maxLength.toLocaleString('en-KE')} characters
        </span>
      ) : null}
    </div>
  )
}

function useObjectUrl() {
  const url = useRef<string | null>(null)
  useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current) }, [])
  return (file: File | null) => {
    if (url.current) URL.revokeObjectURL(url.current) // bounded memory: one preview at a time
    url.current = file ? URL.createObjectURL(file) : null
    return url.current
  }
}

function checkFile(file: File, accept?: readonly string[], maxBytes?: number): string | null {
  if (accept?.length && !accept.includes(file.type)) return `This file type is not accepted. Use ${accept.map(a => a.split('/')[1]!.toUpperCase()).join(', ')}.`
  if (maxBytes && file.size > maxBytes) return `This file is ${formatBytes(file.size)}; the limit is ${formatBytes(maxBytes)}.`
  return null
}

function DropZone({ accept, onFile, disabled, children, label }: { accept?: readonly string[]; onFile: (f: File) => void; disabled?: boolean; children: ReactNode; label: string }) {
  const control = useFieldControlProps()
  const [over, setOver] = useState(false)
  return (
    <label
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f && !disabled) onFile(f) }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-sunken/50 px-4 py-6 text-center motion-bind transition-colors',
        over && 'border-primary bg-primary-soft', disabled && 'cursor-not-allowed opacity-60',
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring-contrast',
      )}
    >
      {children}
      <input
        {...control}
        type="file"
        className="sr-only"
        aria-label={label}
        accept={accept?.join(',')}
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }}
      />
    </label>
  )
}

/** Single image: empty → uploading → processing (derivatives) → ready, or rejected. */
export function ImageInput({ field, value, onChange, disabled }: InputProps) {
  const preview = useObjectUrl()
  const upload: ImageUpload = value && typeof value === 'object' && 'state' in value ? (value as ImageUpload) : asImage(value) ? { state: 'ready', image: asImage(value)! } : { state: 'empty' }
  const pick = (file: File) => {
    const problem = checkFile(file, field.accept, field.maxBytes)
    if (problem) return onChange({ state: 'rejected', reason: problem, fileName: file.name } satisfies ImageUpload)
    onChange({ state: 'uploading', progress: 0, fileName: file.name, image: { url: preview(file)!, alt: field.label ?? file.name } } satisfies ImageUpload)
  }
  const limits = [field.accept?.map(a => a.split('/')[1]!.toUpperCase()).join(', '), field.maxBytes ? `up to ${formatBytes(field.maxBytes)}` : null].filter(Boolean).join(' · ')

  if (upload.state === 'empty' || upload.state === 'rejected') {
    return (
      <div className="flex flex-col gap-2">
        <DropZone accept={field.accept} onFile={pick} disabled={disabled} label={`Upload ${field.label ?? 'image'}`}>
          <Icon icon={ImagePlus} className="size-6 text-muted" />
          <span className="font-semibold">Drop an image or <span className="text-primary underline">browse</span></span>
          {limits ? <span className="text-sm text-muted">{limits}</span> : null}
        </DropZone>
        {upload.state === 'rejected' ? <p className="flex items-start gap-1.5 text-sm font-medium text-tone-danger"><Icon icon={TriangleAlert} className="mt-0.5" />{upload.fileName}: {upload.reason}</p> : null}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 rounded-md border border-border bg-surface p-2">
      {upload.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, never optimised
        <img src={upload.image.url} alt="" className="aspect-[4/3] w-24 rounded-sm border border-border bg-well object-contain p-1" />
      ) : <span className="aspect-[4/3] w-24 rounded-sm bg-sunken" />}
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="truncate font-medium">{upload.fileName ?? upload.image?.alt}</span>
        {upload.state === 'uploading' ? <><Progress value={upload.progress ?? 0} label="Upload progress" /><span className="text-sm text-muted tabular">Uploading · {upload.progress ?? 0}%</span></> : null}
        {upload.state === 'processing' ? <Stamp tone="info" condition="processing" size="sm">Making responsive sizes</Stamp> : null}
        {upload.state === 'ready' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Stamp tone="success" size="sm">Ready</Stamp>
            <DropZoneButton accept={field.accept} onFile={pick} disabled={disabled} />
            <Button size="sm" variant="ghost" leadingIcon={Trash2} onClick={() => { preview(null); onChange({ state: 'empty' }) }} disabled={disabled}>Remove</Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DropZoneButton({ accept, onFile, disabled }: { accept?: readonly string[]; onFile: (f: File) => void; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-border-strong bg-surface px-2.5 text-sm font-semibold hover:bg-sunken', disabled && 'pointer-events-none opacity-60')}>
      <Icon icon={Upload} />Replace
      <input type="file" className="sr-only" accept={accept?.join(',')} disabled={disabled} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </label>
  )
}

/** Documents and evidence: uploading → scanning → ready, restricted, or error. */
export function FileInput({ field, value, onChange, disabled }: InputProps) {
  const current = asFile(value)
  const [problem, setProblem] = useState<string | null>(null)
  const pick = (file: File) => {
    const p = checkFile(file, field.accept, field.maxBytes)
    setProblem(p)
    if (!p) onChange({ name: file.name, size: file.size, type: file.type, state: 'uploading', progress: 0 } satisfies FileValue)
  }
  return (
    <div className="flex flex-col gap-2">
      {current ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <FileView field={field} value={current} />
            {current.state === 'ready' || current.state === 'error' ? (
              <IconButton icon={Trash2} label={`Remove ${current.name}`} size="icon-sm" onClick={() => onChange(null)} disabled={disabled} />
            ) : null}
          </div>
          {current.state === 'uploading' ? <Progress value={current.progress ?? 0} label={`Uploading ${current.name}`} /> : null}
          {current.state === 'scanning' ? <p className="flex items-center gap-1.5 text-sm text-muted"><Icon icon={ShieldCheck} />Checking the file before anyone can open it.</p> : null}
          {current.state === 'error' ? <p className="text-sm font-medium text-tone-danger">{current.reason ?? 'Upload failed.'} Try again.</p> : null}
        </div>
      ) : (
        <DropZone accept={field.accept} onFile={pick} disabled={disabled} label={`Upload ${field.label ?? 'file'}`}>
          <Icon icon={Upload} className="size-6 text-muted" />
          <span className="font-semibold">Drop a file or <span className="text-primary underline">browse</span></span>
          <span className="text-sm text-muted">{field.accept?.map(a => a.split('/')[1]!.toUpperCase()).join(', ')}{field.maxBytes ? ` · up to ${formatBytes(field.maxBytes)}` : ''}</span>
        </DropZone>
      )}
      {problem ? <p className="text-sm font-medium text-tone-danger">{problem}</p> : null}
    </div>
  )
}

const counties = KENYA_COUNTIES.map(c => ({ value: c, label: c }))

/** Kenyan address entry. Incomplete addresses are flagged; validated ones carry a stamp. */
export function AddressInput({ value, onChange, disabled }: InputProps) {
  const a: AddressValue = asAddress(value) ?? { line1: '', city: '', countryCode: 'KE' }
  const set = (patch: Partial<AddressValue>) => onChange({ ...a, ...patch, validated: false })
  const missing = [!a.line1 && 'street or building', !a.city && 'town', !a.region && 'county'].filter(Boolean)
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
      <Input aria-label="Address label" placeholder="Label, e.g. Main warehouse" value={a.label ?? ''} onChange={e => set({ label: e.target.value })} disabled={disabled} />
      <Input aria-label="Street or building" placeholder="Building, street" value={a.line1} onChange={e => set({ line1: e.target.value })} disabled={disabled} autoComplete="address-line1" />
      <Input aria-label="Floor, plot or landmark" placeholder="Floor, plot or landmark (optional)" value={a.line2 ?? ''} onChange={e => set({ line2: e.target.value })} disabled={disabled} autoComplete="address-line2" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem]">
        <Input aria-label="Town" placeholder="Town" value={a.city} onChange={e => set({ city: e.target.value })} disabled={disabled} autoComplete="address-level2" />
        <Combobox options={counties} value={a.region ?? null} onValueChange={v => set({ region: v ?? undefined })} placeholder="County" disabled={disabled} />
        <Input aria-label="Postal code" placeholder="Postal code" inputMode="numeric" value={a.postalCode ?? ''} onChange={e => set({ postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })} disabled={disabled} autoComplete="postal-code" />
      </div>
      {a.validated ? <Stamp tone="success" size="sm" className="self-start">Validated for delivery</Stamp>
        : missing.length ? <p className="text-sm text-muted">Still needed: {missing.join(', ')}.</p> : null}
    </div>
  )
}

/** Geographic point picked from a place search; coordinates stay visible. */
export function LocationInput({ value, onChange, disabled, options = [], loading, onSearch, invalid }: InputProps) {
  const l = asLocation(value)
  return (
    <div className="flex flex-col gap-2">
      <Combobox
        options={options}
        value={l?.label ?? null}
        onValueChange={label => {
          const o = options.find(x => x.value === label)
          const [lat, lng] = (o?.description ?? '').split(',').map(Number)
          onChange(o && Number.isFinite(lat) && Number.isFinite(lng) ? { label: o.label, lat, lng } : null)
        }}
        loading={loading}
        onSearch={onSearch}
        placeholder="Search a town, market or estate"
        emptyText="No places found. Try the nearest town."
        disabled={disabled}
      />
      {l ? <p className="flex items-center gap-1.5 text-sm text-muted"><Icon icon={MapPin} />{l.label} · <span className="font-mono">{l.lat.toFixed(4)}, {l.lng.toFixed(4)}</span></p> : null}
      {invalid && !l ? <p className="text-sm font-medium text-tone-danger">We could not place that location. Choose a nearby town instead.</p> : null}
    </div>
  )
}

type SecretInputValue = { set: boolean; last4?: string; rotatedAt?: string; revealed?: string; rotating?: boolean; error?: string }

/** Rotate-only secret: the stored value is never shown; a new one is revealed once. */
export function SecretInput({ field, value, onChange, disabled }: InputProps) {
  const s = (asSecret(value) ?? { set: false }) as SecretInputValue
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SecretView field={field} value={s} />
        <Button size="sm" variant="secondary" leadingIcon={s.rotating ? LoaderCircle : RefreshCw} loading={s.rotating} loadingLabel="Rotating" disabled={disabled} onClick={() => setConfirm(true)}>
          {s.set ? 'Rotate secret' : 'Create secret'}
        </Button>
      </div>
      {s.revealed ? (
        <div className="flex flex-col gap-1.5 rounded-sm border border-tone-warning bg-tone-warning-bg p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-tone-warning"><Icon icon={TriangleAlert} />Copy this now. It is shown once and cannot be retrieved later.</p>
          <span className="flex items-center gap-1"><code className="font-mono text-sm break-all">{s.revealed}</code><CopyValue value={s.revealed} label="Copy secret" /></span>
        </div>
      ) : null}
      {s.error ? <p className="text-sm font-medium text-tone-danger">{s.error}</p> : null}
      <AlertDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={s.set ? 'Rotate this secret?' : 'Create a secret?'}
        description="Integrations using the current secret stop working until they are updated with the new one."
        confirmLabel={s.set ? 'Rotate secret' : 'Create secret'}
        tone="destructive"
        onConfirm={() => { setConfirm(false); onChange({ ...s, rotating: true, revealed: undefined }) }}
      />
    </div>
  )
}

/** Restricted JSON editing for admin metadata; normal users get generated controls instead. */
export function JsonInput({ value, onChange, disabled, readOnly }: InputProps) {
  const [draft, setDraft] = useState(() => (typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)))
  return (
    <Textarea
      value={draft}
      onChange={e => { setDraft(e.target.value); try { onChange(JSON.parse(e.target.value)) } catch { onChange(e.target.value) } }}
      disabled={disabled}
      readOnly={readOnly}
      rows={8}
      spellCheck={false}
      className="font-mono text-sm"
    />
  )
}
