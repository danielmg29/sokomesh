import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { MouseEvent } from 'react'
import { buttonStyles } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

/**
 * Cursor pager for crawlable lists (public category and search pages): previous and next are
 * real links carrying the cursor in the URL, so every page is addressable and indexable. Cursor
 * pagination has no page numbers; the range says where the reader is. With `onNavigate` the links
 * still carry their addresses, but a click turns the page in place (the listing is live), so
 * crawlers and new tabs get the link and readers keep their filters. In-app tables use TablePager.
 */
export function Pagination({ from, to, total, noun, prevHref, nextHref, onNavigate, className }: {
  from: number; to: number; total?: number; noun: { one: string; other: string }; prevHref?: string; nextHref?: string
  onNavigate?: (dir: 'prev' | 'next') => void; className?: string
}) {
  const n = (v: number) => v.toLocaleString('en-KE')
  const label = (total ?? to) === 1 ? noun.one : noun.other
  const link = (href: string | undefined, dir: 'prev' | 'next') => {
    const content = dir === 'prev' ? <><Icon icon={ArrowLeft} />Previous</> : <>Next<Icon icon={ArrowRight} /></>
    const cls = buttonStyles({ variant: 'secondary', size: 'md' })
    // Modified clicks (new tab, new window) keep the link's own behaviour.
    const turn = onNavigate ? (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      onNavigate(dir)
    } : undefined
    return href
      ? <a href={href} rel={dir} className={cls} onClick={turn}>{content}</a>
      : <span aria-disabled="true" className={cn(cls, 'pointer-events-none')}>{content}</span>
  }
  return (
    <nav aria-label="Pages" className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-md text-muted tabular" aria-live="polite">
        Showing <span className="font-semibold text-foreground">{n(from)}</span> to <span className="font-semibold text-foreground">{n(to)}</span>
        {total !== undefined ? <> of <span className="font-semibold text-foreground">{n(total)}</span></> : null} {label}
      </p>
      <div className="flex gap-2">{link(prevHref, 'prev')}{link(nextHref, 'next')}</div>
    </nav>
  )
}
