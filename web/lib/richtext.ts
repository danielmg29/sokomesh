// Client-side mirror of the backend's rich-text allow-list (spec p.5). The server sanitises
// on write and render; this keeps the editor's output inside the same rules for preview.

const ALLOWED = new Set(['P', 'BR', 'H3', 'H4', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI', 'A'])
const RENAME: Record<string, string> = { B: 'strong', I: 'em', DIV: 'p', H1: 'h3', H2: 'h3' }
const SAFE_HREF = /^(https?:|mailto:)/i

function clean(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? '')
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element
  const tag = RENAME[el.tagName] ? RENAME[el.tagName]!.toUpperCase() : el.tagName
  const children = Array.from(el.childNodes).map(c => clean(c, doc)).filter((c): c is Node => c !== null)
  if (!ALLOWED.has(tag)) {
    const frag = doc.createDocumentFragment()
    children.forEach(c => frag.appendChild(c))
    return frag
  }
  const out = doc.createElement(tag.toLowerCase())
  if (tag === 'A') {
    const href = el.getAttribute('href') ?? ''
    if (!SAFE_HREF.test(href)) {
      const frag = doc.createDocumentFragment()
      children.forEach(c => frag.appendChild(c))
      return frag
    }
    out.setAttribute('href', href)
    out.setAttribute('rel', 'noreferrer noopener')
  }
  children.forEach(c => out.appendChild(c))
  return out
}

/** Returns allow-listed HTML and its plain-text projection. Browser only. */
export function sanitizeRichText(html: string): { html: string; text: string } {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const body = doc.createElement('div')
  Array.from(doc.body.childNodes).forEach(n => { const c = clean(n, doc); if (c) body.appendChild(c) })
  return { html: body.innerHTML, text: (body.textContent ?? '').replace(/\s+/g, ' ').trim() }
}
