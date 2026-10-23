// README screenshots (docs/screenshots/<name>.<theme>.png) from a running local stack with the demo seed:
//
//   pnpm screenshots                      # BASE_URL=http://localhost:3000, the system Edge (no browser download)
//   BROWSER_CHANNEL=chrome pnpm screenshots
//
// Signs in through the sign-in page's demo-account list (development only), so no password lives here. The
// payment shot approves Brian's order first (Grace), which moves the demo along: reseed afterwards with
// `seed_demo --reset` to put the story back.

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const OUT = join(import.meta.dirname, '..', '..', 'docs', 'screenshots')
const VIEWPORT = { width: 1440, height: 900 }
const THEMES = ['light', 'dark'] as const
type Theme = (typeof THEMES)[number]
type Shot = { name: string; who?: string; path: (page: Page) => Promise<string>; before?: (page: Page) => Promise<void>; scroll?: string }

const api = async <T,>(page: Page, path: string): Promise<T> => {
  const res = await page.request.get(`${BASE}/api/v1/${path}`)
  if (!res.ok()) throw new Error(`${path}: ${res.status()}`)
  return (await res.json()) as T
}
const first = async (page: Page, path: string) => (await api<{ results: { id: string }[] }>(page, path)).results[0]?.id

async function signIn(context: BrowserContext, who: string) {
  const page = await context.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByRole('button', { name: new RegExp(`^Fill the form with ${who}`) }).click()
  await page.getByRole('button', { name: /^Sign in$/ }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  await page.close()
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  // Skeletons (LoadingState) mark data still on its way; a slow database can outlast network idle.
  await page.waitForFunction(() => !document.querySelector('[role="status"][aria-label^="Loading"]'), undefined, { timeout: 90_000 }).catch(() => undefined)
  await page.evaluate(() => document.fonts.ready)
  // Let entrance motion finish so every shot shows the resting state.
  await page.waitForTimeout(900)
}

const shots: Shot[] = [
  { name: 'landing', path: async () => '/' },
  { name: 'category-search', path: async () => '/catalogue/flour-grains' },
  { name: 'product-detail', path: async () => '/products/mavuno-maize-flour-2kg' },
  { name: 'cart', who: 'Brian', path: async () => '/cart' },
  {
    name: 'payment', who: 'Grace',
    path: async page => `/orders/${await first(page, 'orders?status__in=awaiting_payment&page_size=1')}`,
    before: async page => {
      // Approve Brian's order if it still waits, so it moves to payment with its packs held.
      const waiting = await first(page, 'orders?status__in=pending_approval&page_size=1')
      if (!waiting) return
      await page.goto(`${BASE}/orders/${waiting}`)
      await page.getByRole('button', { name: /^Approve/ }).first().click()
      const confirm = page.getByRole('dialog').getByRole('button', { name: /^Approve/ })
      if (await confirm.count()) await confirm.click()
      // A slow database can take a while to commit the approval; wait for the order to reach payment.
      for (let i = 0; i < 30 && !(await first(page, 'orders?status__in=awaiting_payment&page_size=1')); i++) await page.waitForTimeout(2000)
    },
    scroll: '#payment',
  },
  { name: 'seller-analytics', who: 'Faith', path: async () => '/sell/analytics?range=90d' },
  {
    name: 'inventory-ledger', who: 'Faith',
    path: async page => {
      const balances = await api<{ results: { variant: { id: string; label: string } }[] }>(page, 'inventory/balances?page_size=100')
      const pack = balances.results.find(b => b.variant.label.startsWith('MVN-2K')) ?? balances.results[0]
      return `/sell/inventory?variant=${pack!.variant.id}`
    },
    scroll: '#ledger',
  },
  { name: 'warehouse-pick-pack', who: 'Peter', path: async page => `/sell/fulfilment/${await first(page, 'fulfilment/tasks?status__in=picking&page_size=1')}` },
  {
    name: 'marketplace-admin', who: 'Amina',
    path: async page => {
      const order = (await api<{ results: { order_number: string }[] }>(page, 'orders?status__in=picking&page_size=1')).results[0]
      return `/admin/reconciliation?q=${order?.order_number ?? ''}`
    },
  },
  { name: 'design-system', path: async () => '/design-system' },
]

async function capture(browser: Browser, theme: Theme, only: string[]) {
  const sessions = new Map<string, BrowserContext>()
  const contextFor = async (who?: string) => {
    const key = who ?? 'public'
    if (!sessions.has(key)) {
      const context = await browser.newContext({ viewport: VIEWPORT, colorScheme: theme, reducedMotion: 'reduce', locale: 'en-KE', timezoneId: 'Africa/Nairobi' })
      if (who) await signIn(context, who)
      sessions.set(key, context)
    }
    return sessions.get(key)!
  }
  for (const shot of shots.filter(s => !only.length || only.includes(s.name))) {
    const page = await (await contextFor(shot.who)).newPage()
    try {
      if (shot.before && theme === THEMES[0]) await shot.before(page)
      await page.goto(`${BASE}${await shot.path(page)}`)
      await settle(page)
      if (shot.scroll) {
        await page.locator(shot.scroll).first().scrollIntoViewIfNeeded().catch(() => undefined)
        await page.evaluate(() => window.scrollBy(0, -96))
        await page.waitForTimeout(400)
      }
      const file = join(OUT, `${shot.name}.${theme}.png`)
      await page.screenshot({ path: file, animations: 'disabled' })
      console.log(`wrote ${file}`)
    } catch (err) {
      console.error(`${shot.name} (${theme}) failed:`, err instanceof Error ? err.message : err)
      process.exitCode = 1
    } finally {
      await page.close()
    }
  }
  await Promise.all([...sessions.values()].map(c => c.close()))
}

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' })
const only = process.argv.slice(2)
try {
  for (const theme of THEMES) await capture(browser, theme, only)
} finally {
  await browser.close()
}
