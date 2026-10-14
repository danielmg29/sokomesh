'use client'

import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'

export type Crumb = { label: string; href?: string }

/**
 * Route and record labels come from metadata. `collapsed` folds the middle into a menu,
 * `compact` shows only the parent as a back link.
 */
export function Breadcrumbs({ items, variant = 'full', className }: { items: readonly Crumb[]; variant?: 'full' | 'compact' | 'collapsed'; className?: string }) {
  if (!items.length) return null
  if (variant === 'compact') {
    const parent = items.at(-2)
    return parent?.href ? (
      <nav aria-label="Breadcrumb" className={className}>
        <a href={parent.href} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <Icon icon={ChevronRight} className="rotate-180" />{parent.label}
        </a>
      </nav>
    ) : null
  }
  const fold = variant === 'collapsed' && items.length > 3
  const visible = fold ? [items[0]!, ...items.slice(-2)] : items
  const hidden = fold ? items.slice(1, -2) : []
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted">
        {visible.map((c, i) => {
          const last = i === visible.length - 1
          return (
            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {c.href && !last ? <a href={c.href} className="truncate hover:text-foreground hover:underline">{c.label}</a> : <span aria-current={last ? 'page' : undefined} className={cn('truncate', last && 'font-medium text-foreground')}>{c.label}</span>}
              {!last ? <Icon icon={ChevronRight} className="text-border-strong" /> : null}
              {fold && i === 0 ? (
                <>
                  <Menu>
                    <MenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Show ${hidden.length} more levels`}><Icon icon={MoreHorizontal} /></Button></MenuTrigger>
                    <MenuContent align="start">{hidden.map(h => <MenuItem key={h.label} asChild><a href={h.href}>{h.label}</a></MenuItem>)}</MenuContent>
                  </Menu>
                  <Icon icon={ChevronRight} className="text-border-strong" />
                </>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
