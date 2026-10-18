// The signed-in person, their organizations and navigation, as GET /session answers (apps/accounts).
// Everything here is decided by the server: roles, the active organization, which pages exist for them.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Route } from 'next'
import { rolePermissions, type Role } from '../contract/generated'
import { api } from './api'

export type Avatar = { url: string; dark_url: string | null; alt: string }
export type SessionUser = {
  id: string; email: string; display_name: string; phone: string; email_verified: boolean; avatar: Avatar | null; date_joined: string
}
export type SessionOrganization = {
  id: string; name: string; organization_type: 'buyer' | 'seller' | 'marketplace_admin'; approval_state: string
  /** Roles this organization can give (invitation and role-change choices). */
  assignable_roles: Role[]
}
export type SessionMembership = { id: string; role_key: Role; role_label: string; organization: SessionOrganization }
export type NavEntry = { key: string; label: string; href: string; group: string }
export type Session = {
  user: SessionUser | null
  memberships: SessionMembership[]
  active_organization: string | null
  is_admin: boolean
  nav: NavEntry[]
}

export const sessionKey = ['session'] as const

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: ({ signal }) => api<Session>('session', { signal }), staleTime: 60_000 })
}

/** The membership the session acts for. */
export function activeMembership(session: Session | undefined): SessionMembership | undefined {
  return session?.memberships.find(m => m.organization.id === session.active_organization) ?? session?.memberships[0]
}

/**
 * Whether the active role holds a permission, from the contract's role table. For showing or hiding
 * controls only: the API checks every request itself.
 */
export function may(session: Session | undefined, permission: string): boolean {
  const role = activeMembership(session)?.role_key
  if (!role) return false
  const granted: readonly string[] = rolePermissions[role]
  return granted.includes('*') || granted.includes(permission)
}

/** Where a person lands after signing in: the first page their role is for. */
export function homeFor(session: Session): Route {
  if (!session.user) return '/login'
  if (!session.user.email_verified) return '/verify'
  const keys = session.nav.map(n => n.key)
  if (keys.includes('admin-sellers')) return '/admin/sellers'
  if (keys.includes('sell')) return '/sell'
  if (keys.includes('catalogue')) return '/catalogue'
  return '/organization'
}

/** A write whose answer is the new session (sign in, verify, profile), stored straight into the cache. */
export function useSessionWrite<V>(path: string, method: 'POST' | 'PATCH' = 'POST') {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: V) => api<Session>(path, { method, body }),
    onSuccess: session => {
      client.setQueryData(sessionKey, session)
      void client.invalidateQueries({ predicate: q => q.queryKey[0] !== sessionKey[0] })
    },
  })
}
