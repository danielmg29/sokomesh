// The editor's schema is the contract's rich-text allow-list (lib/richtext.ts) and nothing more: what
// the editor can produce is what the server keeps. Images and video use CKEditor 5's stored shapes
// (figure.image with an optional figcaption; figure.media wrapping an oEmbed reference), so content
// stays portable and no iframe is ever stored.

import { Node, type Extensions } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Clapperboard } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'
import { LINK_REL, embedFor, isSafeUrl } from '@/lib/richtext'

export type ImageAttrs = { src: string; alt: string; caption: string }

/** A block image with its text alternative and an optional caption, stored as figure.image. */
export const FigureImage = Node.create({
  name: 'figureImage',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes: () => ({ src: { default: null }, alt: { default: '' }, caption: { default: '' } }),
  parseHTML: () => [
    {
      tag: 'figure.image',
      getAttrs: el => {
        const img = el.querySelector('img')
        const src = img?.getAttribute('src')
        return src && isSafeUrl(src, 'image') ? { src, alt: img?.getAttribute('alt') ?? '', caption: el.querySelector('figcaption')?.textContent ?? '' } : false
      },
    },
    { tag: 'img[src]', getAttrs: el => (isSafeUrl(el.getAttribute('src') ?? '', 'image') ? { src: el.getAttribute('src'), alt: el.getAttribute('alt') ?? '', caption: '' } : false) },
  ],
  renderHTML: ({ node }) => {
    const img = ['img', { src: node.attrs.src, alt: node.attrs.alt ?? '' }] as const
    return node.attrs.caption ? ['figure', { class: 'image' }, img, ['figcaption', {}, node.attrs.caption]] : ['figure', { class: 'image' }, img]
  },
})

function MediaEmbedView({ node, selected }: ReactNodeViewProps) {
  const embed = embedFor(String(node.attrs.url ?? ''))
  return (
    <NodeViewWrapper as="figure" className="media" data-drag-handle>
      {/* The player never loads while editing: a still card stands in, so typing is never captured by an iframe. */}
      <div className={cn('flex aspect-video w-full flex-col items-center justify-center gap-2 border border-border bg-chrome text-chrome-foreground', selected && 'outline-2 outline-offset-2 outline-ring')}>
        <Icon icon={Clapperboard} className="size-8 text-chrome-muted" />
        <span className="text-md font-semibold">{embed ? `${embed.name} video` : 'Video'}</span>
        <span className="max-w-[80%] truncate font-mono text-xs text-chrome-muted">{String(node.attrs.url ?? '')}</span>
      </div>
    </NodeViewWrapper>
  )
}

/** A video from an allow-listed provider, stored as figure.media > oembed[url]. */
export const MediaEmbed = Node.create({
  name: 'mediaEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes: () => ({ url: { default: null } }),
  parseHTML: () => [
    { tag: 'figure.media', getAttrs: el => { const url = el.querySelector('oembed')?.getAttribute('url'); return url && embedFor(url) ? { url } : false } },
    { tag: 'oembed[url]', getAttrs: el => { const url = el.getAttribute('url'); return url && embedFor(url) ? { url } : false } },
  ],
  renderHTML: ({ node }) => ['figure', { class: 'media' }, ['oembed', { url: node.attrs.url }]],
  addNodeView: () => ReactNodeViewRenderer(MediaEmbedView),
})

export function richTextExtensions(placeholder?: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [3, 4] },
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        protocols: ['mailto'],
        isAllowedUri: url => isSafeUrl(url, 'link'),
        HTMLAttributes: { rel: LINK_REL, target: null },
      },
    }),
    TableKit.configure({ table: { resizable: false } }),
    FigureImage,
    MediaEmbed,
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ]
}
