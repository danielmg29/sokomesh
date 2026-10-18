'use client'

// SM-F-01 organization management: the organization's details, its team (invitations, roles, suspension,
// removal) and its addresses; for buyers, the purchase-approval policies (SM-F-12). Everything projects
// from the contract's models; which controls appear follows the role table, and the API decides every write.

import type { Route } from 'next'
import { Building2, MapPinPlus, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { DetailBlock } from '@/components/kernel/blocks/DataBlocks'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { StatusBadge } from '@/components/kernel/feedback/StatusBadge'
import { ProjectedForm } from '@/components/kernel/forms/ProjectedForm'
import { PageSection } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/disclosure'
import { Icon } from '@/components/ui/icon'
import { attempt } from '@/lib/client/api'
import { useCommand, useRecord, useSave, useSource } from '@/lib/client/resources'
import { activeMembership, may, useSession, type SessionOrganization } from '@/lib/client/session'
import { AddressMeta, ApprovalPolicyMeta, MembershipMeta, OrganizationMeta } from '@/lib/contract/generated'
import type { FieldMeta, ModelMeta, Rec } from '@/lib/contract/types'
import { KENYA_TOWNS } from '@/lib/kenya'

const TABS = ['details', 'team', 'addresses', 'approvals'] as const
type Tab = (typeof TABS)[number]

const DETAIL_FIELDS = ['name', 'legal_name', 'tax_identifier', 'default_currency', 'timezone'] as const
const townOptions = KENYA_TOWNS.map(t => ({ value: t.name, label: t.name, description: `${t.lat},${t.lng}` }))

/** The membership model with its role choices narrowed to the ones this organization can give (from the session). */
function teamMeta(org: SessionOrganization): ModelMeta {
  const fields = MembershipMeta.fields.map((f): FieldMeta => (f.name === 'role_key' && f.choices ? { ...f, choices: f.choices.filter(c => org.assignable_roles.includes(c.value as never)) } : f))
  return { ...MembershipMeta, fields }
}

function Details({ id, canEdit }: { id: string; canEdit: boolean }) {
  const record = useRecord<Rec>(OrganizationMeta, id)
  const save = useSave(OrganizationMeta)
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading organization details" />
  if (record.isError || !record.data) return <ErrorState kind="retryable" title="Organization details did not load" onRetry={() => void record.refetch()} size="inline" />
  const r = record.data
  const editable = canEdit && (r._can ?? []).includes('update')
  return (
    <>
      <PageSection title="Business details" description={editable ? 'The legal name and KRA PIN appear on invoices and tax documents. Only owners can change them.' : 'Only owners can change these. Ask one if something is out of date.'}>
        {editable ? (
          <ProjectedForm key={r.id} meta={OrganizationMeta} fields={DETAIL_FIELDS} mode="edit" initial={r} submitLabel="Save details"
            onSubmit={values => attempt(() => save.mutateAsync({ ref: r.id, body: values }))} />
        ) : (
          <DetailBlock meta={{ ...OrganizationMeta, fields: OrganizationMeta.fields.filter(f => (DETAIL_FIELDS as readonly string[]).includes(f.name)) }} record={r} surface="flat" />
        )}
      </PageSection>
      <PageSection title="Standing" description="Set by the marketplace. Buying and selling open once the organization is approved.">
        <DetailBlock meta={{ ...OrganizationMeta, fields: OrganizationMeta.fields.filter(f => ['organization_type', 'approval_state', 'status', 'created_at'].includes(f.name)) }} record={r} surface="flat" />
      </PageSection>
    </>
  )
}

function Team({ org, canInvite }: { org: SessionOrganization; canInvite: boolean }) {
  const meta = useMemo(() => teamMeta(org), [org])
  const source = useSource(MembershipMeta)
  const command = useCommand(MembershipMeta)
  const save = useSave(MembershipMeta)
  const invite = canInvite ? (
    <ProjectedForm meta={meta} fields={['email', 'role_key']} mode="create" recipe="sheet" submitLabel="Send invitation"
      title="Invite a colleague" description="They get an email with a link to join. Invitations last seven days."
      trigger={<Button variant="primary" leadingIcon={UserPlus}>Invite a colleague</Button>}
      onSubmit={values => attempt(() => save.mutateAsync({ body: values }), 'Invitation sent')} />
  ) : null
  return (
    <PageSection title="Team" description="Everyone who can act for this organization, and what their role lets them do." actions={invite}>
      <ListBlock meta={meta} records={[]} query="server" source={source} onRun={command.run}
        empty={{ kind: 'no-data', title: 'No colleagues yet', description: canInvite ? 'Invite the people who order, approve or run the warehouse.' : 'An owner can invite colleagues.' }} />
    </PageSection>
  )
}

function Addresses({ canManage }: { canManage: boolean }) {
  const source = useSource(AddressMeta)
  const command = useCommand(AddressMeta)
  const save = useSave(AddressMeta)
  const add = canManage ? (
    <ProjectedForm meta={AddressMeta} mode="create" recipe="sheet" submitLabel="Save address" options={{ location_point: townOptions }}
      title="New address" description="Where orders are delivered or collected. The map point helps drivers find you."
      trigger={<Button variant="primary" leadingIcon={MapPinPlus}>Add an address</Button>}
      onSubmit={values => attempt(() => save.mutateAsync({ body: values }), 'Address saved')} />
  ) : null
  return (
    <PageSection title="Addresses" description="Delivery and pickup points. Sellers see the one chosen at checkout." actions={add}>
      <ListBlock meta={AddressMeta} records={[]} query="server" source={source} onRun={command.run}
        empty={{ kind: 'no-data', title: 'No addresses yet', description: canManage ? 'Add the shop or warehouse orders should go to.' : 'An owner can add addresses.' }} />
    </PageSection>
  )
}

function Approvals({ canManage }: { canManage: boolean }) {
  const source = useSource(ApprovalPolicyMeta)
  const command = useCommand(ApprovalPolicyMeta)
  const save = useSave(ApprovalPolicyMeta)
  const add = canManage ? (
    <ProjectedForm meta={ApprovalPolicyMeta} mode="create" recipe="sheet" submitLabel="Save policy" initial={{ minimum_approvals: 1, approver_role_keys: ['buyer_owner'] }}
      title="New approval policy" description="Orders of this total or more wait for approval before they reach the seller. The person who placed an order never approves it."
      trigger={<Button variant="primary" leadingIcon={ShieldCheck}>Add a policy</Button>}
      onSubmit={values => attempt(() => save.mutateAsync({ body: values }), 'Policy saved')} />
  ) : null
  return (
    <PageSection title="Purchase approvals" description="When an order needs a second person. With several policies, the highest threshold an order reaches applies." actions={add}>
      <ListBlock meta={ApprovalPolicyMeta} records={[]} query="server" source={source} onRun={command.run}
        empty={{ kind: 'no-data', title: 'No approval policies', description: canManage ? 'Every order goes straight to the seller. Add a policy to have large orders checked first.' : 'Every order goes straight to the seller. An owner can add a policy.' }} />
    </PageSection>
  )
}

export function OrganizationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tab: Tab = TABS.find(t => t === params.get('tab')) ?? 'details'
  const active = activeMembership(session)
  if (!session || !active) {
    return <HeaderBlock level={1} source="explicit" title="Organization" description="You are not a member of an organization yet. Accept an invitation from a colleague to join theirs." />
  }
  const org = active.organization
  const approvalField = OrganizationMeta.fields.find(f => f.name === 'approval_state')!
  const approvals = org.organization_type === 'buyer' && may(session, 'approval_policy.list')
  return (
    <>
      <HeaderBlock level={1} source="explicit" title={org.name} status={<StatusBadge field={approvalField} value={org.approval_state} />}
        description={`${active.role_label}. Changes here apply to everyone acting for ${org.name}.`} />
      <Tabs value={tab} onValueChange={v => router.replace(`${pathname}?tab=${v}` as Route, { scroll: false })} className="flex flex-col gap-6">
        <TabsList aria-label="Organization">
          <TabsTrigger value="details"><Icon icon={Building2} />Details</TabsTrigger>
          <TabsTrigger value="team"><Icon icon={Users} />Team</TabsTrigger>
          <TabsTrigger value="addresses"><Icon icon={MapPinPlus} />Addresses</TabsTrigger>
          {approvals ? <TabsTrigger value="approvals"><Icon icon={ShieldCheck} />Approvals</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="details" className="flex flex-col gap-8"><Details id={org.id} canEdit={may(session, 'organization.update')} /></TabsContent>
        <TabsContent value="team"><Team org={org} canInvite={may(session, 'membership.invite')} /></TabsContent>
        <TabsContent value="addresses"><Addresses canManage={may(session, 'address.create')} /></TabsContent>
        {approvals ? <TabsContent value="approvals"><Approvals canManage={may(session, 'approval_policy.create')} /></TabsContent> : null}
      </Tabs>
    </>
  )
}
