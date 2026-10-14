'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Icon } from '@/components/ui/icon'
import { formatDateTime, formatRelative } from '@/lib/format'

/** Copy a machine identifier (SKU, TXN, URL) with a polite confirmation. */
export function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard?.writeText(value).then(() => setCopied(true)) }}
      className="grid size-6 shrink-0 place-items-center rounded-xs text-muted hover:bg-sunken hover:text-foreground"
      aria-label={label}
      title={label}
    >
      <Icon icon={copied ? Check : Copy} className={copied ? 'text-tone-success' : undefined} />
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </button>
  )
}

// One shared minute clock for every relative timestamp on the page (bounded: a single
// interval, cleared when the last subscriber unmounts).
let current: string | undefined
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    current = new Date().toISOString()
    timer = setInterval(() => { current = new Date().toISOString(); listeners.forEach(l => l()) }, 60_000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size && timer) { clearInterval(timer); timer = undefined }
  }
}
const getSnapshot = () => (current ??= new Date().toISOString())
const getServerSnapshot = () => undefined

/**
 * Relative label with the absolute timestamp for assistive tech and hover. Server render
 * and hydration show the absolute form, so they always agree; `now` pins the clock.
 */
export function RelativeTime({ iso, now }: { iso: string; now?: string }) {
  const live = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const clock = now ?? live
  const absolute = formatDateTime(iso)
  return (
    <time dateTime={iso} title={absolute} className="tabular whitespace-nowrap">
      {clock ? (
        <>
          <span aria-hidden="true">{formatRelative(iso, clock)}</span>
          <span className="sr-only">{absolute}</span>
        </>
      ) : absolute}
    </time>
  )
}
