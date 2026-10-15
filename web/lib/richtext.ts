// Client mirror of the backend's rich-text allow-list (backend/core/richtext.py), read from the
// contract's `richText`, so the policy is defined once. The server sanitises on write and its result
// always wins; this keeps the editor's output and its preview inside the same rules.

import { richText } from '@/lib/contract/generated'

const TAGS: Readonly<Record<string, readonly string[]>> = richText.tags
const CLASSES: Readonly<Record<string, readonly string[]>> = richText.classes
const LINK_SCHEMES: readonly string[] = richText.linkSchemes
const IMAGE_SCHEMES: readonly string[] = richText.imageSchemes
export const LINK_REL = 'noopener noreferrer nofollow'

// Paste normalisation only (presentation): equivalent tags fold into the allowed ones. The server does
// not rename; it strips what it does not allow, keeping the text.
const RENAME: Record<string, string> = { b: 'strong', i: 'em', strike: 's', del: 's', ins: 'u', h1: 'h3', h2: 'h3', h5: 'h4', h6: 'h4', div: 'p' }
const DROP_WITH_CONTENT = new Set(['script', 'style', 'template', 'iframe', 'object', 'embed', 'noscript', 'svg', 'math'])
const BLOCK_END = new Set(['p', 'h3', 'h4', 'li', 'blockquote', 'figcaption', 'td', 'th', 'br', 'hr'])

const embeds = richText.embeds.map(e => ({ name: e.name, player: e.player, pattern: new RegExp(e.url) }))

const schemeOf = (url: string) => /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase()

/** Same rule as the server: an allowed scheme, or (where allowed) a path on this origin. */
export function isSafeUrl(url: string, kind: 'link' | 'image'): boolean {
  const value = url.trim()
  const sameOrigin = kind === 'link' || richText.sameOriginImages
  if (sameOrigin && value.startsWith('/') && !value.startsWith('//')) return true
  const scheme = schemeOf(value)
  return Boolean(scheme && (kind === 'link' ? LINK_SCHEMES : IMAGE_SCHEMES).includes(scheme))
}

export type Embed = { name: string; id: string; url: string; player: string }

/** The provider and privacy-enhanced player for a stored (canonical) video URL, or null. */
export function embedFor(url: string): Embed | null {
  for (const e of embeds) {
    const match = e.pattern.exec(url)
    if (match?.[1]) return { name: e.name, id: match[1], url, player: e.player.replace('{id}', match[1]) }
  }
  return null
}

/**
 * Any YouTube or Vimeo address a seller might paste (watch, short, share, embed or player links) as the
 * canonical form the contract stores, or null when it is not from an allowed provider. Parsing the
 * variants is client convenience; the server only accepts the canonical form.
 */
export function canonicalVideoUrl(input: string): string | null {
  let u: URL
  try { u = new URL(input.trim()) } catch { return null }
  const host = u.hostname.replace(/^(www\.|m\.)/, '')
  let candidate: string | null = null
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = u.searchParams.get('v') ?? /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(u.pathname)?.[1]
    if (id) candidate = `https://www.youtube.com/watch?v=${id}`
  } else if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    if (id) candidate = `https://www.youtube.com/watch?v=${id}`
  } else if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = /(\d{6,12})/.exec(u.pathname)?.[1]
    if (id) candidate = `https://vimeo.com/${id}`
  }
  return candidate && embedFor(candidate) ? candidate : null
}

function clean(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? '')
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element
  const raw = el.tagName.toLowerCase()
  if (DROP_WITH_CONTENT.has(raw)) return null
  const tag = RENAME[raw] ?? raw
  const children = () => Array.from(el.childNodes).map(c => clean(c, doc)).filter((c): c is Node => c !== null)
  const unwrap = () => {
    const frag = doc.createDocumentFragment()
    children().forEach(c => frag.appendChild(c))
    return frag
  }
  const allowed = TAGS[tag]
  if (!allowed) return unwrap()

  const out = doc.createElement(tag)
  for (const name of allowed) {
    const value = el.getAttribute(name)
    if (value === null) continue
    if (name === 'class') {
      const kept = value.split(/\s+/).filter(c => CLASSES[tag]?.includes(c))
      if (kept.length) out.setAttribute('class', kept.join(' '))
    } else if ((tag === 'a' && name === 'href' && !isSafeUrl(value, 'link')) || (tag === 'img' && name === 'src' && !isSafeUrl(value, 'image'))) {
      continue
    } else if (tag === 'oembed' && name === 'url') {
      if (embedFor(value)) out.setAttribute('url', value)
    } else {
      out.setAttribute(name, value)
    }
  }
  if (tag === 'a') out.setAttribute('rel', LINK_REL)
  // A media figure without an allowed embed, or an image without a safe source, carries nothing.
  if (tag === 'oembed' && !out.hasAttribute('url')) return null
  if (tag === 'img' && !out.hasAttribute('src')) return null
  children().forEach(c => out.appendChild(c))
  if (tag === 'figure' && out.classList.contains('media') && !out.querySelector('oembed')) return null
  return out
}

function textOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  const inner = Array.from(node.childNodes).map(textOf).join('')
  return node.nodeType === Node.ELEMENT_NODE && BLOCK_END.has((node as Element).tagName.toLowerCase()) ? `${inner} ` : inner
}

/** Returns allow-listed HTML and its plain-text projection (blocks separated by spaces, as on the server). Browser only. */
export function sanitizeRichText(html: string): { html: string; text: string } {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const body = doc.createElement('div')
  Array.from(doc.body.childNodes).forEach(n => { const c = clean(n, doc); if (c) body.appendChild(c) })
  return { html: body.innerHTML, text: textOf(body).replace(/\s+/g, ' ').trim() }
}

/** Word count for the editor's status bar. */
export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0)
