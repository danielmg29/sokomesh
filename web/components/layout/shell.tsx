import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Authenticated app shell: navigation rail + header + main. The main column carries
 * min-w-0 so one wide table never makes the whole shell scroll (manual 6.11).
 */
export function AppShell({ nav, header, children, collapsed = false, className }: { nav: ReactNode; header?: ReactNode; children: ReactNode; collapsed?: boolean; className?: string }) {
  return (
    <div className={cn('grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-[auto_minmax(0,1fr)]', className)}>
      <div className={cn('hidden border-r border-border bg-surface lg:block', collapsed ? 'w-16' : 'w-64')}>{nav}</div>
      <div className="flex min-w-0 flex-col">
        {header}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
