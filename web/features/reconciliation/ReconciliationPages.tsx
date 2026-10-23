'use client'

// SM-F-24 for marketplace administrators: the reconciliation checks (records that must agree, and the few
// that do not), the trace of one journey across every area it touched, and the audit trail itself. The trace
// query lives in the URL (`?q=`), so a trace can be shared with a colleague.

import type { Route } from 'next'
import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ReconciliationChecksBlock, ReconciliationTraceBlock } from '@/components/commerce/admin'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { PageSection } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/client/api'
import type { ReconciliationCheck, TraceRecord } from '@/lib/client/records'
import { useSource } from '@/lib/client/resources'
import { AuditEventMeta } from '@/lib/contract/generated'

type Checks = { checks: ReconciliationCheck[]; attention: number }

function Trace({ q }: { q: string }) {
  const trace = useQuery({ queryKey: ['reconciliation', 'trace', q], queryFn: ({ signal }) => api<TraceRecord>(`reconciliation/trace?q=${encodeURIComponent(q)}`, { signal }) })
  if (trace.isPending) return <LoadingState variant="skeleton" shape="list" label="Tracing" />
  if (trace.isError) return <ErrorState {...errorFrom(trace.error)} size="inline" title="The trace did not load" onRetry={() => void trace.refetch()} />
  const t = trace.data
  if (!t.correlation_id || !t.events.length) {
    return <EmptyState kind="no-results" title={`Nothing recorded for ${q}`} description="Try the order number (SM-ORD-…), a payment reference, a hold reference (RSV-…) or a correlation id from the audit trail." />
  }
  return <ReconciliationTraceBlock correlationId={t.correlation_id} query={t.query} events={t.events} />
}

export function ReconciliationPage() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const checks = useQuery({ queryKey: ['reconciliation', 'checks'], queryFn: ({ signal }) => api<Checks>('reconciliation/checks', { signal }) })
  const trace = (value: string) => {
    setDraft(value)
    router.replace((value ? `${pathname}?q=${encodeURIComponent(value)}` : pathname) as Route, { scroll: false })
  }
  return (
    <>
      <HeaderBlock level={1} source="explicit" title="Reconciliation"
        description="Whether payments, orders, stock and integrations agree, and the full story of any one order: every hold, payment, pick, delivery and refund under its correlation id." />
      <PageSection title="Checks" actions={<Button variant="secondary" loading={checks.isFetching} loadingLabel="Checking…" onClick={() => void checks.refetch()}>Check again</Button>}>
        {checks.isPending ? <LoadingState variant="skeleton" shape="cards" label="Running the checks" />
          : checks.isError ? <ErrorState kind="retryable" size="inline" title="The checks did not run" onRetry={() => void checks.refetch()} />
          : <ReconciliationChecksBlock checks={checks.data.checks} checkedAt={new Date(checks.dataUpdatedAt).toISOString()} onTrace={trace} />}
      </PageSection>
      <PageSection title="Trace" description="An order number, payment reference, hold reference or correlation id.">
        <form className="flex max-w-xl gap-2" role="search" onSubmit={e => { e.preventDefault(); trace(draft.trim()) }}>
          <label htmlFor="trace-q" className="sr-only">Order, payment, hold or correlation</label>
          <Input id="trace-q" value={draft} onChange={e => setDraft(e.target.value)} prefix={<Icon icon={Search} />} placeholder="SM-ORD-004215" autoComplete="off" inputClassName="font-mono" />
          <Button type="submit" variant="primary" disabled={!draft.trim()}>Trace</Button>
        </form>
        {q ? <div className="mt-5"><Trace q={q} /></div> : null}
      </PageSection>
    </>
  )
}

export function AuditPage() {
  const source = useSource(AuditEventMeta)
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={AuditEventMeta} title="Audit trail"
        description="Every consequential change, newest first: who made it, under which request, and the journey it belongs to. Rows are never edited. Open one to trace its journey." />
      <ListBlock meta={AuditEventMeta} records={[]} query="server" source={source} narrow="priority"
        href={r => `/admin/reconciliation?q=${encodeURIComponent(String(r.correlation_id ?? ''))}`}
        empty={{ kind: 'no-data', title: 'Nothing recorded yet', description: 'Events appear here as people and integrations change stock, orders, payments and returns.' }} />
    </>
  )
}
