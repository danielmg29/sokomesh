'use client'

// SM-F-06, sellers: the buyers you trade with and the price groups they are in. A price rule aimed at a
// group (on a product's price book) applies to every buyer in it; the API resolves which price a buyer
// pays and why, so this page only manages who is in which group.

import { useQuery } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { EmptyState } from '@/components/kernel/feedback/EmptyState'
import { RelativeTime } from '@/components/kernel/fields/islands'
import { ProjectedForm } from '@/components/kernel/forms/ProjectedForm'
import { PageSection } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Stamp } from '@/components/ui/stamp'
import { ScrollArea, TBody, THead, Table, Td, Th, Tr } from '@/components/ui/table'
import { api, attempt } from '@/lib/client/api'
import type { TradingPartners } from '@/lib/client/records'
import { useCommand, useSave, useSource } from '@/lib/client/resources'
import { may, useSession } from '@/lib/client/session'
import { BuyerGroupMemberMeta } from '@/lib/contract/generated'

export function BuyersPage() {
  const { data: session } = useSession()
  const partners = useQuery({ queryKey: [BuyerGroupMemberMeta.path, 'partners'], queryFn: ({ signal }) => api<TradingPartners>('catalog/buyers', { signal }) })
  const source = useSource(BuyerGroupMemberMeta)
  const command = useCommand(BuyerGroupMemberMeta)
  const save = useSave(BuyerGroupMemberMeta)
  const header = <HeaderBlock level={1} source="explicit" title="Buyers and prices"
    description="The organizations that buy from you. Put a buyer in a price group, then give the group its own prices on any product's price book." />
  if (partners.isPending) return <>{header}<LoadingState variant="skeleton" shape="list" rows={4} label="Loading your buyers" /></>
  if (partners.isError) return <>{header}<ErrorState kind="retryable" title="Your buyers did not load" onRetry={() => void partners.refetch()} /></>
  const rows = partners.data.results
  const groupLabel = (key: string) => partners.data.groups.find(g => g.value === key)?.label ?? key
  const add = may(session, 'buyer_group.create') && rows.length ? (
    <ProjectedForm meta={BuyerGroupMemberMeta} fields={['buyer', 'group_key']} mode="create" recipe="sheet" submitLabel="Add to group"
      title="Add a buyer to a price group" description="Use a short name such as key_accounts or hotels; group prices on your price books use the same name."
      options={{ buyer: rows.map(r => ({ value: r.id, label: r.name, description: r.city ?? undefined })) }}
      trigger={<Button variant="primary" leadingIcon={UserPlus}>Add to a group</Button>}
      onSubmit={values => attempt(() => save.mutateAsync({ body: values }), 'Added to the group')} />
  ) : null
  return (
    <>
      {header}
      <PageSection title="Trading partners" description="Buyers who have ordered from you, asked you for a quote, or are in one of your groups.">
        {rows.length ? (
          <ScrollArea label="Trading partners" className="border border-border bg-surface">
            <Table caption="Trading partners">
              <THead><tr><Th>Buyer</Th><Th>Town</Th><Th numeric>Orders</Th><Th>Last order</Th><Th>Price groups</Th></tr></THead>
              <TBody>
                {rows.map(r => (
                  <Tr key={r.id}>
                    <Td className="font-medium">{r.name}</Td>
                    <Td>{r.city ?? <span className="text-muted">Not given</span>}</Td>
                    <Td numeric>{r.orders}</Td>
                    <Td>{r.last_order_at ? <RelativeTime iso={r.last_order_at} /> : <span className="text-muted">None yet</span>}</Td>
                    <Td><span className="flex flex-wrap gap-1.5">{r.groups.length ? r.groups.map(g => <Stamp key={g.id} tone="signal" size="sm">{groupLabel(g.group_key)}</Stamp>) : <span className="text-muted">List prices</span>}</span></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </ScrollArea>
        ) : (
          <EmptyState kind="no-data" title="No buyers yet" description="Buyers appear here once they order from you or ask you for a quote." />
        )}
      </PageSection>
      <PageSection title="Price groups" description="Who is in which group. Removing a buyer returns them to your list and quantity prices." actions={add}>
        <ListBlock meta={BuyerGroupMemberMeta} records={[]} query="server" source={source} onRun={command.run}
          empty={{ kind: 'no-data', title: 'No one in a group yet', description: 'Add a buyer to a group to give them their own prices.' }} />
      </PageSection>
    </>
  )
}
