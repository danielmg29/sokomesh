'use client'

import { Check, CircleAlert } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import type { AppError, FieldMeta, ModelMeta } from '@/lib/contract/types'
import type { ComboOption } from '@/components/ui/combobox'
import { FieldDiff } from '../fields/FieldView'
import { FieldInput } from '../fields/FieldInput'
import { mirrorValidate } from '../fields/validate'

export type FormRecipe = 'inline' | 'sheet' | 'stepper' | 'auth'
export type FormMode = 'create' | 'edit' | 'command' | 'registration'
export type FormPhase = 'editing' | 'submitting' | 'invalid' | 'saved' | 'error' | 'conflict'

export type SubmitResult =
  | { ok: true; message?: string }
  | { ok: false; error: AppError; theirs?: Record<string, unknown> }

type Props = {
  meta: ModelMeta
  /** Field names in order; defaults to every writable, non-hidden field by weight. */
  fields?: readonly string[]
  mode: FormMode
  recipe?: FormRecipe
  initial?: Record<string, unknown>
  onSubmit: (values: Record<string, unknown>) => Promise<SubmitResult>
  submitLabel?: string
  title?: ReactNode
  description?: ReactNode
  /** Options for relation/location fields keyed by field name (from the caller's search). */
  options?: Record<string, readonly ComboOption[]>
  /** Fields this role may not write (from fieldPolicy), with the reason shown in place. */
  restricted?: Record<string, string>
  trigger?: ReactNode
  /** Start in a given phase, for documentation and tests. */
  initialPhase?: FormPhase
  initialError?: AppError
  initialTheirs?: Record<string, unknown>
}

function fieldsFor(meta: ModelMeta, names?: readonly string[]) {
  const byName = new Map(meta.fields.map(f => [f.name, f]))
  if (names) return names.map(n => byName.get(n)).filter((f): f is FieldMeta => Boolean(f))
  return meta.fields.filter(f => f.widget !== 'hidden' && !f.readOnly).sort((a, b) => (a.weight ?? 50) - (b.weight ?? 50))
}

function groupsOf(fields: FieldMeta[]) {
  const order: string[] = []
  const map = new Map<string, FieldMeta[]>()
  for (const f of fields) {
    const g = f.group ?? 'details'
    if (!map.has(g)) { map.set(g, []); order.push(g) }
    map.get(g)!.push(f)
  }
  return order.map(name => ({ name, fields: map.get(name)! }))
}

const groupTitle = (g: string) => g.replace(/[-_]/g, ' ').replace(/^\w/, c => c.toUpperCase())

/** Create, edit, command and registration forms from field metadata (manual 6.4, 6.13). */
export function ProjectedForm({
  meta, fields: names, mode, recipe = 'inline', initial = {}, onSubmit, submitLabel, title, description, options = {}, restricted = {}, trigger,
  initialPhase = 'editing', initialError, initialTheirs,
}: Props) {
  const fields = fieldsFor(meta, names)
  const groups = groupsOf(fields)
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map(f => [f.name, initial[f.name] ?? f.default ?? null])))
  const [phase, setPhase] = useState<FormPhase>(initialPhase)
  const [error, setError] = useState<AppError | null>(initialError ?? null)
  const [theirs, setTheirs] = useState<Record<string, unknown> | null>(initialTheirs ?? null)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const formId = useId()

  const set = (name: string, v: unknown) => {
    setValues(s => ({ ...s, [name]: v }))
    if (phase === 'saved' || phase === 'invalid') setPhase('editing')
  }
  const errorFor = (f: FieldMeta) => error?.fields?.[f.name]?.[0] ?? clientErrors[f.name]

  const validate = (subset: FieldMeta[]) => {
    const found: Record<string, string> = {}
    for (const f of subset) { if (restricted[f.name]) continue; const m = mirrorValidate(f, values[f.name]); if (m) found[f.name] = m }
    return found
  }

  const showInvalid = (found: Record<string, string>) => {
    setClientErrors(found)
    setPhase('invalid')
    requestAnimationFrame(() => summaryRef.current?.focus()) // focus the summary; it links to each field
  }

  const submit = async () => {
    const found = validate(fields)
    if (Object.keys(found).length) return showInvalid(found)
    setClientErrors({})
    setPhase('submitting')
    const result = await onSubmit(values)
    if (result.ok) {
      setError(null); setTheirs(null); setPhase('saved')
      // A sheet closes on success; a create sheet opens empty next time.
      if (recipe === 'sheet') {
        setOpen(false)
        if (mode === 'create') { setValues(Object.fromEntries(fields.map(f => [f.name, initial[f.name] ?? f.default ?? null]))); setPhase('editing') }
      }
      return
    }
    setError(result.error)
    if (result.error.code === 'CONFLICT' && result.theirs) { setTheirs(result.theirs); setPhase('conflict'); return }
    setPhase(result.error.code === 'VALIDATION' ? 'invalid' : 'error')
    requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const fieldErrors = fields.filter(f => errorFor(f))
  const label = submitLabel ?? (mode === 'create' ? `Create ${meta.label.toLowerCase()}` : mode === 'edit' ? 'Save changes' : mode === 'registration' ? 'Create account' : 'Confirm')
  const isStepper = recipe === 'stepper' && groups.length > 1
  const visibleGroups = isStepper ? [groups[step]!] : groups
  const lastStep = !isStepper || step === groups.length - 1

  const conflictFields = theirs ? fields.filter(f => JSON.stringify(theirs[f.name] ?? null) !== JSON.stringify(values[f.name] ?? null) && f.name in theirs) : []

  const body = (
    <form
      id={formId}
      noValidate
      onSubmit={e => { e.preventDefault(); if (lastStep) void submit(); else { const found = validate(groups[step]!.fields); if (Object.keys(found).length) showInvalid(found); else { setClientErrors({}); setPhase('editing'); setStep(s => s + 1) } } }}
      className={cn('flex flex-col gap-6', recipe === 'auth' && 'mx-auto w-full max-w-sm')}
      aria-busy={phase === 'submitting' || undefined}
    >
      {isStepper ? (
        <ol className="flex items-center gap-0" aria-label="Steps">
          {groups.map((g, i) => (
            <li key={g.name} className="flex flex-1 items-center last:flex-none">
              <span className={cn('flex items-center gap-2 text-sm font-semibold whitespace-nowrap', i <= step ? 'text-foreground' : 'text-muted')} aria-current={i === step ? 'step' : undefined}>
                <span className={cn('grid size-6 place-items-center rounded-xs border-[length:var(--border-stamp)] text-xs tabular', i < step ? 'border-primary bg-primary text-primary-foreground' : i === step ? 'border-signal-border bg-signal' : 'border-border-strong bg-surface')}>
                  {i < step ? <Icon icon={Check} strokeWidth={3} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{groupTitle(g.name)}</span>
              </span>
              {i < groups.length - 1 ? <span className={cn('mx-3 h-0.5 flex-1', i < step ? 'bg-primary animate-thread' : 'bg-border')} aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      ) : null}

      {(phase === 'invalid' || phase === 'error') && (fieldErrors.length || error) ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="flex flex-col gap-2 rounded-md border border-tone-danger bg-tone-danger-bg/60 p-4">
          <p className="flex items-center gap-2 font-semibold text-tone-danger"><Icon icon={CircleAlert} />
            {fieldErrors.length ? `${fieldErrors.length} ${fieldErrors.length === 1 ? 'detail needs' : 'details need'} attention` : error?.detail}
          </p>
          {fieldErrors.length ? (
            <ul className="flex flex-col gap-1 pl-6 text-md">
              {fieldErrors.map(f => <li key={f.name} className="list-disc"><span className="font-semibold">{f.label}:</span> {errorFor(f)}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}

      {phase === 'conflict' && theirs ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="flex flex-col gap-3 rounded-md border border-tone-warning bg-tone-warning-bg/50 p-4">
          <p className="font-semibold">{error?.detail ?? 'Someone else saved this record while you were editing.'} Choose what to keep for each field, then save again.</p>
          {conflictFields.map(f => (
            <div key={f.name} className="flex flex-col gap-2">
              <span className="text-sm font-semibold">{f.label}</span>
              <FieldDiff field={f} before={initial[f.name]} after={values[f.name]} theirs={theirs[f.name]} state="conflict" />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setTheirs(t => (t ? { ...t, [f.name]: values[f.name] } : t))}>Keep mine</Button>
                <Button size="sm" variant="secondary" onClick={() => set(f.name, theirs[f.name])}>Use saved</Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {visibleGroups.map(g => (
        <fieldset key={g.name} className="flex min-w-0 flex-col gap-4" disabled={phase === 'submitting'}>
          {groups.length > 1 && recipe !== 'auth' ? <legend className="mb-1 font-display text-lg font-bold">{groupTitle(g.name)}</legend> : null}
          {g.fields.map(f => (
            <FieldInput
              key={f.name}
              field={f}
              value={values[f.name]}
              onChange={v => set(f.name, v)}
              error={errorFor(f)}
              restrictedReason={restricted[f.name]}
              options={options[f.name]}
              disabled={phase === 'submitting'}
            />
          ))}
        </fieldset>
      ))}

      <div className={cn('flex flex-wrap items-center gap-3', recipe === 'sheet' && 'sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 py-3', recipe === 'auth' && 'flex-col items-stretch')}>
        {isStepper && step > 0 ? <Button variant="secondary" onClick={() => { setStep(s => s - 1); setPhase('editing') }}>Back</Button> : null}
        <Button type="submit" variant="primary" size={recipe === 'auth' ? 'lg' : 'md'} block={recipe === 'auth'} loading={phase === 'submitting'} loadingLabel="Saving…">
          {lastStep ? label : 'Continue'}
        </Button>
        <span role="status" className="text-md">
          {phase === 'saved' ? <span className="inline-flex items-center gap-1.5 font-semibold text-tone-success"><Icon icon={Check} strokeWidth={2.5} />Saved</span> : null}
        </span>
      </div>
    </form>
  )

  if (recipe === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={setOpen} trigger={trigger} title={title ?? label} description={description}>
        {body}
      </Sheet>
    )
  }
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {title ? <div className="flex flex-col gap-1"><h3 className="font-display text-xl font-bold">{title}</h3>{description ? <p className="text-muted">{description}</p> : null}</div> : null}
      {body}
    </div>
  )
}
