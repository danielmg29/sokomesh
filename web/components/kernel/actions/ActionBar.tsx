'use client'

import { MoreHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import { Cluster } from '@/components/layout/primitives'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Tooltip } from '@/components/ui/overlay'
import { useToast } from '@/components/ui/toast'
import type { ActionMeta, ModelMeta, Rec } from '@/lib/contract/types'
import type { Density } from '@/lib/design/tokens.generated'
import { ConfirmAction } from './ConfirmAction'
import { iconFor } from './icons'
import { resolveActions, variantForTone } from './model'
import { displayOf } from '@/lib/contract/display'

/**
 * Run a command that has no dialog of its own; a failure is reported as a toast with the API's message
 * (commands with a dialog show it in the dialog instead).
 */
function useDirectRun(onRun: RunAction, record: Rec) {
  const toast = useToast()
  return (action: ActionMeta) => {
    Promise.resolve(onRun(action, record)).catch((err: unknown) => {
      const detail = typeof err === 'object' && err !== null && 'detail' in err ? String((err as { detail: unknown }).detail) : undefined
      toast({ tone: 'danger', title: `${action.label}: not done`, description: detail ?? 'Try again in a moment.', persistent: true })
    })
  }
}

export type RunAction = (action: ActionMeta, record: Rec, input?: Record<string, unknown>) => Promise<unknown> | void

type Props = {
  meta: ModelMeta
  record: Rec
  onRun: RunAction
  density?: Density
  /** Action currently executing; its button shows pending and the others wait. */
  pending?: string | null
  /** Put the first N actions inline and the rest in an overflow menu. */
  inline?: number
  /** FLOW: primary actions at the large, touch-safe size. */
  size?: 'sm' | 'md' | 'lg'
}

/** Buttons for the record's permitted commands. Tone, icon, confirm and input come from the contract. */
export function ActionBar({ meta, record, onRun, density = 'comfortable', pending = null, inline = 3, size }: Props) {
  const direct = useDirectRun(onRun, record)
  const states = resolveActions(meta, record)
  if (!states.length) return null
  const shown = states.slice(0, inline)
  const overflow = states.slice(inline)
  const buttonSize = size ?? (density === 'compact' ? 'sm' : 'md')
  return (
    <Cluster gap="sm" role="group" aria-label={`Actions for ${displayOf(meta, record)}`}>
      {shown.map(({ action, available, reason }) => {
        const button = (
          <Button
            key={action.name}
            variant={variantForTone(action.tone)}
            size={buttonSize}
            leadingIcon={iconFor(action.icon)}
            loading={pending === action.name}
            loadingLabel={`${action.label}…`}
            disabled={(pending !== null && pending !== action.name) || !available}
            aria-describedby={reason ? `${record.id}-${action.name}-reason` : undefined}
            onClick={action.confirm || action.input?.length ? undefined : () => direct(action)}
          >
            {action.label}
          </Button>
        )
        const control = available && (action.confirm || action.input?.length)
          ? <ConfirmAction key={action.name} action={action} meta={meta} record={record} trigger={button} onConfirm={input => onRun(action, record, input)} />
          : button
        return reason ? (
          <Tooltip key={action.name} content={reason}>
            <span tabIndex={0} className="inline-flex rounded-sm">
              {control}
              <span id={`${record.id}-${action.name}-reason`} className="sr-only">{reason}</span>
            </span>
          </Tooltip>
        ) : control
      })}
      {overflow.length ? <ActionMenu meta={meta} record={record} onRun={onRun} actions={overflow.map(s => s.action)} density={density} /> : null}
    </Cluster>
  )
}

/** Overflow of permitted commands for dense rows and compact cards. Keyboard-first (Radix menu). */
export function ActionMenu({ meta, record, onRun, actions, density = 'comfortable', label }: Props & { actions?: ActionMeta[]; label?: string }) {
  const direct = useDirectRun(onRun, record)
  // A command with a confirmation or a small form opens its dialog after the menu closes; rendered inside
  // the menu, the dialog would close with it.
  const [dialog, setDialog] = useState<ActionMeta | null>(null)
  // The menu must not take focus back while the dialog opens (the dialog would read that as focus leaving
  // and close); focus returns to the trigger when the dialog closes instead.
  const opening = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const states = actions ? resolveActions({ ...meta, actions }, record) : resolveActions(meta, record)
  if (!states.length) return null // no permitted commands: no trigger (the API refuses them anyway)
  const subject = displayOf(meta, record)
  const safe = states.filter(s => s.action.tone !== 'danger')
  const danger = states.filter(s => s.action.tone === 'danger')
  const item = ({ action, available, reason }: (typeof states)[number]) => (
    <MenuItem
      key={action.name}
      tone={action.tone === 'danger' ? 'danger' : undefined}
      icon={iconFor(action.icon) ? <Icon icon={iconFor(action.icon)!} /> : undefined}
      disabled={!available}
      hint={!available ? 'Unavailable' : undefined}
      onSelect={() => { if (action.confirm || action.input?.length) { opening.current = true; setDialog(action) } else direct(action) }}
    >
      {action.label}{reason ? <span className="block text-sm text-muted">{reason}</span> : null}
    </MenuItem>
  )
  return (
    <>
    {dialog ? (
      <ConfirmAction action={dialog} meta={meta} record={record} open onOpenChange={o => { if (!o) { setDialog(null); triggerRef.current?.focus() } }} onConfirm={input => onRun(dialog, record, input)} />
    ) : null}
    <Menu>
      <MenuTrigger asChild>
        <Button ref={triggerRef} variant="secondary" size={density === 'compact' ? 'icon-sm' : 'icon'} aria-label={label ?? `More actions for ${subject}`}>
          <Icon icon={MoreHorizontal} />
        </Button>
      </MenuTrigger>
      <MenuContent onCloseAutoFocus={e => { if (opening.current) { e.preventDefault(); opening.current = false } }}>
        <MenuLabel>{subject}</MenuLabel>
        {safe.map(item)}
        {danger.length && safe.length ? <MenuSeparator /> : null}
        {danger.map(item)}
      </MenuContent>
    </Menu>
    </>
  )
}
