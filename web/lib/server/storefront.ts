// Public storefront data for server components (SM-F-22, SM-F-08, SM-F-09): published products, categories
// with their contracts, and comparisons, fetched from the API without cookies, cached for a few minutes and
// tagged so a publish can refresh them. Pages render from this on the server, so product content, filters
// and page links work without client-side JavaScript. Server-only by construction: it uses next/cache,
// which a client bundle cannot import. Record shapes live in lib/client/records.ts, shared with the browser.

import { cacheLife, cacheTag } from 'next/cache'
import type { CategoryRecord, ComparisonRecord, ProductDetailRecord, ProductRecord } from '../client/records'
import { API_BASE } from '../contract/generated'
import type { ListPage } from '../contract/types'

export type { CategoryRecord, ComparisonRecord, ProductDetailRecord, ProductRecord } from '../client/records'

const ORIGIN = process.env.API_ORIGIN ?? process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:8000'

/** A refusal or failure from the API, with its reader-facing detail (a comparison of mixed categories, say). */
export class StorefrontError extends Error {
  constructor(readonly status: number, readonly detail: string) {
    super(detail)
  }
}

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${ORIGIN}${API_BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null
    throw new StorefrontError(res.status, body?.detail ?? `The catalogue could not be loaded (${res.status}).`)
  }
  return (await res.json()) as T
}

const emptyPage: ListPage<ProductRecord> = { results: [], next: null, previous: null, total: 0, totalCapped: false, pageSize: 0 }

/** One page of the public product list, with its facet counts, for exactly these list parameters. */
export async function productPage(params: string): Promise<ListPage<ProductRecord>> {
  'use cache'
  cacheLife('minutes')
  cacheTag('products')
  return (await get<ListPage<ProductRecord>>(`products?${params}`)) ?? emptyPage
}

/** The first products of a list (the landing page's rails, related products). */
export async function products(params = 'page_size=100'): Promise<ProductRecord[]> {
  return (await productPage(params)).results
}

export async function product(slug: string): Promise<ProductDetailRecord | null> {
  'use cache'
  cacheLife('minutes')
  cacheTag('products', `product:${slug}`)
  return get<ProductDetailRecord>(`products/${encodeURIComponent(slug)}`)
}

export async function categories(): Promise<CategoryRecord[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('categories')
  return (await get<ListPage<CategoryRecord>>('categories?page_size=50'))?.results ?? []
}

/** A comparison of up to four products of one category; the API refuses mixed categories with its reason. */
export async function comparison(ids: readonly string[]): Promise<ComparisonRecord> {
  'use cache'
  cacheLife('minutes')
  cacheTag('products')
  const found = await get<ComparisonRecord>(`compare?products=${ids.map(encodeURIComponent).join(',')}`)
  if (!found) throw new StorefrontError(404, 'Those products could not be found.')
  return found
}
