'use client'

import { Clock, Lock, OctagonX, RefreshCw, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import { ApiError } from '@/lib/client/api'
import { errors, type ErrorCode } from '@/lib/contract/generated'

export type ErrorKind = 'retryable' | 'non-retryable' | 'conflict' | 'permission' | 'rate-limit' | 'offline' | 'unavailable'

/** Which presentation an API error code gets; message and retryability come from the contract. */
export function kindForCode(code: string): ErrorKind {
  switch (code) {
    case 'CONFLICT': return 'conflict'
    case 'FORBIDDEN': return 'permission'
    case 'RATE_LIMITED': return 'rate-limit'
    case 'UNAVAILABLE': return 'unavailable'
    default: return (errors as Record<string, { retryable: boolean }>)[code]?.retryable ? 'retryable' : 'non-retryable'
  }
}

/**
 * ErrorState's `code` and `detail` for a failed query or command, so a missing record reads as not found and a
 * refused one as not permitted, never as "try again"; `offline` when the browser has no connection.
 */
export function errorFrom(err: unknown): { code?: string; detail?: string; kind?: ErrorKind } {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { kind: 'offline' }
  if (err instanceof ApiError) return { code: err.error.code, detail: err.error.detail }
  return {}
}

const look: Record<ErrorKind, { icon: LucideIcon; tone: string }> = {
  retryable: { icon: TriangleAlert, tone: 'border-tone-warning bg-tone-warning-bg/60 text-tone-warning' },
  'non-retryable': { icon: OctagonX, tone: 'border-tone-danger bg-tone-danger-bg/60 text-tone-danger' },
  conflict: { icon: RefreshCw, tone: 'border-tone-warning bg-tone-warning-bg/60 text-tone-warning' },
  permission: { icon: Lock, tone: 'border-tone-neutral bg-tone-neutral-bg text-tone-neutral' },
  'rate-limit': { icon: Clock, tone: 'border-tone-info bg-tone-info-bg/60 text-tone-info' },
  offline: { icon: WifiOff, tone: 'border-tone-neutral bg-tone-neutral-bg text-tone-neutral' },
  unavailable: { icon: TriangleAlert, tone: 'border-tone-warning bg-tone-warning-bg/60 text-tone-warning' },
}

type Props = {
  /** Contract error code (errors block). Supplies the default message. */
  code?: ErrorCode | string
  kind?: ErrorKind
  title?: string
  /** Server detail when it is more specific than the contract's default message. */
  detail?: ReactNode
  onRetry?: () => void
  /** Conflict: reload the saved version and compare. */
  onCompare?: () => void
  retryAfterSeconds?: number
  size?: 'block' | 'inline'
  className?: string
}

export function ErrorState({ code, kind: kindProp, title, detail, onRetry, onCompare, retryAfterSeconds, size = 'block', className }: Props) {
  const kind = kindProp ?? (code ? kindForCode(code) : 'retryable')
  const contractMessage = code ? (errors as Record<string, { message: string }>)[code]?.message : undefined
  const [wait, setWait] = useState(retryAfterSeconds ?? 0)
  useEffect(() => {
    if (kind !== 'rate-limit' || wait <= 0) return
    const t = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [kind, wait])

  const defaults: Record<ErrorKind, string> = {
    retryable: 'This did not go through',
    'non-retryable': 'This cannot be completed',
    conflict: 'This record changed while you were working',
    permission: 'Your role cannot see or change this',
    'rate-limit': 'Too many requests',
    offline: 'You are offline',
    unavailable: 'The service is temporarily unavailable',
  }
  const offlineText = 'Changes are not sent while offline. Reconnect and try again; nothing you have entered is lost.'

  return (
    <div role="alert" className={cn('flex gap-3 rounded-md border p-4', look[kind].tone, size === 'block' && 'flex-col sm:flex-row sm:items-start', className)}>
      <Icon icon={look[kind].icon} className="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-foreground">
        <p className="font-semibold">{title ?? defaults[kind]}</p>
        <p className="text-md text-muted">{detail ?? (kind === 'offline' ? offlineText : contractMessage)}</p>
        {code ? <p className="font-mono text-xs text-muted">{code}</p> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {kind === 'conflict' && onCompare ? <Button size="sm" variant="primary" leadingIcon={RefreshCw} onClick={onCompare}>Load saved version and compare</Button> : null}
          {(kind === 'retryable' || kind === 'unavailable' || kind === 'offline') && onRetry ? <Button size="sm" variant="secondary" leadingIcon={RefreshCw} onClick={onRetry}>Try again</Button> : null}
          {kind === 'rate-limit' && onRetry ? (
            <Button size="sm" variant="secondary" disabled={wait > 0} onClick={onRetry}>
              {wait > 0 ? <span aria-live="off" className="tabular">Try again in {wait}s</span> : 'Try again'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
