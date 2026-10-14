'use client'

import { X } from 'lucide-react'
import { Toast as ToastPrimitive } from 'radix-ui'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/contract/types'
import { Button } from './button'
import { Icon } from './icon'
import { toneMark } from './stamp'

export type ToastInput = {
  tone: Extract<Tone, 'info' | 'success' | 'warning' | 'danger'>
  title: string
  description?: string
  action?: { label: string; onAction: () => void; altText: string }
  /** Errors and actionable toasts stay until dismissed. */
  persistent?: boolean
}

type ToastItem = ToastInput & { id: number }

const MAX_VISIBLE = 3 // bounded queue (Pillar 4): older toasts are dropped first
const ToastContext = createContext<((t: ToastInput) => void) | null>(null)

export function useToast() {
  const push = useContext(ToastContext)
  if (!push) throw new Error('useToast must be used inside <ToastProvider>')
  return push
}

const toneBar: Record<ToastInput['tone'], string> = {
  info: 'text-tone-info', success: 'text-tone-success', warning: 'text-tone-warning', danger: 'text-tone-danger',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((t: ToastInput) => {
    setItems(prev => [...prev, { ...t, id: Date.now() + Math.random() }].slice(-MAX_VISIBLE))
  }, [])
  const remove = (id: number) => setItems(prev => prev.filter(t => t.id !== id))
  const value = useMemo(() => push, [push])
  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map(t => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.persistent || t.tone === 'danger' || t.action ? Infinity : 5000}
            type={t.tone === 'danger' ? 'foreground' : 'background'}
            onOpenChange={open => { if (!open) remove(t.id) }}
            className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-sm border border-border-strong bg-surface p-3.5 shadow-overlay data-[state=open]:animate-transfer data-[swipe=end]:animate-none"
          >
            <Icon icon={toneMark[t.tone]} className={cn('mt-0.5 size-5', toneBar[t.tone])} strokeWidth={2.25} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <ToastPrimitive.Title className="font-semibold">{t.title}</ToastPrimitive.Title>
              {t.description ? <ToastPrimitive.Description className="text-md text-muted">{t.description}</ToastPrimitive.Description> : null}
              {t.action ? (
                <ToastPrimitive.Action altText={t.action.altText} asChild>
                  <Button size="sm" variant="secondary" className="mt-2 self-start" onClick={t.action.onAction}>{t.action.label}</Button>
                </ToastPrimitive.Action>
              ) : null}
            </div>
            <ToastPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Dismiss"><Icon icon={X} /></Button>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-[60] flex w-full max-w-md flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
