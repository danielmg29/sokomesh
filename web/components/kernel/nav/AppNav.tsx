'use client'

import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Tooltip } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'

export type NavItem = { key: string; label: string; href: string; icon?: LucideIcon; count?: number; group?: string }

type Props = {
  /** Already filtered by the viewer's policies on the server; the nav never decides access. */
  items: readonly NavItem[]
  current?: string
  brand?: ReactNode
  context?: ReactNode
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Group headings in the contract's order; flat when omitted. */
  grouped?: boolean
}

function groupsOf(items: readonly NavItem[], grouped: boolean) {
  if (!grouped) return [{ name: '', items }]
  const order: string[] = []
  const map = new Map<string, NavItem[]>()
  for (const i of items) {
    const g = i.group ?? ''
    if (!map.has(g)) { map.set(g, []); order.push(g) }
    map.get(g)!.push(i)
  }
  return order.map(name => ({ name, items: map.get(name)! }))
}

function NavList({ items, current, collapsed, grouped }: { items: readonly NavItem[]; current?: string; collapsed: boolean; grouped: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {groupsOf(items, grouped).map(g => (
        <div key={g.name || 'all'} className="flex flex-col gap-0.5">
          {g.name && !collapsed ? <p className="caps px-2.5 pb-1 text-muted">{g.name}</p> : null}
          <ul className="flex flex-col gap-0.5">
            {g.items.map(i => {
              const active = i.key === current
              const link = (
                <a
                  href={i.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-md text-foreground motion-bind transition-colors hover:bg-sunken',
                    active && 'bg-primary-soft font-semibold text-primary hover:bg-primary-soft',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  {i.icon ? <Icon icon={i.icon} className="size-4.5" /> : null}
                  <span className={cn('flex-1 truncate', collapsed && 'sr-only')}>{i.label}</span>
                  {i.count !== undefined && !collapsed ? <Badge emphasis={active ? 'strong' : 'quiet'}>{i.count}</Badge> : null}
                </a>
              )
              return <li key={i.key}>{collapsed ? <Tooltip content={i.label} side="right">{link}</Tooltip> : link}</li>
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Navigation derived from the contract's models and the viewer's role. */
export function AppNav({ items, current, brand, context, collapsed = false, onCollapsedChange, grouped = true }: Props) {
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-4 p-3">
      <div className={cn('flex items-center gap-2', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed ? brand : null}
        {onCollapsedChange ? (
          <Button variant="ghost" size="icon-sm" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed} onClick={() => onCollapsedChange(!collapsed)}>
            <Icon icon={collapsed ? PanelLeftOpen : PanelLeftClose} />
          </Button>
        ) : null}
      </div>
      {context && !collapsed ? <div className="rounded-sm border border-border bg-sunken px-2.5 py-2 text-sm">{context}</div> : null}
      <NavList items={items} current={current} collapsed={collapsed} grouped={grouped} />
    </nav>
  )
}

/** The same navigation in a sheet for narrow containers. */
export function MobileNav({ items, current, brand, context, grouped = true }: Omit<Props, 'collapsed' | 'onCollapsedChange'>) {
  return (
    <Sheet
      side="left"
      title={brand ?? 'Menu'}
      trigger={<Button variant="secondary" size="icon" aria-label="Open navigation"><Icon icon={MenuIcon} /></Button>}
    >
      {context ? <div className="mb-4 rounded-sm border border-border bg-sunken px-2.5 py-2 text-sm">{context}</div> : null}
      <NavList items={items} current={current} collapsed={false} grouped={grouped} />
    </Sheet>
  )
}
