'use client'

// Rich-text editor for the four designated fields (spec p.5). Classic document-editor layout after
// CKEditor 5: one toolbar row that folds its lower-priority groups into "Show more items" when the
// field is narrow, a contextual bar for the selected link, image, video or table, inline insert forms
// (containers, not floating balloons), and a status bar with word and character counts. Built on
// Tiptap (MIT); its schema is the contract's allow-list, so the editor cannot produce what the server
// would strip. Loaded lazily by RichTextInput, so the editor's weight is paid only where it is used.

import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import {
  Bold, ChevronDown, Clapperboard, Code, EllipsisVertical, ExternalLink, ImagePlus, IndentDecrease, IndentIncrease, Italic, Link2,
  List, ListOrdered, Pencil, Redo2, RemoveFormatting, SeparatorHorizontal, Strikethrough, Table, TextQuote, Trash2, Underline, Undo2, Unlink, Upload,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/choice'
import { FormField } from '@/components/ui/form-field'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Popover } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'
import { limits } from '@/lib/contract/generated'
import { canonicalVideoUrl, embedFor, isSafeUrl, sanitizeRichText, wordCount } from '@/lib/richtext'
import { formatBytes } from '../types'
import { richTextExtensions, type ImageAttrs } from './extensions'

export type RichTextEditorProps = {
  id?: string
  /** Accessible name for the editable area (a label element cannot name it). */
  label?: string
  value: string
  onChange: (value: { html: string; text: string }) => void
  disabled?: boolean
  maxLength?: number
  describedBy?: string
  invalid?: boolean
  placeholder?: string
  /** Media pipeline adapter (SM-F-05): stores the file and resolves to its URL. Without it, images are added by address. */
  uploadImage?: (file: File) => Promise<string>
}

type Panel = 'link' | 'image' | 'video' | 'table' | null
type Fold = 'never' | 'narrow' | 'medium'
type Snapshot = NonNullable<ReturnType<typeof snapshot>>

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const blockStyles = [
  { value: 'p', label: 'Paragraph', preview: 'text-md' },
  { value: 'h3', label: 'Heading', preview: 'font-display text-lg font-bold' },
  { value: 'h4', label: 'Subheading', preview: 'text-md font-bold' },
] as const

function snapshot(e: Editor | null) {
  if (!e) return null
  return {
    bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'), code: e.isActive('code'),
    bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'), quote: e.isActive('blockquote'),
    block: e.isActive('heading', { level: 3 }) ? 'h3' : e.isActive('heading', { level: 4 }) ? 'h4' : 'p',
    link: e.isActive('link') ? String(e.getAttributes('link').href ?? '') : null,
    table: e.isActive('table'),
    image: e.isActive('figureImage') ? (e.getAttributes('figureImage') as ImageAttrs) : null,
    media: e.isActive('mediaEmbed') ? String(e.getAttributes('mediaEmbed').url ?? '') : null,
    canUndo: e.can().undo(), canRedo: e.can().redo(),
    canSink: e.can().sinkListItem('listItem'), canLift: e.can().liftListItem('listItem'),
    empty: e.state.selection.empty,
  }
}

type Tool = { key: string; label: string; icon: LucideIcon; fold: Fold; run: (e: Editor) => void; on?: (s: Snapshot) => boolean; can?: (s: Snapshot) => boolean; panel?: Panel; shortcut?: string }

// Order is the toolbar order; `fold` says when a tool moves into "Show more items".
const groups: Tool[][] = [
  [
    { key: 'undo', label: 'Undo', icon: Undo2, fold: 'never', shortcut: 'Ctrl+Z', run: e => e.chain().focus().undo().run(), can: s => s.canUndo },
    { key: 'redo', label: 'Redo', icon: Redo2, fold: 'never', shortcut: 'Ctrl+Y', run: e => e.chain().focus().redo().run(), can: s => s.canRedo },
  ],
  [
    { key: 'bold', label: 'Bold', icon: Bold, fold: 'never', shortcut: 'Ctrl+B', run: e => e.chain().focus().toggleBold().run(), on: s => s.bold },
    { key: 'italic', label: 'Italic', icon: Italic, fold: 'never', shortcut: 'Ctrl+I', run: e => e.chain().focus().toggleItalic().run(), on: s => s.italic },
    { key: 'underline', label: 'Underline', icon: Underline, fold: 'narrow', shortcut: 'Ctrl+U', run: e => e.chain().focus().toggleUnderline().run(), on: s => s.underline },
    { key: 'strike', label: 'Strikethrough', icon: Strikethrough, fold: 'narrow', run: e => e.chain().focus().toggleStrike().run(), on: s => s.strike },
    { key: 'code', label: 'Code', icon: Code, fold: 'narrow', run: e => e.chain().focus().toggleCode().run(), on: s => s.code },
    { key: 'clear', label: 'Remove format', icon: RemoveFormatting, fold: 'narrow', run: e => e.chain().focus().unsetAllMarks().clearNodes().run() },
  ],
  [{ key: 'link', label: 'Link', icon: Link2, fold: 'never', shortcut: 'Ctrl+K', panel: 'link', run: () => undefined, on: s => s.link !== null }],
  [
    { key: 'bullet', label: 'Bulleted list', icon: List, fold: 'never', run: e => e.chain().focus().toggleBulletList().run(), on: s => s.bullet },
    { key: 'ordered', label: 'Numbered list', icon: ListOrdered, fold: 'never', run: e => e.chain().focus().toggleOrderedList().run(), on: s => s.ordered },
    { key: 'outdent', label: 'Decrease indent', icon: IndentDecrease, fold: 'narrow', run: e => e.chain().focus().liftListItem('listItem').run(), can: s => s.canLift },
    { key: 'indent', label: 'Increase indent', icon: IndentIncrease, fold: 'narrow', run: e => e.chain().focus().sinkListItem('listItem').run(), can: s => s.canSink },
  ],
  [
    { key: 'image', label: 'Insert image', icon: ImagePlus, fold: 'medium', panel: 'image', run: () => undefined },
    // Video and tables belong to the document flow, not inside a table cell.
    { key: 'video', label: 'Insert video', icon: Clapperboard, fold: 'medium', panel: 'video', run: () => undefined, can: s => !s.table },
    { key: 'table', label: 'Insert table', icon: Table, fold: 'medium', panel: 'table', run: () => undefined, can: s => !s.table },
    { key: 'quote', label: 'Block quote', icon: TextQuote, fold: 'medium', run: e => e.chain().focus().toggleBlockquote().run(), on: s => s.quote },
    { key: 'rule', label: 'Horizontal line', icon: SeparatorHorizontal, fold: 'medium', run: e => e.chain().focus().setHorizontalRule().run() },
  ],
]

/** Width of the editor itself (not the viewport): it decides how much of the toolbar fits on one row. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

const folded = (fold: Fold, width: number) => (fold === 'narrow' ? width < 560 : fold === 'medium' ? width < 700 : false)

function ToolbarButton({ tool, s, current, onFocusTool, onPress, disabled }: {
  tool: Tool; s: Snapshot | null; current: boolean; onFocusTool: (k: string) => void; onPress: () => void; disabled?: boolean
}) {
  const unavailable = disabled || !s || (tool.can ? !tool.can(s) : false)
  const pressed = s && tool.on ? tool.on(s) : undefined
  return (
    <button
      type="button"
      data-tb={tool.key}
      tabIndex={current ? 0 : -1}
      aria-label={tool.label}
      title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
      aria-pressed={pressed}
      aria-disabled={unavailable || undefined}
      onFocus={() => onFocusTool(tool.key)}
      onMouseDown={e => e.preventDefault()}
      onClick={() => { if (!unavailable) onPress() }}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-sm text-foreground motion-bind transition-colors pointer-coarse:size-(--touch-target)',
        'hover:bg-surface aria-disabled:cursor-not-allowed aria-disabled:text-muted aria-disabled:opacity-50 aria-disabled:hover:bg-transparent',
        'aria-pressed:bg-primary-soft aria-pressed:text-primary',
      )}
    >
      <Icon icon={tool.icon} className="size-4" />
    </button>
  )
}

const Separator = () => <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border-strong/40" />

export default function RichTextEditor({ id, label, value, onChange, disabled, maxLength, describedBy, invalid, placeholder, uploadImage }: RichTextEditorProps) {
  const { ref: rootRef, width } = useWidth()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [focusKey, setFocusKey] = useState('bold')
  const [panel, setPanel] = useState<Panel>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [stats, setStats] = useState(() => ({ text: '' }))
  const lastEmitted = useRef(value)
  // Alt+F10 lands on the tool last focused; refs keep the handler stable for the editor's keymap.
  const focusKeyRef = useRef('bold')
  const focusToolbar = useRef(() => {
    const root = toolbarRef.current
    const el = root?.querySelector<HTMLElement>(`[data-tb="${focusKeyRef.current}"]`) ?? root?.querySelector<HTMLElement>('[data-tb]')
    el?.focus()
  })
  useEffect(() => { focusKeyRef.current = focusKey }, [focusKey])

  const editor = useEditor({
    extensions: richTextExtensions(placeholder),
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        ...(label ? { 'aria-label': label } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        class: 'rich-text min-h-48 px-4 py-3 text-base outline-none focus-visible:outline-none focus-visible:shadow-none',
      },
      // Alt+F10 moves to the toolbar (as in CKEditor); Ctrl+K opens the link form.
      handleKeyDown: (_view, event) => {
        if (event.altKey && event.key === 'F10') { event.preventDefault(); focusToolbar.current(); return true }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPanel('link'); return true }
        return false
      },
    },
    onCreate: ({ editor: e }) => setStats(sanitizeRichText(e.getHTML())),
    onUpdate: ({ editor: e }) => {
      const out = sanitizeRichText(e.getHTML())
      lastEmitted.current = out.html
      setStats(out)
      onChange(out)
    },
  })
  const s = useEditorState({ editor, selector: ({ editor: e }) => snapshot(e) })

  // An outside change to the value (a reset, a loaded draft) replaces the document; the editor's own edits do not loop back.
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      lastEmitted.current = value
      editor.commands.setContent(value, { emitUpdate: false })
      setStats(sanitizeRichText(editor.getHTML()))
    }
  }, [editor, value])
  useEffect(() => { editor?.setEditable(!disabled) }, [editor, disabled])
  const over = maxLength !== undefined && stats.text.length > maxLength
  // Invalid state lives on the editable element itself, where assistive tech reads it.
  useEffect(() => {
    const dom = editor?.view.dom
    if (!dom) return
    if (over || invalid) dom.setAttribute('aria-invalid', 'true')
    else dom.removeAttribute('aria-invalid')
  }, [editor, over, invalid])

  const onToolbarKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); setMoreOpen(false); setBlockOpen(false); editor?.commands.focus(); return }
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
    const items = Array.from(toolbarRef.current?.querySelectorAll<HTMLElement>('[data-tb]') ?? []).filter(el => el.offsetParent !== null)
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
    e.preventDefault()
    items[next]?.focus()
  }

  const press = (tool: Tool) => {
    if (!editor) return
    setMoreOpen(false)
    if (tool.panel) setPanel(p => (p === tool.panel ? null : tool.panel!))
    else tool.run(editor)
  }
  const closePanel = () => { setPanel(null); editor?.commands.focus() }

  const textLength = stats.text.length
  const hidden = groups.flat().filter(t => folded(t.fold, width))
  const block = blockStyles.find(b => b.value === s?.block) ?? blockStyles[0]

  return (
    <div
      ref={rootRef}
      className={cn('rich-text-editor flex min-w-0 flex-col rounded-sm border border-border-strong bg-surface focus-within:border-foreground', (over || invalid) && 'border-tone-danger', disabled && 'bg-sunken')}
    >
      <div ref={toolbarRef} role="toolbar" aria-label="Editor toolbar" aria-controls={id} aria-orientation="horizontal" onKeyDown={onToolbarKey} className="flex flex-wrap items-center gap-0.5 border-b border-border bg-sunken px-1 py-1">
        {groups.map((group, gi) => {
          const shown = group.filter(t => !folded(t.fold, width))
          if (!shown.length) return null
          return (
            <div key={gi} className="flex items-center gap-0.5">
              {gi > 0 ? <Separator /> : null}
              {gi === 1 ? (
                <>
                  <Popover
                    label="Text style"
                    open={blockOpen}
                    onOpenChange={o => setBlockOpen(!disabled && o)}
                    className="w-52 p-1"
                    trigger={
                      <button type="button" data-tb="block" tabIndex={focusKey === 'block' ? 0 : -1} onFocus={() => setFocusKey('block')} aria-label={`Text style: ${block.label}`} aria-disabled={disabled || undefined}
                        className="flex h-8 w-32 shrink-0 items-center justify-between gap-1 rounded-sm px-2 text-sm hover:bg-surface aria-disabled:cursor-not-allowed aria-disabled:opacity-50 pointer-coarse:h-(--touch-target)">
                        <span className="truncate">{block.label}</span><Icon icon={ChevronDown} className="size-3.5 text-muted" />
                      </button>
                    }
                  >
                    <div role="menu" aria-label="Text style" className="flex flex-col">
                      {blockStyles.map(b => (
                        <button key={b.value} type="button" role="menuitemradio" aria-checked={b.value === s?.block}
                          onClick={() => {
                            setBlockOpen(false)
                            if (!editor || disabled) return
                            if (b.value === 'p') editor.chain().focus().setParagraph().run()
                            else editor.chain().focus().setHeading({ level: b.value === 'h3' ? 3 : 4 }).run()
                          }}
                          className={cn('rounded-sm px-3 py-2 text-left hover:bg-sunken aria-checked:bg-primary-soft', b.preview)}>
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </Popover>
                  <Separator />
                </>
              ) : null}
              {shown.map(t => <ToolbarButton key={t.key} tool={t} s={s} current={focusKey === t.key} onFocusTool={setFocusKey} onPress={() => press(t)} disabled={disabled} />)}
            </div>
          )
        })}
        {hidden.length ? (
          <div className="ml-auto flex items-center">
            <Popover
              label="More tools"
              align="end"
              open={moreOpen}
              onOpenChange={setMoreOpen}
              className="w-60 p-1"
              trigger={
                <button type="button" data-tb="more" tabIndex={focusKey === 'more' ? 0 : -1} onFocus={() => setFocusKey('more')} aria-label="Show more items" title="Show more items"
                  className="grid size-8 place-items-center rounded-sm hover:bg-surface aria-expanded:bg-surface pointer-coarse:size-(--touch-target)">
                  <Icon icon={EllipsisVertical} className="size-4" />
                </button>
              }
            >
              <div role="menu" aria-label="More tools" className="flex flex-col">
                {hidden.map(t => {
                  const unavailable = disabled || !s || (t.can ? !t.can(s) : false)
                  const on = s && t.on ? t.on(s) : false
                  return (
                    <button key={t.key} type="button" role={t.on ? 'menuitemcheckbox' : 'menuitem'} aria-checked={t.on ? on : undefined} aria-disabled={unavailable || undefined}
                      onClick={() => { if (!unavailable) press(t) }}
                      className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-md hover:bg-sunken aria-checked:bg-primary-soft aria-checked:text-primary aria-disabled:cursor-not-allowed aria-disabled:text-muted">
                      <Icon icon={t.icon} className="size-4" />{t.label}
                    </button>
                  )
                })}
              </div>
            </Popover>
          </div>
        ) : null}
      </div>

      {editor && panel ? (
        <div className="animate-reveal border-b border-border bg-surface px-3 py-3" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); closePanel() } }}>
          {panel === 'link' ? <LinkForm editor={editor} s={s} onDone={closePanel} /> : null}
          {panel === 'image' ? <ImageForm editor={editor} editing={s?.image ?? null} uploadImage={uploadImage} onDone={closePanel} /> : null}
          {panel === 'video' ? <VideoForm editor={editor} onDone={closePanel} /> : null}
          {panel === 'table' ? <TableForm editor={editor} onDone={closePanel} /> : null}
        </div>
      ) : editor && s ? <ContextBar editor={editor} s={s} onEdit={setPanel} disabled={disabled} /> : null}

      <EditorContent editor={editor} className="min-w-0" />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-sunken px-3 py-1.5 text-xs text-muted">
        <span>Alt+F10 for the toolbar</span>
        <span className="flex items-center gap-3 tabular">
          <span>{wordCount(stats.text).toLocaleString('en-KE')} words</span>
          {maxLength !== undefined ? (
            <span className={cn(over && 'font-semibold text-tone-danger')}>{textLength.toLocaleString('en-KE')} / {maxLength.toLocaleString('en-KE')} characters</span>
          ) : <span>{textLength.toLocaleString('en-KE')} characters</span>}
        </span>
        <span role="status" className="sr-only">{over ? `Over the limit by ${(textLength - maxLength!).toLocaleString('en-KE')} characters` : ''}</span>
      </div>
    </div>
  )
}

/** The selected object's own tools, shown between the toolbar and the text, like CKEditor's contextual balloons. */
function ContextBar({ editor, s, onEdit, disabled }: { editor: Editor; s: Snapshot; onEdit: (p: Panel) => void; disabled?: boolean }) {
  const bar = (label: string, detail: ReactNode, actions: ReactNode) => (
    <div role="group" aria-label={`${label} tools`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-surface px-3 py-1.5 text-sm">
      <span className="caps text-muted">{label}</span>
      {detail ? <span className="min-w-0 truncate">{detail}</span> : null}
      <span className="ml-auto flex flex-wrap items-center gap-1">{actions}</span>
    </div>
  )
  const act = (label: string, icon: LucideIcon | null, run: () => void, danger?: boolean) => (
    <Button key={label} size="sm" variant={danger ? 'danger-outline' : 'ghost'} leadingIcon={icon ?? undefined} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={run}>{label}</Button>
  )
  if (s.image) {
    return bar('Image', s.image.alt ? `Alt text: ${s.image.alt}` : 'Decorative, no text alternative', <>
      {act('Edit image', Pencil, () => onEdit('image'))}
      {act('Remove', Trash2, () => editor.chain().focus().deleteSelection().run(), true)}
    </>)
  }
  if (s.media) {
    const embed = embedFor(s.media)
    return bar('Video', embed ? `${embed.name}, ${s.media}` : s.media, act('Remove', Trash2, () => editor.chain().focus().deleteSelection().run(), true))
  }
  if (s.link !== null) {
    return bar('Link', <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">{s.link}<Icon icon={ExternalLink} label="opens in a new tab" /></a>, <>
      {act('Edit link', Pencil, () => onEdit('link'))}
      {act('Remove link', Unlink, () => editor.chain().focus().extendMarkRange('link').unsetLink().run())}
    </>)
  }
  if (s.table) {
    const t = () => editor.chain().focus()
    return bar('Table', null, <>
      {act('Row above', null, () => t().addRowBefore().run())}
      {act('Row below', null, () => t().addRowAfter().run())}
      {act('Column left', null, () => t().addColumnBefore().run())}
      {act('Column right', null, () => t().addColumnAfter().run())}
      {act('Header row', null, () => t().toggleHeaderRow().run())}
      {act('Delete row', null, () => t().deleteRow().run())}
      {act('Delete column', null, () => t().deleteColumn().run())}
      {act('Delete table', Trash2, () => t().deleteTable().run(), true)}
    </>)
  }
  return null
}

function FormRow({ title, onSubmit, onCancel, submit, children }: { title: string; onSubmit: (e: FormEvent) => void; onCancel: () => void; submit: string; children: ReactNode }) {
  return (
    <form onSubmit={onSubmit} aria-label={title} className="flex flex-col gap-3">
      <span className="caps text-muted">{title}</span>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm">{submit}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

/** Adds https:// to a bare domain and mailto: to an email address; anything else is checked as typed. */
function normaliseHref(raw: string) {
  const v = raw.trim()
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(v)) return `mailto:${v}`
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('/')) return v
  return `https://${v}`
}

function LinkForm({ editor, s, onDone }: { editor: Editor; s: Snapshot | null; onDone: () => void }) {
  const editing = s?.link ?? null
  const needsText = !editing && (s?.empty ?? true)
  const [href, setHref] = useState(editing ?? '')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | undefined>()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const url = normaliseHref(href)
    if (!href.trim() || !isSafeUrl(url, 'link')) return setError('Enter a web address (https://…), a page on this site (/…) or an email address.')
    if (needsText && !text.trim()) return setError('Enter the text people will click.')
    const chain = editor.chain().focus()
    if (editing) chain.extendMarkRange('link').setLink({ href: url }).run()
    else if (needsText) chain.insertContent({ type: 'text', text: text.trim(), marks: [{ type: 'link', attrs: { href: url } }] }).run()
    else chain.setLink({ href: url }).run()
    onDone()
  }
  return (
    <FormRow title={editing ? 'Edit link' : 'Add link'} submit={editing ? 'Save link' : 'Add link'} onSubmit={submit} onCancel={onDone}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Link address" error={error}>
          <Input value={href} onChange={e => { setHref(e.target.value); setError(undefined) }} placeholder="https://" autoFocus inputMode="url" />
        </FormField>
        {needsText ? <FormField label="Text to display"><Input value={text} onChange={e => { setText(e.target.value); setError(undefined) }} /></FormField> : null}
      </div>
    </FormRow>
  )
}

function ImageForm({ editor, editing, uploadImage, onDone }: { editor: Editor; editing: ImageAttrs | null; uploadImage?: (f: File) => Promise<string>; onDone: () => void }) {
  const [src, setSrc] = useState(editing?.src ?? '')
  const [alt, setAlt] = useState(editing?.alt ?? '')
  const [decorative, setDecorative] = useState(Boolean(editing && !editing.alt))
  const [caption, setCaption] = useState(editing?.caption ?? '')
  const [errors, setErrors] = useState<{ src?: string; alt?: string }>({})
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadHelp = useId()

  const upload = async (file: File | undefined) => {
    if (!file || !uploadImage) return
    if (!IMAGE_TYPES.includes(file.type)) return setErrors({ src: 'Upload a JPEG, PNG or WebP image.' })
    if (file.size > limits.maxUploadBytes) return setErrors({ src: `Images can be up to ${formatBytes(limits.maxUploadBytes)}.` })
    setUploading(true)
    try { setSrc(await uploadImage(file)); setErrors({}) } catch { setErrors({ src: 'The upload did not finish. Try again, or add the image by its address.' }) } finally { setUploading(false) }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!isSafeUrl(src, 'image')) next.src = 'Use an https address, or an image already on this site.'
    if (!decorative && !alt.trim()) next.alt = 'Describe the image for people who cannot see it, or mark it as decorative.'
    setErrors(next)
    if (next.src || next.alt) return
    const attrs: ImageAttrs = { src: src.trim(), alt: decorative ? '' : alt.trim(), caption: caption.trim() }
    if (editing) editor.chain().focus().updateAttributes('figureImage', attrs).run()
    else editor.chain().focus().insertContent({ type: 'figureImage', attrs }).run()
    onDone()
  }
  return (
    <FormRow title={editing ? 'Edit image' : 'Insert image'} submit={editing ? 'Save image' : 'Insert image'} onSubmit={submit} onCancel={onDone}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Image address" error={errors.src} help="An https address, or an image already on this site.">
          <Input value={src} onChange={e => { setSrc(e.target.value); setErrors(x => ({ ...x, src: undefined })) }} placeholder="https://" autoFocus inputMode="url" />
        </FormField>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Or upload</span>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" tabIndex={-1} onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} />
          <Button type="button" variant="secondary" size="md" leadingIcon={Upload} loading={uploading} loadingLabel="Uploading…" disabled={!uploadImage} aria-describedby={uploadHelp} onClick={() => fileRef.current?.click()} className="self-start">Upload from this device</Button>
          <span id={uploadHelp} className="text-sm text-muted">{uploadImage ? `JPEG, PNG or WebP up to ${formatBytes(limits.maxUploadBytes)}.` : 'Uploads open when media storage is connected. Add the image by its address for now.'}</span>
        </div>
        <FormField label="Text alternative" error={errors.alt} help="What the image shows, for screen readers and when it cannot load.">
          <Input value={alt} disabled={decorative} onChange={e => { setAlt(e.target.value); setErrors(x => ({ ...x, alt: undefined })) }} />
        </FormField>
        <FormField label="Caption (optional)">
          <Input value={caption} onChange={e => setCaption(e.target.value)} maxLength={200} />
        </FormField>
      </div>
      <Checkbox label="Decorative image" description="It adds nothing a reader would miss, so screen readers skip it." checked={decorative} onCheckedChange={v => { setDecorative(v === true); setErrors(x => ({ ...x, alt: undefined })) }} />
      {src && isSafeUrl(src, 'image') ? (
        // A plain img: the preview is the address being typed, not an optimised asset.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src.trim()} alt="" className="max-h-40 max-w-60 self-start border border-border bg-well object-contain p-2" />
      ) : null}
    </FormRow>
  )
}

function VideoForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | undefined>()
  const canonical = canonicalVideoUrl(url)
  const embed = canonical ? embedFor(canonical) : null
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canonical) return setError('Paste a link to a YouTube or Vimeo video.')
    editor.chain().focus().insertContent({ type: 'mediaEmbed', attrs: { url: canonical } }).run()
    onDone()
  }
  return (
    <FormRow title="Insert video" submit="Insert video" onSubmit={submit} onCancel={onDone}>
      <FormField label="Video link" error={error} help={embed ? `${embed.name} video found. It plays from ${embed.name} only when a reader presses play.` : 'A YouTube or Vimeo link, from the address bar or the Share button.'}>
        <Input value={url} onChange={e => { setUrl(e.target.value); setError(undefined) }} placeholder="https://www.youtube.com/watch?v=…" autoFocus inputMode="url" />
      </FormField>
    </FormRow>
  )
}

const GRID_ROWS = 6
const GRID_COLS = 8

/** CKEditor's size grid: point at a cell to choose rows and columns. Arrow keys move through it. */
function TableForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [hover, setHover] = useState({ rows: 2, cols: 3 })
  const [header, setHeader] = useState(true)
  const gridRef = useRef<HTMLDivElement>(null)
  const insert = (rows: number, cols: number) => { editor.chain().focus().insertTable({ rows, cols, withHeaderRow: header }).run(); onDone() }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    const rows = Math.min(GRID_ROWS, Math.max(1, hover.rows + m[0]))
    const cols = Math.min(GRID_COLS, Math.max(1, hover.cols + m[1]))
    setHover({ rows, cols })
    gridRef.current?.querySelector<HTMLElement>(`[data-cell="${rows}-${cols}"]`)?.focus()
  }
  return (
    <div className="flex flex-col gap-3">
      <span className="caps text-muted">Insert table</span>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col gap-2">
          <div ref={gridRef} role="grid" aria-label="Table size" onKeyDown={onKey} className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1.25rem)` }}>
            {Array.from({ length: GRID_ROWS }, (_, r) => Array.from({ length: GRID_COLS }, (_, c) => {
              const rows = r + 1, cols = c + 1
              const lit = rows <= hover.rows && cols <= hover.cols
              return (
                <button key={`${rows}-${cols}`} type="button" data-cell={`${rows}-${cols}`} tabIndex={rows === hover.rows && cols === hover.cols ? 0 : -1}
                  aria-label={`${rows} by ${cols} table`} onMouseEnter={() => setHover({ rows, cols })} onFocus={() => setHover({ rows, cols })} onClick={() => insert(rows, cols)}
                  className={cn('size-5 rounded-xs border', lit ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface')} />
              )
            }))}
          </div>
          <span className="text-sm tabular" aria-live="polite">{hover.rows} × {hover.cols} table</span>
        </div>
        <div className="flex flex-col gap-3">
          <Checkbox label="First row is a header" checked={header} onCheckedChange={v => setHeader(v === true)} />
          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" onClick={() => insert(hover.rows, hover.cols)}>Insert {hover.rows} × {hover.cols}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
