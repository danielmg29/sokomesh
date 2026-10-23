'use client'

// The signed-in home (templates L-07 buyer, L-08 seller, L-20 generic): what needs this person now, as a page
// definition for PageBlocks rather than bespoke layout. The figures are list totals the API counts under the
// viewer's own scope, the lists the first few of each; which ones appear follows the role's permissions (the
// API refuses the rest regardless). Every figure links to the list it counts.

import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { PageBlocks, type BlockSpec } from '@/components/kernel/blocks/PageBlocks'
import type { Metric } from '@/components/kernel/blocks/DataBlocks'
import type { BalanceRecord } from '@/lib/client/records'
import { useList } from '@/lib/client/resources'
import { activeMembership, may, useSession, type Session } from '@/lib/client/session'
import {
  CategoryContractMeta, FulfillmentTaskMeta, InventoryBalanceMeta, OrderMeta, OrganizationMeta, QuoteMeta, ReturnCaseMeta, SellerProfileMeta,
} from '@/lib/contract/generated'
import type { ListPage, ModelMeta, Rec } from '@/lib/contract/types'

const FEW = 5
type Query = { data?: ListPage<Rec> }

/** One to-do: its count, the first few records and where the whole list lives. */
function useTodo(meta: ModelMeta, filter: string, enabled: boolean) {
  const page = useList<Rec>(meta, `${filter}&page_size=${FEW}`, enabled) as Query
  return { total: page.data?.total, rows: page.data?.results ?? [], ready: !enabled || Boolean(page.data) }
}

const figure = (key: string, label: string, total: number | undefined, note: string, urgent = true): Metric => ({
  key, label, value: total === undefined ? '…' : total.toLocaleString('en-KE'), tone: urgent && total ? 'warning' : undefined, note,
})

const related = (title: string, meta: ModelMeta, todo: ReturnType<typeof useTodo>, all: string, href: (r: Rec) => string, empty: string): BlockSpec => ({
  block: 'related', props: { title, meta, records: todo.rows, total: todo.total, loading: !todo.ready, viewAllHref: all, href, empty },
})

function greeting(session: Session) {
  const hour = Number(new Intl.DateTimeFormat('en-KE', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Africa/Nairobi' }).format(new Date()))
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const first = (session.user?.display_name ?? '').split(' ')[0]
  return first ? `${part}, ${first}` : part
}

function BuyerHome({ session }: { session: Session }) {
  const orders = may(session, 'order.list')
  const approve = useTodo(OrderMeta, 'status__in=pending_approval', orders)
  const pay = useTodo(OrderMeta, 'status__in=awaiting_payment', orders)
  const moving = useTodo(OrderMeta, 'status__in=submitted,confirmed,picking,partially_fulfilled,shipped', orders)
  const quotes = useTodo(QuoteMeta, 'status__in=responded', may(session, 'quote.list'))
  const cases = useTodo(ReturnCaseMeta, 'status__in=open,evidence_requested,reviewing', may(session, 'return_case.list'))
  const deciding = may(session, 'order.approve')
  const page: BlockSpec[] = [
    { block: 'stats', props: { caption: 'What needs you', metrics: [
      figure('approve', 'Awaiting approval', approve.total, deciding ? 'Orders over your approval limit; you decide.' : 'Waiting for an approver in your organization.', deciding),
      figure('pay', 'Waiting for payment', pay.total, 'Pay each by M-Pesa while its stock is held.'),
      figure('quotes', 'Quotes answered', quotes.total, 'Sellers replied; accept or decline.'),
      figure('cases', 'Open cases', cases.total, 'Returns and disputes still being decided.', false),
    ] } },
    { block: 'grid', columns: 2, children: [
      [related(deciding ? 'For your approval' : 'Awaiting approval', OrderMeta, approve, '/orders?status__in=pending_approval', r => `/orders/${r.id}`, 'Nothing waits for approval.')],
      [related('Waiting for payment', OrderMeta, pay, '/orders?status__in=awaiting_payment', r => `/orders/${r.id}`, 'Every order is paid.')],
    ] },
    { block: 'grid', columns: 2, children: [
      [related('On their way', OrderMeta, moving, '/orders', r => `/orders/${r.id}`, 'No orders in progress.')],
      [related('Quotes answered', QuoteMeta, quotes, '/quotes?status__in=responded', r => `/quotes/${r.id}`, 'No quotes waiting for your answer.')],
    ] },
  ]
  return <PageBlocks page={page} />
}

function SellerHome({ session }: { session: Session }) {
  const confirm = useTodo(OrderMeta, 'status__in=submitted', may(session, 'order.list'))
  const pick = useTodo(FulfillmentTaskMeta, 'status__in=queued,picking,packed', may(session, 'fulfillment_task.list'))
  const cases = useTodo(ReturnCaseMeta, 'status__in=open,reviewing', may(session, 'return_case.list'))
  const quotes = useTodo(QuoteMeta, 'status__in=requested', may(session, 'quote.list'))
  // Stock state is the API's (`stock_state`); the balances list has no filter for it, so one bounded page is read.
  const tracked = may(session, 'inventory.list')
  const stock = useList<BalanceRecord>(InventoryBalanceMeta, `page_size=${InventoryBalanceMeta.list.maxPageSize}`, tracked)
  const low = (stock.data?.results ?? []).filter(b => b.stock_state !== 'ok')
  const lowTodo = { total: stock.data ? low.length : undefined, rows: low.slice(0, FEW), ready: !tracked || Boolean(stock.data) }
  const page: BlockSpec[] = [
    { block: 'stats', props: { caption: 'What needs you', metrics: [
      figure('confirm', 'Orders to confirm', confirm.total, 'Paid orders waiting for you to accept them.'),
      figure('pick', 'Pick lists open', pick.total, 'Queued, being picked or packed.'),
      figure('stock', 'Packs running low', lowTodo.total, 'Below three orders of stock, or below one.'),
      figure('cases', 'Cases to decide', cases.total, 'Claims from buyers on delivered orders.'),
    ] } },
    { block: 'grid', columns: 2, children: [
      [related('Orders to confirm', OrderMeta, confirm, '/sell/orders?status__in=submitted', r => `/sell/orders/${r.id}`, 'Every paid order is confirmed.')],
      [related('Pick lists', FulfillmentTaskMeta, pick, '/sell/fulfilment', r => `/sell/fulfilment/${r.id}`, 'Nothing to pick.')],
    ] },
    { block: 'grid', columns: 2, children: [
      [related('Running low', InventoryBalanceMeta, lowTodo, '/sell/inventory', r => `/sell/inventory?variant=${(r as BalanceRecord).variant.id}#ledger`, 'Every tracked pack has stock for several orders.')],
      [related('Quote requests', QuoteMeta, quotes, '/sell/quotes?status__in=requested', r => `/sell/quotes/${r.id}`, 'No buyer is waiting for a quote.')],
    ] },
  ]
  return <PageBlocks page={page} />
}

function AdminHome() {
  const sellers = useTodo(SellerProfileMeta, 'activation_status__in=under_review', true)
  const buyers = useTodo(OrganizationMeta, 'approval_state__in=pending&organization_type__in=buyer', true)
  const drafts = useTodo(CategoryContractMeta, 'status__in=draft', true)
  const page: BlockSpec[] = [
    { block: 'stats', props: { caption: 'What needs you', metrics: [
      figure('sellers', 'Sellers to review', sellers.total, 'Applications with their documents.'),
      figure('buyers', 'Buyers to approve', buyers.total, 'Organizations waiting to start buying.'),
      figure('drafts', 'Contracts in draft', drafts.total, 'Category contracts not yet published.', false),
    ] } },
    { block: 'grid', columns: 2, children: [
      [related('Seller reviews', SellerProfileMeta, sellers, '/admin/sellers', r => `/admin/sellers/${r.id}`, 'No seller is waiting for review.')],
      [related('Buyer approvals', OrganizationMeta, buyers, '/admin/organizations', () => '/admin/organizations', 'No buyer is waiting for approval.')],
    ] },
  ]
  return <PageBlocks page={page} />
}

export function HomePage() {
  const { data: session } = useSession()
  if (!session?.user) return null
  const active = activeMembership(session)
  const type = active?.organization.organization_type
  return (
    <>
      <HeaderBlock level={1} source="explicit" title={greeting(session)}
        description={active ? `${active.role_label} at ${active.organization.name}. The figures count what is waiting for you or your organization now.` : 'Your account.'} />
      {session.is_admin ? <AdminHome /> : type === 'seller' ? <SellerHome session={session} /> : type === 'buyer' ? <BuyerHome session={session} /> : null}
    </>
  )
}
