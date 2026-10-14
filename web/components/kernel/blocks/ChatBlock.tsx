'use client'

import { EyeOff, Send } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/choice'
import { Icon } from '@/components/ui/icon'
import { Textarea } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { EmptyState } from '../feedback/EmptyState'
import { ErrorState } from '../feedback/ErrorState'
import { LoadingState } from '../feedback/LoadingState'
import { RelativeTime } from '../fields/islands'

export type ChatMessage = { id: string; author: string; organization?: string; at: string; body: string; visibility: 'public' | 'internal'; mine?: boolean; pending?: boolean }

type Props = {
  messages: readonly ChatMessage[]
  /** Policy: may this viewer read and write internal notes? Decided by the server. */
  canInternal?: boolean
  canWrite?: boolean
  onSend?: (body: string, visibility: 'public' | 'internal') => void
  density?: 'compact' | 'comfortable'
  state?: 'ready' | 'loading' | 'empty' | 'error'
  now?: string
  title?: string
  maxLength?: number
}

/** Thread intent: quote negotiation and dispute conversations, with policy-scoped internal notes. */
export function ChatBlock({ messages, canInternal, canWrite = true, onSend, density = 'comfortable', state = 'ready', now, title = 'Conversation', maxLength = 4000 }: Props) {
  const [draft, setDraft] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public')
  const shown = canInternal ? messages : messages.filter(m => m.visibility === 'public')
  return (
    <section className="flex min-w-0 flex-col rounded-md border border-border bg-surface" aria-label={title}>
      <header className="border-b border-border px-4 py-3"><h3 className="font-display text-lg font-bold">{title}</h3></header>
      <div className="flex min-h-40 flex-col gap-3 px-4 py-4">
        {state === 'loading' ? <LoadingState variant="skeleton" shape="list" rows={3} label="Loading messages" /> : null}
        {state === 'error' ? <ErrorState code="UNAVAILABLE" size="inline" /> : null}
        {state !== 'loading' && state !== 'error' && !shown.length ? <EmptyState kind="no-data" title="No messages yet" description="Messages here are visible to both organizations." size="inline" /> : null}
        {state === 'ready' || state === 'empty' ? (
          <ol className="flex flex-col gap-3" aria-live="polite">
            {shown.map(m => (
              <li key={m.id} className={cn('flex max-w-[85%] gap-2.5', m.mine && 'self-end flex-row-reverse')}>
                <Avatar name={m.author} size={density === 'compact' ? 'sm' : 'md'} />
                <div className={cn('flex min-w-0 flex-col gap-1 rounded-md border px-3 py-2', m.visibility === 'internal' ? 'border-dashed border-tone-neutral bg-tone-neutral-bg' : m.mine ? 'border-primary bg-primary-soft' : 'border-border bg-surface', m.pending && 'opacity-70')}>
                  <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-semibold">{m.author}</span>
                    {m.organization ? <span className="text-muted">{m.organization}</span> : null}
                    <span className="text-muted"><RelativeTime iso={m.at} now={now} /></span>
                    {m.visibility === 'internal' ? <span className="inline-flex items-center gap-1 font-semibold text-tone-neutral"><Icon icon={EyeOff} />Internal note</span> : null}
                    {m.pending ? <span className="text-muted">Sending…</span> : null}
                  </div>
                  <p className={cn('whitespace-pre-line', density === 'compact' ? 'text-sm' : 'text-md')}>{m.body}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      {canWrite && onSend ? (
        <form className="flex flex-col gap-2 border-t border-border p-3" onSubmit={e => { e.preventDefault(); if (draft.trim()) { onSend(draft.trim(), visibility); setDraft('') } }}>
          <label className="sr-only" htmlFor="chat-draft">Message</label>
          <Textarea id="chat-draft" rows={2} value={draft} onChange={e => setDraft(e.target.value)} maxLength={maxLength} placeholder={visibility === 'internal' ? 'Note for your team only…' : 'Write to the other organization…'} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {canInternal ? <Segmented label="Visibility" size="sm" value={visibility} onValueChange={setVisibility} items={[{ value: 'public', label: 'Both parties' }, { value: 'internal', label: 'Internal note' }]} /> : <span />}
            <Button type="submit" variant="primary" size="sm" leadingIcon={Send} disabled={!draft.trim()}>Send</Button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
