'use client'

// SM-F-01 and SM-F-02, marketplace administrators: seller applications and their review, and buyer and
// seller organization approval. Lists are server-paged projections; the review wires the seller review
// block to the contract's seller-profile and seller-document commands.

import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { DetailBlock } from '@/components/kernel/blocks/DataBlocks'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { asFile, choiceLabel } from '@/components/kernel/fields/types'
import { SellerOnboardingReviewBlock, type SellerDecision, type SellerDocument, type SellerStatus } from '@/components/commerce/catalog'
import { PageSection } from '@/components/layout/section'
import type { SellerProfileRecord } from '@/lib/client/records'
import { useCommand, useRecord, useSource } from '@/lib/client/resources'
import { OrganizationMeta, SellerDocumentMeta, SellerProfileMeta } from '@/lib/contract/generated'
import type { ActionMeta, FieldMeta } from '@/lib/contract/types'

const docType = SellerDocumentMeta.fields.find(f => f.name === 'document_type') as FieldMeta
const reasonField = { ...(SellerProfileMeta.fields.find(f => f.name === 'rejection_reason') as FieldMeta), readOnly: false, required: true, label: 'Reason for the seller' }
const ACTION_FOR: Record<SellerDecision, string> = { approve: 'activate', reinstate: 'activate', reject: 'reject', suspend: 'suspend' }
const PROFILE_DETAIL = ['public_name', 'description', 'support_email', 'support_phone', 'submitted_at', 'reviewed_by', 'reviewed_at']

export function AdminSellers() {
  const source = useSource(SellerProfileMeta)
  return (
    <>
      <HeaderBlock level={1} source="meta" meta={SellerProfileMeta} title="Sellers" description="Applications waiting for review come first. Open one to check its documents and decide." />
      <ListBlock meta={SellerProfileMeta} records={[]} query="server" source={source} href={r => `/admin/sellers/${r.id}`}
        empty={{ kind: 'no-data', title: 'No seller applications yet', description: 'Sellers appear here when they register.' }} />
    </>
  )
}

export function AdminSellerReview({ id }: { id: string }) {
  const record = useRecord<SellerProfileRecord>(SellerProfileMeta, id)
  const profileCommand = useCommand(SellerProfileMeta, [SellerDocumentMeta, OrganizationMeta])
  const docCommand = useCommand(SellerDocumentMeta, [SellerProfileMeta])
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the application" />
  if (record.isError || !record.data) return <ErrorState {...errorFrom(record.error)} title="The application did not load" onRetry={() => void record.refetch()} />
  const p = record.data
  const documents: SellerDocument[] = p.documents.map(d => ({
    id: d.id,
    type: choiceLabel(docType, d.document_type) ?? String(d.document_type),
    file: asFile(d.file_asset) ?? { name: 'Missing file', size: 0, type: '', state: 'error' },
    status: d.verification_status as SellerDocument['status'],
    expiresAt: (d.expires_at as string | null) ?? undefined,
    notes: (d.review_notes as string) || undefined,
    actions: <ActionBar meta={SellerDocumentMeta} record={d} onRun={docCommand.run} pending={docCommand.pending} density="compact" inline={2} />,
  }))
  const decide = async (decision: SellerDecision, reason: string) => {
    const action: ActionMeta = SellerProfileMeta.actions.find(a => a.name === ACTION_FOR[decision])!
    await profileCommand.run(action, p, action.input?.length ? { rejection_reason: reason } : {})
  }
  return (
    <>
      <HeaderBlock level={1} source="explicit" title={p.public_name || p.organization.label}
        breadcrumbs={[{ label: 'Sellers', href: '/admin/sellers' }, { label: p.public_name || p.organization.label }]}
        description="Check each document, then approve, reject with a reason, or suspend. The seller is notified of every decision." />
      <SellerOnboardingReviewBlock seller={p.public_name || p.organization.label} location={p.organization.location || 'No address yet'}
        status={p.activation_status as SellerStatus} documents={documents}
        history={[...p.history].reverse().map(h => ({ status: h.to_status as SellerStatus, at: h.at, by: h.actor ?? 'System', reason: h.reason || undefined }))}
        blockers={p.activation_blockers} reason={p.rejection_reason || undefined} reasonField={reasonField} onDecide={decide} />
      <PageSection title="Profile" description="What buyers will read on this seller's product pages.">
        <DetailBlock meta={{ ...SellerProfileMeta, fields: SellerProfileMeta.fields.filter(f => PROFILE_DETAIL.includes(f.name)) }} record={p} surface="flat" />
      </PageSection>
    </>
  )
}

// Sellers are approved through their seller review, so this page lists buyer organizations only.
const BUYERS = { organization_type__in: 'buyer' }

export function AdminOrganizations() {
  const source = useSource(OrganizationMeta, BUYERS)
  const command = useCommand(OrganizationMeta)
  return (
    <>
      <HeaderBlock level={1} source="explicit" title="Buyer approvals" description="Approve buyer organizations before they can order, or suspend one that breaks the terms. Sellers are approved through seller reviews." />
      <ListBlock meta={OrganizationMeta} records={[]} query="server" source={source} onRun={command.run}
        empty={{ kind: 'no-data', title: 'No buyer organizations yet', description: 'Buyers appear here when they register.' }} />
    </>
  )
}

