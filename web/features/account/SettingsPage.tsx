'use client'

// SM-F-21 and SM-F-01 settings: which events reach which channel and the language they are written in
// (NotificationPreference rows, saved per switch), the colour theme, and the password.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { NotificationPreferencesBlock, type NotificationChannel, type NotificationEvent, type NotificationPreference } from '@/components/commerce/notifications'
import { ErrorState } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { PageSection } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { PasswordInput } from '@/components/ui/password-input'
import { ThemeSwitch } from '@/components/ui/theme'
import { useToast } from '@/components/ui/toast'
import { ApiError, api } from '@/lib/client/api'
import { pathOf, useList } from '@/lib/client/resources'
import { NotificationPreferenceMeta, auth } from '@/lib/contract/generated'

type PreferenceRow = { id: string; event_key: NotificationEvent; channel: NotificationChannel; enabled: boolean; locale: string }

const prefsPath = pathOf(NotificationPreferenceMeta)

function Notifications() {
  const client = useQueryClient()
  const list = useList<PreferenceRow>(NotificationPreferenceMeta, 'page_size=50')
  const [saving, setSaving] = useState<string>()
  const [problem, setProblem] = useState<string | null>(null)
  const rows = list.data?.results ?? []

  const save = useMutation({
    mutationFn: async ({ key, run }: { key: string; run: () => Promise<unknown> }) => { setSaving(key); await run() },
    onSuccess: () => setProblem(null),
    onError: err => setProblem(err instanceof ApiError ? err.error.detail : 'The change was not saved. Try again.'),
    onSettled: async () => { await client.invalidateQueries({ queryKey: [prefsPath] }); setSaving(undefined) },
  })

  if (list.isPending) return <LoadingState variant="skeleton" shape="list" rows={5} label="Loading notification settings" />
  if (list.isError) return <ErrorState kind="retryable" title="Notification settings did not load" detail="Your current settings still apply." onRetry={() => void list.refetch()} size="inline" />

  const preferences: NotificationPreference[] = rows.map(r => ({ event: r.event_key, channel: r.channel, enabled: r.enabled }))
  const onChange = (p: NotificationPreference) => {
    const row = rows.find(r => r.event_key === p.event && r.channel === p.channel)
    if (!row) return
    // Show the new position at once; the refetch afterwards brings the server's answer.
    client.setQueryData([prefsPath, 'list', 'page_size=50'], (old: typeof list.data) => old && { ...old, results: old.results.map(r => (r.id === row.id ? { ...r, enabled: p.enabled } : r)) })
    save.mutate({ key: `${p.event}:${p.channel}`, run: () => api(`${prefsPath}/${row.id}`, { method: 'PATCH', body: { enabled: p.enabled } }) })
  }
  const onLocaleChange = (locale: string) => save.mutate({ key: 'locale', run: () => api(`${prefsPath}/locale`, { method: 'POST', body: { locale } }) })

  return (
    <>
      <NotificationPreferencesBlock preferences={preferences} onChange={onChange} savingKey={saving} locale={rows[0]?.locale} onLocaleChange={onLocaleChange} />
      {problem ? <p role="alert" className="text-sm font-medium text-tone-danger">{problem}</p> : null}
    </>
  )
}

function Password() {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const change = useMutation({
    mutationFn: () => api('account/password', { method: 'POST', body: { current_password: current, new_password: next } }),
    onSuccess: () => {
      setCurrent(''); setNext(''); setErrors({})
      toast({ tone: 'success', title: 'Password changed', description: 'Other devices signed in to this account have been signed out.' })
    },
    onError: err => setErrors(err instanceof ApiError
      ? { ...Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v.join(' ')])), ...(Object.keys(err.fields).length ? {} : { form: err.error.detail }) }
      : { form: 'The service is temporarily unavailable. Try again shortly.' }),
  })
  const submit = (e: FormEvent) => { e.preventDefault(); change.mutate() }
  return (
    <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-4">
      {/* Lets password managers pair the new password with this account. */}
      <input type="email" name="username" autoComplete="username" value="" readOnly hidden />
      <FormField label="Current password" error={errors.current_password} required>
        <PasswordInput name="current_password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
      </FormField>
      <FormField label="New password" help={auth.password.help} error={errors.new_password} required>
        <PasswordInput name="new_password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" />
      </FormField>
      {errors.form ? <p role="alert" className="text-sm font-medium text-tone-danger">{errors.form}</p> : null}
      <Button type="submit" variant="primary" className="self-start" loading={change.isPending} loadingLabel="Changing…" disabled={!current || !next}>Change password</Button>
    </form>
  )
}

export function SettingsPage() {
  return (
    <>
      <HeaderBlock level={1} source="explicit" title="Settings" description="What reaches you and how, the look of SokoMesh on this device, and your password." />
      <PageSection id="notifications" title="Notifications" description="Choose which updates reach you in SokoMesh and by email. Each switch saves as you change it.">
        <Notifications />
      </PageSection>
      <PageSection id="appearance" title="Appearance" description="Light, dark, or follow this device. Saved in this browser only.">
        <ThemeSwitch />
      </PageSection>
      <PageSection id="security" title="Password" description="Changing it signs out every other device using this account.">
        <Password />
      </PageSection>
    </>
  )
}
