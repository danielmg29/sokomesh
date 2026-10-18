'use client'

// SM-F-01 profile: the person's photo, name and phone (projected from the contract's account model),
// their sign-in address, and the organizations they belong to with a switch between them.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { checkFile } from '@/components/kernel/fields/inputs'
import { choiceLabel, formatBytes } from '@/components/kernel/fields/types'
import { ProjectedForm } from '@/components/kernel/forms/ProjectedForm'
import { PageSection } from '@/components/layout/section'
import { Avatar } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Stamp } from '@/components/ui/stamp'
import { ApiError, api, attempt } from '@/lib/client/api'
import { activeMembership, sessionKey, useSession, useSessionWrite, type Session } from '@/lib/client/session'
import { AccountMeta, OrganizationMeta } from '@/lib/contract/generated'
import type { FieldMeta } from '@/lib/contract/types'
import { formatDate } from '@/lib/format'

const photoField = AccountMeta.fields.find(f => f.name === 'avatar') as FieldMeta
const photoRules = [photoField.help, `${photoField.accept?.map(a => a.split('/')[1]!.toUpperCase()).join(', ')}${photoField.maxBytes ? `, up to ${formatBytes(photoField.maxBytes)}` : ''}.`].filter(Boolean).join(' ')
const typeField = OrganizationMeta.fields.find(f => f.name === 'organization_type') as FieldMeta
const approvalField = OrganizationMeta.fields.find(f => f.name === 'approval_state') as FieldMeta
const APPROVAL_TONE = { approved: 'success', pending: 'info', rejected: 'danger', suspended: 'warning' } as const

function Photo({ session }: { session: Session }) {
  const client = useQueryClient()
  const user = session.user!
  const [problem, setProblem] = useState<string | null>(null)
  const change = useMutation({
    mutationFn: (file: File | null) => {
      if (!file) return api<Session>('account/avatar', { method: 'DELETE' })
      const form = new FormData()
      form.set('file', file)
      return api<Session>('account/avatar', { method: 'POST', body: form })
    },
    onSuccess: s => { setProblem(null); client.setQueryData(sessionKey, s) },
    onError: err => setProblem(err instanceof ApiError ? Object.values(err.fields).flat()[0] ?? err.error.detail : 'The photo could not be saved. Try again.'),
  })
  const pick = (file: File) => {
    const p = checkFile(file, photoField.accept, photoField.maxBytes)
    if (p) setProblem(p)
    else change.mutate(file)
  }
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar size="xl" name={user.display_name || user.email} src={user.avatar?.url} darkSrc={user.avatar?.dark_url} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-(--density-control-height) cursor-pointer items-center gap-2 rounded-sm border border-border-strong bg-surface px-3.5 text-md font-semibold motion-bind transition-colors hover:bg-sunken has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring-contrast has-[input:disabled]:pointer-events-none has-[input:disabled]:opacity-60">
            <Icon icon={Upload} />{user.avatar ? 'Replace photo' : 'Upload photo'}
            <input type="file" className="sr-only" accept={photoField.accept?.join(',')} disabled={change.isPending}
              onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = '' }} />
          </label>
          {user.avatar ? <Button variant="ghost" leadingIcon={Trash2} onClick={() => change.mutate(null)} disabled={change.isPending}>Remove</Button> : null}
        </div>
        <p role="status" className="text-sm text-muted">{change.isPending ? 'Saving photo…' : photoRules}</p>
        {problem ? <p role="alert" className="text-sm font-medium text-tone-danger">{problem}</p> : null}
      </div>
    </div>
  )
}

function Organizations({ session }: { session: Session }) {
  const switchTo = useSessionWrite<{ organization: string }>('session/organization')
  const active = activeMembership(session)
  if (!session.memberships.length) return <p className="text-md text-muted">You are not a member of an organization yet. Accept an invitation from a colleague to join theirs.</p>
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {session.memberships.map(m => {
        const here = m.organization.id === active?.organization.id
        const state = m.organization.approval_state as keyof typeof APPROVAL_TONE
        return (
          <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{m.organization.name}</span>
              <span className="text-sm text-muted">{choiceLabel(typeField, m.organization.organization_type)} · {m.role_label}</span>
            </div>
            <div className="flex items-center gap-3">
              <Stamp size="sm" tone={APPROVAL_TONE[state] ?? 'neutral'}>{choiceLabel(approvalField, state)}</Stamp>
              {here
                ? <Link href="/organization" className="inline-flex items-center gap-1 text-md font-semibold text-primary hover:underline">Manage<Icon icon={ArrowRight} /></Link>
                : <Button size="sm" variant="secondary" loading={switchTo.isPending && switchTo.variables?.organization === m.organization.id} loadingLabel="Switching" onClick={() => switchTo.mutate({ organization: m.organization.id })}>Act for this</Button>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function ProfilePage() {
  const { data: session } = useSession()
  const client = useQueryClient()
  if (!session?.user) return null
  const user = session.user
  return (
    <>
      <HeaderBlock level={1} source="explicit" title="Profile" description="How you appear to your team and to the sellers and buyers you trade with." />
      <PageSection title="Photo" description="Shown beside your name on orders, quotes and team lists.">
        <Photo session={session} />
      </PageSection>
      <PageSection title="Your details" description="Your name signs your orders and approvals; the phone number is used for delivery calls and M-Pesa prompts.">
        <ProjectedForm
          meta={AccountMeta}
          fields={['display_name', 'phone']}
          mode="edit"
          initial={{ display_name: user.display_name, phone: user.phone }}
          submitLabel="Save details"
          onSubmit={values => attempt(async () => client.setQueryData(sessionKey, await api<Session>('account/profile', { method: 'PATCH', body: values })))}
        />
      </PageSection>
      <PageSection title="Sign-in" description="The address you sign in with and where account email is sent." actions={<Link href="/account/settings#security" className="inline-flex items-center gap-1 text-md font-semibold text-primary hover:underline">Change password<Icon icon={ArrowRight} /></Link>}>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><dt className="text-sm font-semibold text-muted">Email</dt><dd className="flex flex-wrap items-center gap-2 break-all">{user.email}{user.email_verified ? <Stamp size="sm" tone="success">Confirmed</Stamp> : <Stamp size="sm" tone="warning">Not confirmed</Stamp>}</dd></div>
          <div className="flex flex-col gap-1"><dt className="text-sm font-semibold text-muted">Member since</dt><dd className="tabular">{formatDate(user.date_joined)}</dd></div>
        </dl>
      </PageSection>
      <PageSection title="Organizations" description="The businesses you trade for. Everything you see and do applies to the one you act for.">
        <Organizations session={session} />
      </PageSection>
    </>
  )
}
