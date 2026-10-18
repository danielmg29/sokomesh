import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A ledger section for account and organization pages: the title and what it is for on the left, the
 * controls on the right, ruled off from the next section rather than boxed. Stacks below the container's
 * medium width.
 */
export function PageSection({ id, title, description, actions, children, className }: {
  id?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn('grid scroll-mt-24 grid-cols-1 gap-x-10 gap-y-4 border-t border-border-strong pt-6 @3xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]', className)}>
      <div className="flex flex-col gap-1.5">
        <h2 id={id ? `${id}-title` : undefined} className="font-display text-xl font-bold tracking-display">{title}</h2>
        {description ? <p className="max-w-[46ch] text-md text-muted text-pretty">{description}</p> : null}
        {actions ? <div className="mt-2 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}
