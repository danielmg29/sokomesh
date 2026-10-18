'use client'

// Divergent: sign-in, registration, verification and invitation are account workflows, not projections
// of a contract model. They use the form primitives (label, help and error wiring) and every rule and
// message comes from the API (apps/accounts): the client only collects and shows.

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, MailCheck } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Avatar } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/choice'
import { FormField } from '@/components/ui/form-field'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { ApiError, api } from '@/lib/client/api'
import { homeFor, useSession, useSessionWrite, type Session } from '@/lib/client/session'
import { auth } from '@/lib/contract/generated'
import { cn } from '@/lib/cn'

type Errors = Record<string, string>

function errorsOf(err: unknown): { fields: Errors; detail: string } {
  if (err instanceof ApiError) return { fields: Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v.join(' ')])), detail: err.error.detail }
  return { fields: {}, detail: 'The service is temporarily unavailable. Try again shortly.' }
}

/** A same-site path to return to after signing in; anything else falls back to the role's home. */
function safeNext(next: string | null): Route | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? (next as Route) : null
}

function Problem({ children }: { children: ReactNode }) {
  return <p role="alert" className="border border-tone-danger bg-tone-danger-bg/50 px-3 py-2.5 text-md">{children}</p>
}

// --- sign in ---------------------------------------------------------------------------------

type DemoAccount = { email: string; name: string; role_label: string; organization: string; summary: string; avatar: { url: string; dark_url: string | null } | null }

export function SignIn() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ fields: Errors; detail: string } | null>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const signIn = useSessionWrite<{ email: string; password: string }>('auth/login')
  const demo = useQuery({
    queryKey: ['demo-accounts'],
    queryFn: () => api<{ password: string; accounts: DemoAccount[] }>('demo/accounts'),
    retry: false,
    staleTime: Infinity,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setErrors(null)
    signIn.mutate({ email, password }, {
      onSuccess: session => router.replace(((session.user?.email_verified && next) || homeFor(session)) as Route),
      onError: err => setErrors(errorsOf(err)),
    })
  }
  const fill = (account: DemoAccount) => {
    setEmail(account.email)
    setPassword(demo.data?.password ?? '')
    setErrors(null)
    submitRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        {errors && !Object.keys(errors.fields).length ? <Problem>{errors.detail}</Problem> : null}
        <FormField label="Email address" error={errors?.fields.email}>
          <Input type="email" name="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Password" error={errors?.fields.password}>
          <PasswordInput name="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </FormField>
        <Button ref={submitRef} type="submit" variant="primary" size="lg" block loading={signIn.isPending} loadingLabel="Signing in…">Sign in</Button>
        <p className="text-md text-muted">New to SokoMesh? <Link href="/register" className="font-semibold text-primary hover:underline">Create an account</Link></p>
      </form>

      {demo.data?.accounts.length ? (
        <section aria-labelledby="demo-title" className="flex flex-col gap-3 border-t border-foreground pt-5">
          <div className="flex flex-col gap-1">
            <h2 id="demo-title" className="text-xl font-semibold">Demo accounts</h2>
            <p className="text-sm text-muted">Seeded people with invented businesses. Choose one to fill the form, then sign in.</p>
          </div>
          <ul className="grid grid-cols-1 border-t border-l border-border @container sm:grid-cols-2">
            {demo.data.accounts.map(a => {
              const chosen = email === a.email
              return (
                <li key={a.email} className="border-r border-b border-border">
                  <button type="button" onClick={() => fill(a)} aria-pressed={chosen} aria-label={`Fill the form with ${a.name}'s demo account (${a.role_label}, ${a.organization})`}
                    className={cn('flex h-full w-full items-start gap-3 p-3 text-left motion-bind transition-colors active:translate-y-px', chosen ? 'bg-signal-soft' : 'bg-surface hover:bg-sunken')}>
                    <Avatar name={a.name} src={a.avatar?.url} darkSrc={a.avatar?.dark_url} size="lg" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-semibold">{a.name}</span>
                      <span className="text-sm">{a.role_label}, {a.organization}</span>
                      <span className="text-sm text-muted">{a.summary}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

// --- register ----------------------------------------------------------------------------------

export function Register() {
  const router = useRouter()
  const params = useSearchParams()
  const [kind, setKind] = useState<'buyer' | 'seller'>(params.get('as') === 'seller' ? 'seller' : 'buyer')
  const [values, setValues] = useState({ display_name: '', email: '', password: '', organization_name: '' })
  const [errors, setErrors] = useState<{ fields: Errors; detail: string } | null>(null)
  const register = useSessionWrite<typeof values & { organization_type: string }>('auth/register')
  const set = (k: keyof typeof values) => (v: string) => setValues(s => ({ ...s, [k]: v }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setErrors(null)
    register.mutate({ ...values, organization_type: kind }, { onSuccess: () => router.replace('/verify'), onError: err => setErrors(errorsOf(err)) })
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {errors && !Object.keys(errors.fields).length ? <Problem>{errors.detail}</Problem> : null}
      <Segmented label="I want to" value={kind} onValueChange={setKind} items={[{ value: 'buyer', label: 'Buy for my shop' }, { value: 'seller', label: 'Sell as a wholesaler' }]} />
      <FormField label="Your name" error={errors?.fields.display_name}>
        <Input name="name" autoComplete="name" value={values.display_name} onChange={e => set('display_name')(e.target.value)} />
      </FormField>
      <FormField label={kind === 'seller' ? 'Business name' : 'Shop name'} help="The name other traders see. You can add the legal name later." error={errors?.fields.organization_name}>
        <Input name="organization" autoComplete="organization" value={values.organization_name} onChange={e => set('organization_name')(e.target.value)} />
      </FormField>
      <FormField label="Email address" help="We send a code to confirm it." error={errors?.fields.email}>
        <Input type="email" name="email" autoComplete="email" value={values.email} onChange={e => set('email')(e.target.value)} />
      </FormField>
      <FormField label="Password" help={auth.password.help} error={errors?.fields.password}>
        <PasswordInput name="password" value={values.password} onChange={e => set('password')(e.target.value)} autoComplete="new-password" />
      </FormField>
      <Button type="submit" variant="primary" size="lg" block loading={register.isPending} loadingLabel="Creating your account…">
        Create account<Icon icon={ArrowRight} />
      </Button>
      <p className="text-sm text-muted">{kind === 'seller' ? 'Sellers are reviewed before their products go live.' : 'Buyer accounts are reviewed before trading starts.'} Already registered? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
    </form>
  )
}

// --- verify ------------------------------------------------------------------------------------

export function Verify() {
  const router = useRouter()
  const session = useSession()
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState<{ fields: Errors; detail: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const verify = useSessionWrite<{ code: string }>('auth/verify')
  const user = session.data?.user

  if (session.isPending) return <p className="text-md text-muted" role="status">Checking your session…</p>
  if (!user) {
    return <p className="text-md">Sign in first, then enter the code we emailed you. <Link href="/login?next=/verify" className="font-semibold text-primary hover:underline">Sign in</Link></p>
  }
  if (user.email_verified) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-lg"><Icon icon={MailCheck} className="text-tone-success" />{user.email} is confirmed.</p>
        <Button variant="primary" size="lg" onClick={() => router.replace(homeFor(session.data as Session))}>Continue<Icon icon={ArrowRight} /></Button>
      </div>
    )
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setErrors(null)
    verify.mutate({ code }, { onSuccess: s => router.replace(homeFor(s)), onError: err => setErrors(errorsOf(err)) })
  }
  const resend = async () => {
    setErrors(null)
    try {
      await api('auth/verify/resend', { method: 'POST', body: {} })
      setNotice(`A new code is on its way to ${user.email}.`)
    } catch (err) {
      setErrors(errorsOf(err))
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <p className="text-lg">We sent a six-digit code to <b className="font-semibold">{user.email}</b>. It expires in 15 minutes.</p>
      {notice ? <p role="status" className="border border-tone-success bg-tone-success-bg/50 px-3 py-2.5 text-md">{notice}</p> : null}
      {errors && !errors.fields.code ? <Problem>{errors.detail}</Problem> : null}
      <FormField label="Verification code" error={errors?.fields.code}>
        <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          inputClassName="font-mono text-2xl tracking-[0.4em] tabular" />
      </FormField>
      <Button type="submit" variant="primary" size="lg" block loading={verify.isPending} loadingLabel="Checking…" disabled={code.length !== 6}>Confirm email</Button>
      <Button type="button" variant="link" onClick={resend} className="self-start">Send a new code</Button>
    </form>
  )
}

// --- invitation --------------------------------------------------------------------------------

type Invitation = { organization: string; role_label: string; email: string; invited_by: string | null; needs_password: boolean }

export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter()
  const invitation = useQuery({ queryKey: ['invitation', token], queryFn: () => api<Invitation>(`invitations/${encodeURIComponent(token)}`), retry: false })
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ fields: Errors; detail: string } | null>(null)
  const accept = useSessionWrite<{ display_name: string; password: string }>(`invitations/${encodeURIComponent(token)}`)

  if (invitation.isPending) return <p role="status" className="text-md text-muted">Opening the invitation…</p>
  if (invitation.isError) return <Problem>{errorsOf(invitation.error).detail}</Problem>
  const inv = invitation.data
  const submit = (e: FormEvent) => {
    e.preventDefault()
    accept.mutate({ display_name: name, password }, { onSuccess: s => router.replace(homeFor(s)), onError: err => setErrors(errorsOf(err)) })
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <p className="text-lg">{inv.invited_by ?? 'A colleague'} invited <b className="font-semibold">{inv.email}</b> to join <b className="font-semibold">{inv.organization}</b> as {inv.role_label}.</p>
      {errors && !Object.keys(errors.fields).length ? <Problem>{errors.detail}</Problem> : null}
      {inv.needs_password ? (
        <FormField label="Your name" error={errors?.fields.display_name}>
          <Input autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
        </FormField>
      ) : null}
      <FormField label={inv.needs_password ? 'Choose a password' : 'Your password'} error={errors?.fields.password}>
        <PasswordInput name="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={inv.needs_password ? 'new-password' : 'current-password'} />
      </FormField>
      <Button type="submit" variant="primary" size="lg" block loading={accept.isPending} loadingLabel="Joining…">Join {inv.organization}</Button>
    </form>
  )
}
