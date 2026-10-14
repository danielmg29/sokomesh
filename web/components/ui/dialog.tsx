'use client'

import { X } from 'lucide-react'
import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './button'
import { Icon } from './icon'

const overlay = 'fixed inset-0 z-50 bg-overlay data-[state=open]:animate-reveal'

type DialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

/** Modal for a task that needs protected focus. Prefer Sheet for side work, inline for everything else. */
export function Dialog({ open, onOpenChange, trigger, title, description, children, footer, size = 'md' }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[min(90dvh,48rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-md border border-border-strong bg-surface shadow-overlay',
            'data-[state=open]:animate-reveal',
            size === 'sm' && 'max-w-md', size === 'md' && 'max-w-xl', size === 'lg' && 'max-w-3xl',
          )}
        >
          <PanelHeader title={title} description={description} kind="dialog" />
          {children ? <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div> : null}
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function PanelHeader({ title, description, kind }: { title: ReactNode; description?: ReactNode; kind: 'dialog' | 'sheet' }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <DialogPrimitive.Title className="font-display text-xl font-bold">{title}</DialogPrimitive.Title>
        {description ? <DialogPrimitive.Description className="text-md text-muted">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{kind}</DialogPrimitive.Description>}
      </div>
      <DialogPrimitive.Close asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Close">
          <Icon icon={X} />
        </Button>
      </DialogPrimitive.Close>
    </div>
  )
}

type SheetProps = Omit<DialogProps, 'size'> & { side?: 'right' | 'bottom' | 'left'; width?: 'md' | 'lg' }

/** Side or bottom panel: detail views, narrow-screen filters, command input, editors. */
export function Sheet({ open, onOpenChange, trigger, title, description, children, footer, side = 'right', width = 'md' }: SheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col border-border-strong bg-surface shadow-overlay data-[state=open]:animate-transfer',
            side === 'right' && 'inset-y-0 right-0 w-full border-l',
            side === 'left' && 'inset-y-0 left-0 w-full border-r',
            side !== 'bottom' && (width === 'md' ? 'sm:max-w-md' : 'sm:max-w-2xl'),
            side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-md border-t data-[state=open]:animate-reveal',
          )}
        >
          <PanelHeader title={title} description={description} kind="sheet" />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

type AlertDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  title: ReactNode
  description: ReactNode
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'standard' | 'destructive'
  pending?: boolean
  onConfirm: () => void
}

/** Confirmation that cannot be dismissed by clicking outside. Names the action in the button. */
export function AlertDialog({ open, onOpenChange, trigger, title, description, children, confirmLabel, cancelLabel = 'Keep as is', tone = 'standard', pending, onConfirm }: AlertDialogProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertPrimitive.Trigger asChild>{trigger}</AlertPrimitive.Trigger> : null}
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlay} />
        <AlertPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border border-border-strong bg-surface p-5 shadow-overlay data-[state=open]:animate-reveal">
          <div className="flex flex-col gap-1.5">
            <AlertPrimitive.Title className="font-display text-xl font-bold">{title}</AlertPrimitive.Title>
            <AlertPrimitive.Description className="text-md text-muted">{description}</AlertPrimitive.Description>
          </div>
          {children}
          <div className="flex flex-wrap justify-end gap-2">
            <AlertPrimitive.Cancel asChild>
              <Button variant="secondary">{cancelLabel}</Button>
            </AlertPrimitive.Cancel>
            <Button
              variant={tone === 'destructive' ? 'danger' : 'primary'}
              loading={pending}
              onClick={e => { e.preventDefault(); onConfirm() }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  )
}

export const DialogClose = DialogPrimitive.Close
