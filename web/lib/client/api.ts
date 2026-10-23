// The browser's way to the API: same-origin (proxied by next.config), session cookie, CSRF header on
// writes, and every failure narrowed to the contract's AppError shape. Never stores tokens itself.

import { API_BASE, errors } from '../contract/generated'
import type { AppError } from '../contract/types'

export class ApiError extends Error {
  constructor(readonly error: AppError, readonly status: number) {
    super(error.detail)
  }
  get fields(): Record<string, string[]> {
    return this.error.fields ?? {}
  }
}

const isAppError = (v: unknown): v is AppError =>
  typeof v === 'object' && v !== null && typeof (v as AppError).code === 'string' && typeof (v as AppError).detail === 'string'

function fallback(status: number): AppError {
  const code = status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'UNAVAILABLE'
  return { code, detail: errors[code as keyof typeof errors]?.message ?? 'Something went wrong.', fields: {}, retryable: status >= 500 }
}

function csrfToken(): string {
  return document.cookie.split('; ').find(c => c.startsWith('csrftoken='))?.slice('csrftoken='.length) ?? ''
}

/**
 * `GET session` sets the CSRF cookie. A page that writes before anything has read the session (sign-in
 * opened directly, for one) reads it first, so the first write of a visit is not refused.
 */
async function ensureCsrf(signal?: AbortSignal) {
  if (csrfToken()) return
  await fetch(`${API_BASE}session`, { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal }).catch(() => undefined)
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; signal?: AbortSignal }

export async function api<T>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  const form = typeof FormData !== 'undefined' && body instanceof FormData
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') {
    await ensureCsrf(signal)
    headers['X-CSRFToken'] = decodeURIComponent(csrfToken())
  }
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API_BASE}${path.replace(/^\//, '')}`, {
    method, signal, credentials: 'same-origin', headers,
    body: body === undefined ? undefined : form ? (body as FormData) : JSON.stringify(body),
  })
  const data: unknown = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(isAppError(data) ? data : fallback(res.status), res.status)
  return data as T
}

/** Run a write for a ProjectedForm: success, or the API's own error (field messages included). */
export async function attempt(run: () => Promise<unknown>, message?: string): Promise<{ ok: true; message?: string } | { ok: false; error: AppError }> {
  try {
    await run()
    return { ok: true, message }
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.error : fallback(0) }
  }
}
