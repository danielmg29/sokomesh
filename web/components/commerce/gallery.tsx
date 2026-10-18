'use client'

// Product photographs as one large picture that adapts to how many there are (after the storefront
// references and large marketplaces): one photograph fills the frame; two or more add a thumbnail rail,
// down the side on wide containers and along the bottom on narrow ones, with previous and next, arrow keys,
// swipe and a larger view. Cut-outs sit on the theme's well; scene photographs fill the frame.

import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { IconButton } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'

export type GalleryImage = {
  url: string; alt: string; width?: number; height?: number
  /** Photographer credit, shown under the picture. */
  credit?: string
  /** `contain` for cut-outs on the well, `cover` for photographs that fill the frame. */
  fit?: 'contain' | 'cover'
}

function Picture({ image, sizes, priority, className }: { image: GalleryImage; sizes: string; priority?: boolean; className?: string }) {
  return (
    <Image src={image.url} alt={image.alt} fill sizes={sizes} preload={priority}
      className={cn(image.fit === 'cover' ? 'object-cover' : 'object-contain p-[10%]', className)} />
  )
}

export function ProductGallery({ images, name }: { images: readonly GalleryImage[]; name: string }) {
  const [index, setIndex] = useState(0)
  const [large, setLarge] = useState(false)
  const swipe = useRef<number | null>(null)
  const count = images.length
  if (!count) return <div className="aspect-square bg-well" aria-hidden="true" />
  const current = images[index] ?? images[0]!
  const go = (step: number) => setIndex(i => (i + step + count) % count)
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
  }
  const onPointerDown = (e: PointerEvent) => { if (e.pointerType !== 'mouse') swipe.current = e.clientX }
  const onPointerUp = (e: PointerEvent) => {
    if (swipe.current === null) return
    const dx = e.clientX - swipe.current
    swipe.current = null
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
  }
  const many = count > 1

  return (
    // The section is the container; the grid inside asks how wide the gallery itself is, not the page.
    <section aria-roledescription="carousel" aria-label={`Photos of ${name}`} className="@container">
      <div className={cn('grid gap-3', many && '@xl:grid-cols-[5.5rem_minmax(0,1fr)]')}>
      <div className={cn('relative flex flex-col gap-2', many && '@xl:order-2')}>
        <div
          className="group relative aspect-square overflow-hidden border border-border bg-well outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-contrast"
          tabIndex={many ? 0 : -1}
          onKeyDown={many ? onKey : undefined}
          onPointerDown={many ? onPointerDown : undefined}
          onPointerUp={many ? onPointerUp : undefined}
          aria-live="polite"
        >
          {/* Every photograph is layered in the frame and the chosen one fades up, so changing photos never
              waits on a download; the gallery is bounded (contract maxItems), so this stays a few images. */}
          {images.map((image, i) => (
            <div key={image.url} aria-hidden={i !== index} className={cn('absolute inset-0 motion-bind transition-opacity', i === index ? 'opacity-100' : 'opacity-0')}>
              <Picture image={image} sizes="(min-width: 1024px) 50vw, 100vw" priority={i === 0} />
            </div>
          ))}
          {many ? (
            <span className="absolute top-3 left-3 border border-border bg-surface/90 px-2 py-0.5 text-sm font-semibold tabular">
              {index + 1} / {count}
            </span>
          ) : null}
          <div className="absolute right-3 bottom-3 flex gap-1.5">
            {many ? (
              <>
                <IconButton icon={ChevronLeft} label="Previous photo" variant="secondary" onClick={() => go(-1)} />
                <IconButton icon={ChevronRight} label="Next photo" variant="secondary" onClick={() => go(1)} />
              </>
            ) : null}
            <IconButton icon={Expand} label="View larger" variant="secondary" onClick={() => setLarge(true)} />
          </div>
        </div>
        <p className="min-h-5 text-sm text-muted">{current.credit ?? current.alt}</p>
      </div>

      {many ? (
        <ul className="flex gap-2 overflow-x-auto pb-1 @xl:order-1 @xl:max-h-[calc(100cqw-6.25rem)] @xl:flex-col @xl:overflow-x-visible @xl:overflow-y-auto @xl:pb-0" aria-label="Choose a photo">
          {images.map((image, i) => (
            <li key={image.url} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-current={i === index ? 'true' : undefined}
                aria-label={`Photo ${i + 1} of ${count}: ${image.alt}`}
                className={cn('relative block size-20 overflow-hidden border bg-well motion-bind transition-[border-color,opacity] @xl:size-[5.5rem]',
                  i === index ? 'border-2 border-primary' : 'border-border opacity-75 hover:opacity-100')}>
                <Picture image={image} sizes="88px" className={image.fit === 'cover' ? '' : 'p-[8%]'} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      </div>

      <Dialog open={large} onOpenChange={setLarge} title={name} description={current.credit ?? current.alt} size="lg">
        <div className="relative aspect-[4/3] bg-well" onKeyDown={many ? onKey : undefined}>
          <Picture image={current} sizes="(min-width: 768px) 48rem, 100vw" />
          {many ? (
            <div className="absolute right-3 bottom-3 flex gap-1.5">
              <IconButton icon={ChevronLeft} label="Previous photo" variant="secondary" onClick={() => go(-1)} />
              <IconButton icon={ChevronRight} label="Next photo" variant="secondary" onClick={() => go(1)} />
            </div>
          ) : null}
        </div>
      </Dialog>
    </section>
  )
}
