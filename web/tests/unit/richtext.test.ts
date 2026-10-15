// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { LINK_REL, canonicalVideoUrl, embedFor, isSafeUrl, sanitizeRichText, wordCount } from '@/lib/richtext'

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

// The same cases as backend/tests/test_richtext.py, so the client mirror and the server agree.
describe('client mirror of the rich-text allow-list', () => {
  test('allowed structure survives', () => {
    const src = '<h3>Storage</h3><p><strong>Keep dry</strong>, <em>cool</em>, <u>sealed</u> and <s>stacked</s> <code>max 6</code> high.</p><ul><li>One</li></ul><ol><li>Two</li></ol><blockquote><p>Quote</p></blockquote><hr>'
    expect(sanitizeRichText(src).html).toBe(src)
  })

  test('scripts, styles, handlers and iframes are removed', () => {
    expect(sanitizeRichText('<p onclick="x()">Hi<script>alert(1)</script><style>p{}</style></p><iframe src="https://evil"></iframe>').html).toBe('<p>Hi</p>')
  })

  test('pasted equivalents fold into allowed tags', () => {
    expect(sanitizeRichText('<h1>T</h1><b>b</b><i>i</i><del>d</del>').html).toBe('<h3>T</h3><strong>b</strong><em>i</em><s>d</s>')
  })

  test('links get rel and unsafe schemes lose their href', () => {
    expect(sanitizeRichText('<a href="https://soko.example/p">x</a>').html).toBe(`<a href="https://soko.example/p" rel="${LINK_REL}">x</a>`)
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>').html).toBe(`<a rel="${LINK_REL}">x</a>`)
  })

  test('images load over https or from this origin', () => {
    expect(isSafeUrl('https://cdn.example/a.webp', 'image')).toBe(true)
    expect(isSafeUrl('/media/a.webp', 'image')).toBe(true)
    for (const bad of ['http://cdn.example/a.webp', '//cdn.example/a.webp', 'data:image/png;base64,AAAA', 'javascript:x']) {
      expect(sanitizeRichText(`<img src="${bad}" alt="x">`).html).toBe('')
    }
  })

  test('figure classes are limited to image and media', () => {
    expect(sanitizeRichText('<figure class="image wide"><img src="/m.webp" alt="Bale"><figcaption>Front</figcaption></figure>').html)
      .toBe('<figure class="image"><img src="/m.webp" alt="Bale"><figcaption>Front</figcaption></figure>')
  })

  test('embeds only from allow-listed providers', () => {
    const good = `<figure class="media"><oembed url="${YOUTUBE}"></oembed></figure>`
    expect(sanitizeRichText(good).html).toBe(good)
    expect(sanitizeRichText('<figure class="media"><oembed url="https://evil.example/v/1"></oembed></figure>').html).toBe('')
    expect(embedFor(YOUTUBE)?.player).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(embedFor('https://vimeo.com/76979871')?.player).toBe('https://player.vimeo.com/video/76979871?dnt=1')
  })

  test('tables survive without attributes', () => {
    expect(sanitizeRichText('<table><thead><tr><th>Pack</th></tr></thead><tbody><tr><td style="color:red" colspan="2">12 x 2 kg</td></tr></tbody></table>').html)
      .toBe('<table><thead><tr><th>Pack</th></tr></thead><tbody><tr><td>12 x 2 kg</td></tr></tbody></table>')
  })

  test('plain-text projection separates blocks, as the server does', () => {
    const { text } = sanitizeRichText('<h3>Title</h3><p>One &amp; two</p><ul><li>A</li><li>B</li></ul>')
    expect(text).toBe('Title One & two A B')
    expect(wordCount(text)).toBe(6)
  })
})

describe('video links', () => {
  test.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42', YOUTUBE],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', YOUTUBE],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', YOUTUBE],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', YOUTUBE],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', YOUTUBE],
    ['https://vimeo.com/76979871', 'https://vimeo.com/76979871'],
    ['https://player.vimeo.com/video/76979871?h=1', 'https://vimeo.com/76979871'],
  ])('%s becomes the canonical form', (input, canonical) => {
    expect(canonicalVideoUrl(input)).toBe(canonical)
  })

  test.each(['https://evil.example/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short', 'not a url'])('%s is refused', input => {
    expect(canonicalVideoUrl(input)).toBeNull()
  })
})
