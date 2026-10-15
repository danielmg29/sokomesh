'use client'

// SM-F-21 Notifications. Configured ActivityBlock-style list and a preference matrix. Records mirror
// the spec's Notification and NotificationPreference fields; text is plain, never rich.

import { Bell, CheckCheck, ExternalLink, Mail, MonitorSmartphone, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { RelativeTime } from '@/components/kernel/fields/islands'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { Button, IconButton } from '@/components/ui/button'
import { Segmented, Switch } from '@/components/ui/choice'
import { Icon } from '@/components/ui/icon'
import { FormField } from '@/components/ui/form-field'
import { Popover } from '@/components/ui/overlay'
import { Select } from '@/components/ui/select'
import { Stamp } from '@/components/ui/stamp'
import { ScrollArea, TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { FacetChips, TablePager, TableSearch, TableToolbar } from '@/components/ui/table-controls'
import { asStringList } from '@/components/kernel/fields/types'
import { useTableQuery } from '@/lib/client/use-table-query'
import { cn } from '@/lib/cn'
import { locales } from '@/lib/contract/generated'
import type { Accessors } from '@/lib/query'

export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'read'
export type NotificationChannel = 'in_app' | 'email'
export type AppNotification = {
  id: string; channel: NotificationChannel; title: string; body: string; deepLink?: string
  status: NotificationStatus; sentAt?: string; readAt?: string
}

const channelLook: Record<NotificationChannel, { label: string; icon: LucideIcon }> = {
  in_app: { label: 'In SokoMesh', icon: MonitorSmartphone },
  email: { label: 'Email', icon: Mail },
}

const isUnread = (n: AppNotification) => n.status === 'sent' && !n.readAt

/**
 * Notifications for the signed-in user. `page` lists with a filter; `panel` is the compact list in
 * the bell popover. Unread is sent without a read time; queued and failed deliveries say so.
 */
export function NotificationsBlock({ notifications, layout = 'page', state = 'ready', now, onMarkRead, onMarkAllRead, onRetry }: {
  notifications: readonly AppNotification[]; layout?: 'page' | 'panel'; state?: 'ready' | 'loading' | 'empty' | 'error'; now?: string
  onMarkRead?: (id: string) => void; onMarkAllRead?: () => void; onRetry?: () => void
}) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const unread = notifications.filter(isUnread).length
  const shown = filter === 'unread' ? notifications.filter(isUnread) : notifications
  const panel = layout === 'panel'

  let body
  if (state === 'loading') body = <LoadingState variant="skeleton" shape="list" rows={panel ? 3 : 4} label="Loading notifications" />
  else if (state === 'error') body = <ErrorState kind="retryable" title="Notifications did not load" detail="Your orders and payments are unaffected." onRetry={onRetry} size="inline" />
  else if (state === 'empty' || shown.length === 0) {
    body = <EmptyState kind="no-data" size={panel ? 'inline' : 'block'} title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'} description="Order, approval, quote, payment and delivery updates appear here." />
  } else {
    body = (
      <ul className={cn('flex flex-col divide-y divide-border', panel && 'max-h-96 overflow-y-auto')}>
        {shown.map(n => {
          const fresh = isUnread(n)
          const ch = channelLook[n.channel]
          return (
            <li key={n.id} className={cn('flex gap-3', panel ? 'px-3 py-2.5' : 'px-4 py-3', fresh && 'bg-primary-soft')}>
              <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-xs', fresh ? 'bg-signal ring-1 ring-signal-border' : 'bg-transparent')} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className={cn('min-w-0 text-md', fresh ? 'font-semibold' : 'font-medium text-muted')}>{fresh ? <span className="sr-only">Unread: </span> : null}{n.title}</span>
                  {n.sentAt ? <span className="shrink-0 text-xs text-muted tabular"><RelativeTime iso={n.sentAt} now={now} /></span> : null}
                </div>
                <p className={cn('max-w-[68ch] text-sm', fresh ? 'text-foreground' : 'text-muted')}>{n.body}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                  <span className="inline-flex items-center gap-1 text-xs text-muted"><Icon icon={ch.icon} />{ch.label}</span>
                  {n.status === 'queued' ? <Stamp tone="neutral" condition="pending" size="sm">Queued</Stamp> : null}
                  {n.status === 'failed' ? <Stamp tone="danger" size="sm" detail="email not delivered">Failed</Stamp> : null}
                  {n.deepLink ? <a href={n.deepLink} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Open<Icon icon={ExternalLink} /></a> : null}
                  {fresh && onMarkRead ? <button type="button" onClick={() => onMarkRead(n.id)} className="font-semibold text-primary hover:underline">Mark read</button> : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <section className={cn('flex flex-col', !panel && 'overflow-hidden rounded-md border border-border bg-surface')} aria-label="Notifications">
      <div className={cn('flex flex-wrap items-center justify-between gap-2 border-b border-border', panel ? 'px-3 py-2' : 'px-4 py-3')}>
        <span className="flex items-center gap-2 font-semibold">Notifications{unread ? <span className="text-sm font-normal text-muted tabular">{unread} unread</span> : null}</span>
        <div className="flex items-center gap-2">
          {!panel && state === 'ready' ? <Segmented label="Show" size="sm" value={filter} onValueChange={setFilter} items={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }]} /> : null}
          {unread && onMarkAllRead && state === 'ready' ? <Button size="sm" variant="ghost" leadingIcon={CheckCheck} onClick={onMarkAllRead}>Mark all read</Button> : null}
        </div>
      </div>
      {body}
    </section>
  )
}

/** Header bell: the unread count is in the accessible name, not only in the badge. */
export function NotificationBell({ notifications, now, onMarkRead, onMarkAllRead, allHref }: {
  notifications: readonly AppNotification[]; now?: string; onMarkRead?: (id: string) => void; onMarkAllRead?: () => void; allHref?: string
}) {
  const unread = notifications.filter(isUnread).length
  return (
    <Popover
      label="Notifications"
      align="end"
      className="w-[min(24rem,calc(100vw-2rem))] p-0"
      trigger={
        <IconButton icon={Bell} variant="secondary" label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className="relative" badge={unread ? (
          <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-xs border-[length:var(--border-stamp)] border-signal-border bg-signal px-1 text-xs font-bold text-signal-foreground tabular">{unread > 9 ? '9+' : unread}</span>
        ) : undefined} />
      }
    >
      <NotificationsBlock notifications={notifications.slice(0, 6)} layout="panel" now={now} onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead} />
      {allHref ? <a href={allHref} className="block border-t border-border px-3 py-2.5 text-center text-sm font-semibold text-primary hover:underline">See all notifications</a> : null}
    </Popover>
  )
}

export type NotificationEvent = 'order' | 'approval' | 'quote' | 'payment' | 'delivery'
export type NotificationPreference = { event: NotificationEvent; channel: NotificationChannel; enabled: boolean }

const eventLabel: Record<NotificationEvent, { label: string; detail: string }> = {
  order: { label: 'Orders', detail: 'Submitted, confirmed, cancelled' },
  approval: { label: 'Approvals', detail: 'Waiting for you, approved, rejected' },
  quote: { label: 'Quotes', detail: 'Requested, responded, expiring' },
  payment: { label: 'Payments', detail: 'Prompt sent, confirmed, failed' },
  delivery: { label: 'Deliveries', detail: 'Handed over, delayed, delivered' },
}

/**
 * Which events reach which channel (one switch per event and channel, saved per change) and the language
 * they are written in. Languages come from the contract's `locales`, so the backend decides which exist.
 * `savingKey` is `event:channel` for a switch, or `locale` for the language.
 */
export function NotificationPreferencesBlock({ preferences, channels = ['in_app', 'email'], onChange, savingKey, restricted, locale, onLocaleChange }: {
  preferences: readonly NotificationPreference[]; channels?: readonly NotificationChannel[]
  onChange?: (p: NotificationPreference) => void; savingKey?: string; restricted?: string
  locale?: string; onLocaleChange?: (locale: string) => void
}) {
  const events = [...new Set(preferences.map(p => p.event))]
  const find = (event: NotificationEvent, channel: NotificationChannel) => preferences.find(p => p.event === event && p.channel === channel)
  // "On" means at least one channel delivers the event; the facet follows each switch as it changes.
  const access: Accessors<NotificationEvent> = {
    text: e => [eventLabel[e].label, eventLabel[e].detail],
    value: (e, key) => (key === 'state' ? (preferences.some(p => p.event === e && p.enabled) ? 'on' : 'off') : key === 'channels' ? preferences.filter(p => p.event === e && p.enabled).map(p => p.channel) : undefined),
  }
  const t = useTableQuery(events, access, { pageSize: 10 })
  const stateCounts = t.counts('state')
  const channelCounts = t.counts('channels')
  return (
    <section className="flex flex-col gap-2" aria-label="Notification preferences">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border border-border bg-surface p-4">
        <FormField label="Language" help="Emails and in-app messages are written in this language. Amounts stay in KES." className="w-full max-w-xs">
          <Select
            options={locales.supported.map(l => ({ value: l.value, label: l.label }))}
            value={locale ?? locales.default}
            onValueChange={onLocaleChange}
            disabled={Boolean(restricted) || savingKey === 'locale'}
          />
        </FormField>
        {savingKey === 'locale' ? <span role="status" className="text-sm text-muted">Saving</span> : null}
      </div>
      <TableToolbar active={t.active} onClear={t.clear}
        search={<TableSearch label="Search events" placeholder="Orders, payments…" value={t.query.q} onChange={t.setSearch} />}
        facets={<>
          <FacetChips label="Delivery" options={[{ value: 'on', label: 'On', count: stateCounts.on ?? 0 }, { value: 'off', label: 'Off everywhere', count: stateCounts.off ?? 0 }]}
            value={asStringList(t.query.filters.state?.value)} onChange={next => t.setFilter('state', next.length ? { op: 'in', value: next } : undefined)} />
          <FacetChips label="On by" options={channels.map(c => ({ value: c, label: channelLook[c].label, count: channelCounts[c] ?? 0 }))}
            value={asStringList(t.query.filters.channels?.value)} onChange={next => t.setFilter('channels', next.length ? { op: 'in', value: next } : undefined)} />
        </>} />
      <div className="rounded-md border border-border bg-surface">
      {t.result.total === 0 ? (
        <EmptyState kind="no-results" title="No events match" description="Try another word or remove a filter." action={<Button variant="secondary" onClick={t.clear}>Clear search and filters</Button>} />
      ) : (
      <ScrollArea label="Notification preferences">
        <Table caption="Notification preferences by event and channel">
          <THead><tr><Th>Event</Th>{channels.map(c => <Th key={c}><span className="inline-flex items-center gap-1.5"><Icon icon={channelLook[c].icon} />{channelLook[c].label}</span></Th>)}</tr></THead>
          <TBody>
            {t.result.rows.map(e => (
              <Tr key={e}>
                <Td><span className="flex flex-col"><span className="font-medium">{eventLabel[e].label}</span><span className="text-sm text-muted">{eventLabel[e].detail}</span></span></Td>
                {channels.map(c => {
                  const p = find(e, c)
                  const key = `${e}:${c}`
                  return (
                    <Td key={c}>
                      {p ? (
                        <Switch
                          label={<span className="sr-only">{eventLabel[e].label} by {channelLook[c].label}</span>}
                          checked={p.enabled}
                          disabled={Boolean(restricted) || savingKey === key}
                          onCheckedChange={enabled => onChange?.({ ...p, enabled })}
                          stateLabels={savingKey === key ? ['Saving', 'Saving'] : ['On', 'Off']}
                          className="justify-start"
                        />
                      ) : <span className="text-sm text-muted">Not offered</span>}
                    </Td>
                  )
                })}
              </Tr>
            ))}
          </TBody>
        </Table>
      </ScrollArea>
      )}
      <TablePager result={t.result} onPage={t.setPage} onPageSize={t.setPageSize} noun={{ one: 'event', other: 'events' }} unfiltered={events.length} className="border-t border-border" />
      </div>
      {restricted ? <p className="text-sm text-muted">{restricted}</p> : <p className="text-sm text-muted">Repeated deliveries of the same event are sent once.</p>}
    </section>
  )
}
