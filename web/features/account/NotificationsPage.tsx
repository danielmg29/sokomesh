'use client'

// SM-F-21 notifications inbox: the in-app notifications the API wrote for this person, newest first,
// with mark-as-read (the contract's `read` command) and mark-all.

import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { NotificationsBlock, type AppNotification } from '@/components/commerce/notifications'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { api } from '@/lib/client/api'
import { pathOf, useList } from '@/lib/client/resources'
import { NotificationMeta } from '@/lib/contract/generated'

type Row = { id: string; title: string; body_text: string; deep_link: string; status: AppNotification['status']; created_at: string; read_at: string | null }

const path = pathOf(NotificationMeta)

export function NotificationsPage() {
  const client = useQueryClient()
  const list = useList<Row>(NotificationMeta, 'page_size=100')
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: [path] }), client.invalidateQueries({ queryKey: ['notifications'] })])
  const notifications: AppNotification[] = (list.data?.results ?? []).map(n => ({
    id: n.id, channel: 'in_app', title: n.title, body: n.body_text, deepLink: n.deep_link || undefined,
    status: n.status, sentAt: n.created_at, readAt: n.read_at ?? undefined,
  }))
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={NotificationMeta} title="Notifications"
        description={<>Approvals, account changes and, as they arrive, order and payment updates. Choose what also reaches your email in <Link href="/account/settings#notifications" className="font-semibold text-primary hover:underline">settings</Link>.</>} />
      <NotificationsBlock
        notifications={notifications}
        state={list.isPending ? 'loading' : list.isError ? 'error' : 'ready'}
        onRetry={() => void list.refetch()}
        onMarkRead={id => void api(`${path}/${id}/read`, { method: 'POST', body: {} }).then(refresh)}
        onMarkAllRead={() => void api(`${path}/read-all`, { method: 'POST', body: {} }).then(refresh)}
      />
    </>
  )
}
