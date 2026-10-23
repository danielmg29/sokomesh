'use client'

import { useState, type ReactNode } from 'react'
import { AlertDialog, Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ActionMeta, AppError, ModelMeta, Rec } from '@/lib/contract/types'
import { FieldInput } from '../fields/FieldInput'
import { displayOf } from '@/lib/contract/display'

type Props = {
  action: ActionMeta
  meta: ModelMeta
  record: Rec
  /** The control that opens it; omit when the caller opens it with `open` (e.g. from a menu). */
  trigger?: ReactNode
  /** Resolves on success; rejects with an AppError to keep the dialog open with its message. */
  onConfirm: (input: Record<string, unknown>) => Promise<unknown> | void
  description?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Confirm-only (destructive or standard) or a small command form built from `action.input`. */
export function ConfirmAction({ action, meta, record, trigger, onConfirm, description, open: controlled, onOpenChange }: Props) {
  const [own, setOwn] = useState(false)
  const open = controlled ?? own
  const setOpen = (o: boolean) => { setOwn(o); onOpenChange?.(o) }
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const inputFields = (action.input ?? []).map(n => meta.fields.find(f => f.name === n)).filter((f): f is NonNullable<typeof f> => Boolean(f))
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(inputFields.map(f => [f.name, record[f.name] ?? f.default ?? null])))
  const destructive = action.tone === 'danger'
  const subject = displayOf(meta, record)

  const run = async () => {
    setPending(true)
    setError(null)
    try {
      await onConfirm(values)
      setOpen(false)
    } catch (e) {
      setError(e as AppError)
    } finally {
      setPending(false)
    }
  }

  const message = error ? <p role="alert" className="rounded-sm border border-tone-danger bg-tone-danger-bg/60 px-3 py-2 text-md text-tone-danger">{error.detail}</p> : null

  if (!inputFields.length) {
    return (
      <AlertDialog
        open={open}
        onOpenChange={o => { setOpen(o); if (!o) setError(null) }}
        trigger={trigger}
        title={`${action.label}?`}
        description={description ?? `${action.label} for ${subject}. ${destructive ? 'This cannot be undone.' : ''}`}
        confirmLabel={action.label}
        tone={destructive ? 'destructive' : 'standard'}
        pending={pending}
        onConfirm={run}
      >
        {message}
      </AlertDialog>
    )
  }
  return (
    <Dialog
      open={open}
      onOpenChange={o => { setOpen(o); if (!o) setError(null) }}
      trigger={trigger}
      title={action.label}
      description={description ?? subject}
      size="sm"
      footer={<>
        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant={destructive ? 'danger' : 'primary'} loading={pending} onClick={run}>{action.label}</Button>
      </>}
    >
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void run() }}>
        {inputFields.map(f => (
          <FieldInput key={f.name} field={f} value={values[f.name]} onChange={v => setValues(s => ({ ...s, [f.name]: v }))} error={error?.fields?.[f.name]?.[0]} />
        ))}
        {message}
      </form>
    </Dialog>
  )
}
