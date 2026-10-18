'use client'

// SM-F-02 seller onboarding, seller side: the public profile (rich-text description), the registration
// and tax documents, and sending the application for review. Progress, locks and what is missing all
// come from the API's seller-profile record; the page only arranges them.

import { CircleAlert, FileUp } from 'lucide-react'
import { useState } from 'react'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { StatusBadge } from '@/components/kernel/feedback/StatusBadge'
import { asFile, choiceLabel } from '@/components/kernel/fields/types'
import { ProjectedForm } from '@/components/kernel/forms/ProjectedForm'
import { PageSection } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Thread, type ThreadStep } from '@/components/ui/thread'
import { ApiError, api } from '@/lib/client/api'
import type { SellerActivation, SellerProfileRecord } from '@/lib/client/records'
import { useCommand, useRecord, useSave } from '@/lib/client/resources'
import { activeMembership, may, useSession } from '@/lib/client/session'
import { SellerDocumentMeta, SellerProfileMeta } from '@/lib/contract/generated'
import type { AppError, FieldMeta } from '@/lib/contract/types'
import { formatDateTime } from '@/lib/format'

type Activation = SellerActivation

const PROFILE_FIELDS = ['public_name', 'description', 'support_email', 'support_phone'] as const
const EDITABLE: readonly Activation[] = ['draft', 'rejected', 'active']
const docType = SellerDocumentMeta.fields.find(f => f.name === 'document_type') as FieldMeta
const activation = SellerProfileMeta.fields.find(f => f.name === 'activation_status') as FieldMeta

function progress(p: SellerProfileRecord): ThreadStep[] {
  const s = p.activation_status
  const profileDone = Boolean(p.public_name && p.description.text.trim())
  const docsDone = p.missing_documents.length === 0
  return [
    { key: 'profile', label: 'Business profile', detail: profileDone ? 'Ready' : 'Describe the business', state: profileDone ? 'done' : 'current' },
    { key: 'documents', label: 'Documents', detail: docsDone ? `${p.documents.length} uploaded` : `${p.missing_documents.length} missing`, state: docsDone ? 'done' : profileDone ? 'current' : 'upcoming' },
    { key: 'review', label: 'Marketplace review', detail: s === 'under_review' ? 'In progress' : s === 'rejected' ? 'Changes needed' : undefined,
      state: s === 'under_review' ? 'current' : s === 'rejected' ? 'failed' : s === 'active' || s === 'suspended' ? 'done' : 'upcoming' },
    { key: 'trading', label: 'Trading', detail: s === 'active' ? 'Products visible to buyers' : s === 'suspended' ? 'Suspended' : undefined,
      state: s === 'active' ? 'done' : s === 'suspended' ? 'failed' : 'upcoming' },
  ]
}

function Notice({ p }: { p: SellerProfileRecord }) {
  const s = p.activation_status
  const copy: Record<Activation, { title: string; body: string; tone: 'info' | 'danger' | 'success' | 'warning' | 'neutral' }> = {
    draft: { tone: 'neutral', title: 'Finish your application', body: 'Describe the business, upload your registration certificate and KRA PIN certificate, then send it for review. Buyers cannot see your products until the marketplace approves you.' },
    under_review: { tone: 'info', title: 'The marketplace is reviewing your application', body: `Sent ${p.submitted_at ? formatDateTime(p.submitted_at) : 'recently'}. Editing is locked until a decision; you will get a notification either way.` },
    rejected: { tone: 'danger', title: 'Changes are needed before approval', body: p.rejection_reason || 'Make the changes below and send it again.' },
    active: { tone: 'success', title: 'You are approved to sell', body: 'Your published products are visible to buyers. Profile changes appear on your product pages at once.' },
    suspended: { tone: 'warning', title: 'Selling is suspended', body: p.rejection_reason || 'Your products are hidden while the marketplace reviews your account. Write to support to resolve it.' },
  }
  const c = copy[s]
  const border = { neutral: 'border-border-strong', info: 'border-tone-info', danger: 'border-tone-danger', success: 'border-tone-success', warning: 'border-tone-warning' }[c.tone]
  return (
    <div role={s === 'rejected' || s === 'suspended' ? 'alert' : 'status'} className={`flex flex-col gap-1 border-l-[length:var(--border-stamp)] bg-surface py-3 pr-4 pl-4 ${border}`}>
      <p className="font-display text-lg font-bold">{c.title}</p>
      <p className="max-w-[70ch] text-md text-pretty">{s === 'rejected' && p.rejection_reason ? <><span className="font-semibold">Reason given: </span>{c.body}</> : c.body}</p>
    </div>
  )
}

function Documents({ p, locked }: { p: SellerProfileRecord; locked: boolean }) {
  const save = useSave(SellerDocumentMeta, [SellerProfileMeta])
  const command = useCommand(SellerDocumentMeta, [SellerProfileMeta])
  const [problem, setProblem] = useState<AppError | null>(null)
  const run = async (...args: Parameters<typeof command.run>) => {
    setProblem(null)
    try { await command.run(...args) } catch (err) { setProblem(err as AppError) }
  }
  const upload = async (values: Record<string, unknown>) => {
    const chosen = asFile(values.file_asset)?.file
    if (!chosen) return { ok: false as const, error: { code: 'VALIDATION', detail: 'Choose the file to upload.', fields: { file_asset: ['Choose the file to upload.'] }, retryable: false } }
    try {
      const form = new FormData()
      form.set('file', chosen)
      form.set('kind', 'document')
      const asset = await api<{ id: string }>('files', { method: 'POST', body: form })
      await save.mutateAsync({ body: { document_type: values.document_type, file_asset: asset.id, expires_at: values.expires_at || null } })
      return { ok: true as const, message: 'Document uploaded' }
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
      // The upload answers about `file`; the form's field is `file_asset`.
      const { file, ...rest } = err.error.fields ?? {}
      return { ok: false as const, error: { ...err.error, fields: file ? { ...rest, file_asset: file } : rest } }
    }
  }
  const missing = p.missing_documents.map(k => choiceLabel(docType, k))
  return (
    <PageSection title="Documents" description="Private to your organization and the marketplace reviewers. PDF, JPEG or PNG up to 10 MB."
      actions={locked ? null : (
        <ProjectedForm meta={SellerDocumentMeta} fields={['document_type', 'file_asset', 'expires_at']} mode="create" recipe="sheet" submitLabel="Upload document"
          title="Upload a document" description="Use a clear scan or photo of the whole page."
          trigger={<Button variant="primary" leadingIcon={FileUp}>Upload a document</Button>} onSubmit={upload} />
      )}>
      {missing.length ? <p className="flex items-start gap-2 text-md"><Icon icon={CircleAlert} className="mt-0.5 text-tone-warning" />Still needed: {missing.join(' and ')}.</p> : null}
      {problem ? <p role="alert" className="text-sm font-medium text-tone-danger">{problem.detail}</p> : null}
      <ListBlock meta={SellerDocumentMeta} records={p.documents} query="none" onRun={run}
        empty={{ kind: 'no-data', title: 'No documents yet', description: 'Upload the registration certificate and the KRA PIN certificate to apply.' }} />
    </PageSection>
  )
}

function Submit({ p }: { p: SellerProfileRecord }) {
  const command = useCommand(SellerProfileMeta)
  const [problem, setProblem] = useState<AppError | null>(null)
  const run = async (...args: Parameters<typeof command.run>) => {
    setProblem(null)
    try { await command.run(...args) } catch (err) { setProblem(err as AppError) }
  }
  if (!(p._can ?? []).includes('submit')) return null
  return (
    <PageSection title="Send for review" description="A marketplace reviewer checks the profile and documents. You can edit until you send it; after that it is locked until the decision.">
      <ActionBar meta={SellerProfileMeta} record={p} onRun={run} pending={command.pending} size="lg" />
      {problem ? (
        <div role="alert" className="flex flex-col gap-1 border border-tone-danger bg-tone-danger-bg/50 px-4 py-3 text-md">
          <span className="font-semibold">{problem.detail}</span>
          <ul className="list-disc pl-5">{Object.values(problem.fields ?? {}).flat().map(m => <li key={m}>{m}</li>)}</ul>
        </div>
      ) : null}
    </PageSection>
  )
}

export function SellerApplication() {
  const { data: session } = useSession()
  const org = activeMembership(session)?.organization
  const isSeller = org?.organization_type === 'seller'
  // A seller profile shares its organization's id (one profile per seller organization).
  const record = useRecord<SellerProfileRecord>(SellerProfileMeta, isSeller ? org.id : undefined)
  const save = useSave<SellerProfileRecord>(SellerProfileMeta)

  if (!isSeller) return <HeaderBlock level={1} source="explicit" title="Selling" description="Selling is for seller organizations. Switch to one from your profile, or register a business to sell." />
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading your seller application" />
  if (record.isError || !record.data) return <ErrorState kind="retryable" title="Your seller application did not load" onRetry={() => void record.refetch()} />

  const p = record.data
  const locked = !EDITABLE.includes(p.activation_status)
  const canEdit = may(session, 'seller_profile.update') && (p._can ?? []).includes('update')
  const restricted = locked || !canEdit
    ? Object.fromEntries(PROFILE_FIELDS.map(f => [f, locked ? 'Locked while the marketplace reviews your application.' : 'Only seller managers can change the profile.']))
    : {}
  const steps = progress(p)
  return (
    <>
      <HeaderBlock level={1} source="explicit" title={p.activation_status === 'active' ? 'Your seller profile' : 'Seller application'}
        status={<StatusBadge field={activation} value={p.activation_status} />}
        description={`${p.organization.label}. What buyers read on your product pages, and the documents the marketplace checks.`} />
      <Thread steps={steps} label="Application progress" />
      <Notice p={p} />
      <PageSection title="Business profile" description="Shown on your product pages. Say what you supply, where you deliver and how buyers reach you.">
        <ProjectedForm key={`${p.id}-${p.activation_status}`} meta={SellerProfileMeta} fields={PROFILE_FIELDS} mode="edit" restricted={restricted}
          initial={p} submitLabel="Save profile"
          onSubmit={async values => {
            try { await save.mutateAsync({ ref: p.id, body: values }); return { ok: true } }
            catch (err) { if (err instanceof ApiError) return { ok: false, error: err.error }; throw err }
          }} />
      </PageSection>
      <Documents p={p} locked={locked || !may(session, 'seller_document.create')} />
      <Submit p={p} />
      {p.history.length ? (
        <PageSection title="History" description="Every status change, with who made it.">
          <Thread orientation="vertical" label="Application history" steps={p.history.map((h, i) => ({
            key: h.id, label: choiceLabel(activation, h.to_status),
            detail: `${formatDateTime(h.at)}${h.actor ? ` · ${h.actor}` : ''}${h.reason ? ` · ${h.reason}` : ''}`,
            state: h.to_status === 'rejected' || h.to_status === 'suspended' ? 'failed' : i === 0 && h.to_status === 'under_review' ? 'current' : 'done',
          }))} />
        </PageSection>
      ) : null}
    </>
  )
}
