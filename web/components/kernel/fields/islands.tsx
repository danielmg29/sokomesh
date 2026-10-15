'use client'

import { Check, Copy, Play } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Icon } from '@/components/ui/icon'
import { formatDateTime, formatRelative } from '@/lib/format'
import { embedFor } from '@/lib/richtext'

/** Copy a machine identifier (SKU, TXN, URL) with a polite confirmation. */
export function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard?.writeText(value).then(() => setCopied(true)) }}
      className="grid size-6 shrink-0 place-items-center rounded-xs text-muted hover:bg-sunken hover:text-foreground"
      aria-label={label}
      title={label}
    >
      <Icon icon={copied ? Check : Copy} className={copied ? 'text-tone-success' : undefined} />
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </button>
  )
}

// One shared minute clock for every relative timestamp on the page (bounded: a single
// interval, cleared when the last subscriber unmounts).
let current: string | undefined
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    current = new Date().toISOString()
    timer = setInterval(() => { current = new Date().toISOString(); listeners.forEach(l => l()) }, 60_000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size && timer) { clearInterval(timer); timer = undefined }
  }
}
const getSnapshot = () => (current ??= new Date().toISOString())
const getServerSnapshot = () => undefined

/**
 * Relative label with the absolute timestamp for assistive tech and hover. Server render
 * and hydration show the absolute form, so they always agree; `now` pins the clock.
 */
export function RelativeTime({ iso, now }: { iso: string; now?: string }) {
  const live = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const clock = now ?? live
  const absolute = formatDateTime(iso)
  return (
    <time dateTime={iso} title={absolute} className="tabular whitespace-nowrap">
      {clock ? (
        <>
          <span aria-hidden="true">{formatRelative(iso, clock)}</span>
          <span className="sr-only">{absolute}</span>
        </>
      ) : absolute}
    </time>
  )
}

/**
 * A stored video reference (figure.media > oembed) as a click-to-play card. Nothing loads from the
 * provider until the reader presses play, so a product page makes no third-party request by default;
 * the player is the provider's privacy-enhanced one (youtube-nocookie, Vimeo with do-not-track).
 */
export function VideoEmbed({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  const embed = embedFor(url)
  if (!embed) return null
  const src = `${embed.player}${embed.player.includes('?') ? '&' : '?'}autoplay=1`
  return (
    <figure className="media">
      <div className="relative aspect-video w-full overflow-hidden border border-border bg-chrome">
        {playing ? (
          <iframe src={src} title={`${embed.name} video`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 size-full" />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="on-chrome group absolute inset-0 flex flex-col items-center justify-center gap-3 text-chrome-foreground">
            <span className="grid size-14 place-items-center rounded-sm bg-signal text-signal-foreground motion-bind transition-transform group-active:translate-y-px"><Icon icon={Play} className="size-6" /></span>
            <span className="text-md font-semibold">Play video from {embed.name}</span>
            <span className="text-xs text-chrome-muted">Loads the {embed.name} player, which may set its own cookies.</span>
          </button>
        )}
      </div>
    </figure>
  )
}
