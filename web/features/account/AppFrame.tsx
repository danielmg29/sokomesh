'use client'

// The signed-in frame: the kernel's AppShell with navigation the server decided (session.nav), the
// organization the session acts for, the notification bell and the account menu. Signed-out visitors
// go to sign-in and unconfirmed addresses to the code page; access itself is enforced by the API.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Boxes, Building2, ChartColumn, ClipboardCheck, FileText, History, House, LogOut, Package, PackageCheck, Receipt, Scale, ScrollText, Settings, Shapes, ShoppingBag, ShoppingCart, Store, Undo2, UserRound, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { NotificationBell, type AppNotification } from '@/components/commerce/notifications'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { AppNav, MobileNav, type NavItem } from '@/components/kernel/nav/AppNav'
import { AppShell } from '@/components/layout/shell'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Avatar } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Stamp } from '@/components/ui/stamp'
import { Menu, MenuCheckboxItem, MenuContent, MenuGroup, MenuItem, MenuLabel, MenuSeparator, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger } from '@/components/ui/overlay'
import { themeOptions, useThemePreference } from '@/components/ui/theme'
import { api } from '@/lib/client/api'
import { activeMembership, sessionKey, useSession, useSessionWrite, type Session } from '@/lib/client/session'
import { useStoredFlag } from '@/lib/client/use-stored-flag'

// Every entry has an icon: the collapsed navigation shows nothing else (the label stays for screen readers).
const ICONS: Record<string, LucideIcon> = {
  home: House, notifications: Bell, organization: Building2, account: UserRound, settings: Settings,
  catalogue: ShoppingBag, cart: ShoppingCart, orders: Receipt, quotes: FileText, returns: Undo2,
  sales: Receipt, fulfilment: PackageCheck, inventory: Boxes, 'sell-returns': Undo2, 'sell-quotes': FileText, products: Package,
  buyers: Users, analytics: ChartColumn, sell: Store,
  'admin-sellers': ClipboardCheck, 'admin-organizations': ScrollText, 'admin-categories': Shapes, 'admin-reconciliation': Scale, 'admin-audit': History,
}
const APPROVAL: Record<string, { tone: 'success' | 'info' | 'danger' | 'warning'; label: string }> = {
  approved: { tone: 'success', label: 'Approved' }, pending: { tone: 'info', label: 'Pending review' },
  rejected: { tone: 'danger', label: 'Rejected' }, suspended: { tone: 'warning', label: 'Suspended' },
}

type Summary = { unread: number; latest: { id: string; title: string; body_text: string; deep_link: string; status: string; created_at: string }[] }

function useNotificationSummary(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: ({ signal }) => api<Summary>('notifications/summary', { signal }),
    enabled,
    refetchInterval: 60_000, // bounded polling until the realtime gateway (SM-F-15) pushes events
  })
}

function OrganizationContext({ session }: { session: Session }) {
  const switchTo = useSessionWrite<{ organization: string }>('session/organization')
  const active = activeMembership(session)
  if (!active) return null
  const look = APPROVAL[active.organization.approval_state] ?? APPROVAL.pending!
  return (
    <div className="flex flex-col gap-2 border-y border-border py-3">
      {session.memberships.length > 1 ? (
        <Select
          options={session.memberships.map(m => ({ value: m.organization.id, label: m.organization.name }))}
          value={active.organization.id}
          onValueChange={id => switchTo.mutate({ organization: id })}
          className="h-9 text-sm"
        />
      ) : <span className="font-semibold">{active.organization.name}</span>}
      <span className="flex flex-wrap items-center gap-2 text-sm text-muted">{active.role_label}<Stamp tone={look.tone} size="sm">{look.label}</Stamp></span>
    </div>
  )
}

function AccountMenu({ session }: { session: Session }) {
  const router = useRouter()
  const client = useQueryClient()
  const signOut = useMutation({
    mutationFn: () => api<Session>('auth/logout', { method: 'POST', body: {} }),
    onSuccess: s => { client.clear(); client.setQueryData(sessionKey, s); router.replace('/login') },
  })
  const user = session.user!
  const [theme, setTheme] = useThemePreference()
  return (
    <Menu>
      <MenuTrigger className="flex items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-sunken" aria-label={`Account menu for ${user.display_name || user.email}`}>
        <Avatar name={user.display_name || user.email} src={user.avatar?.url} darkSrc={user.avatar?.dark_url} />
        <span className="hidden text-md font-semibold sm:inline">{user.display_name || user.email}</span>
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>{user.email}</MenuLabel>
        <MenuItem href="/account" icon={<UserRound className="size-4" aria-hidden />}>Profile</MenuItem>
        <MenuItem href="/account/settings" icon={<Settings className="size-4" aria-hidden />}>Settings</MenuItem>
        <MenuSub>
          <MenuSubTrigger>Appearance</MenuSubTrigger>
          <MenuSubContent>
            <MenuGroup aria-label="Colour theme">
              {themeOptions.map(o => (
                <MenuCheckboxItem key={o.value} checked={theme === o.value} onCheckedChange={() => setTheme(o.value)}>{o.label}</MenuCheckboxItem>
              ))}
            </MenuGroup>
          </MenuSubContent>
        </MenuSub>
        <MenuSeparator />
        <MenuItem tone="danger" icon={<LogOut className="size-4" aria-hidden />} onSelect={() => signOut.mutate()}>Sign out</MenuItem>
      </MenuContent>
    </Menu>
  )
}

export function AppFrame({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const session = useSession()
  const data = session.data
  const ready = Boolean(data?.user?.email_verified)
  const summary = useNotificationSummary(ready)
  const client = useQueryClient()
  // Collapsing the navigation is this browser's choice, remembered between visits.
  const [collapsed, setCollapsed] = useStoredFlag('sokomesh-nav-collapsed')

  useEffect(() => {
    if (!data) return
    if (!data.user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    else if (!data.user.email_verified) router.replace('/verify')
  }, [data, pathname, router])

  if (!ready || !data) {
    return <div className="mx-auto w-full max-w-3xl p-6"><LoadingState variant="skeleton" shape="detail" label="Loading your account" /></div>
  }

  const unread = summary.data?.unread ?? 0
  const items: NavItem[] = data.nav.map(n => ({ key: n.key, label: n.label, href: n.href, icon: ICONS[n.key], group: n.group, count: n.key === 'notifications' && unread ? unread : undefined }))
  const current = [...items].sort((a, b) => b.href.length - a.href.length).find(i => pathname === i.href || pathname.startsWith(`${i.href}/`))?.key
  const bell: AppNotification[] = (summary.data?.latest ?? []).map(n => ({
    id: n.id, channel: 'in_app', title: n.title, body: n.body_text, deepLink: n.deep_link || undefined,
    status: n.status as AppNotification['status'], sentAt: n.created_at,
  }))
  const markRead = async (id: string) => { await api(`notifications/${id}/read`, { method: 'POST', body: {} }); await client.invalidateQueries({ queryKey: ['notifications'] }) }
  const markAll = async () => { await api('notifications/read-all', { method: 'POST', body: {} }); await client.invalidateQueries({ queryKey: ['notifications'] }) }
  const brand = <Link href="/" aria-label="SokoMesh home" className="-m-2"><BrandLogo variant="wordmark" width={196} /></Link>
  const mark = <Link href="/" aria-label="SokoMesh home"><BrandLogo variant="mark" width={32} /></Link>

  return (
    <AppShell collapsed={collapsed}
      nav={<AppNav items={items} current={current} brand={brand} mark={mark} grouped collapsed={collapsed} onCollapsedChange={setCollapsed} context={<OrganizationContext session={data} />} />}
      header={
        <header className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 sm:px-5">
          <div className="lg:hidden"><MobileNav items={items} current={current} brand="SokoMesh" grouped context={<OrganizationContext session={data} />} /></div>
          <span className="lg:hidden">{brand}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell notifications={bell} onMarkRead={markRead} onMarkAllRead={markAll} allHref="/notifications" />
            <AccountMenu session={data} />
          </div>
        </header>
      }
    >
      <div className="@container mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
    </AppShell>
  )
}
