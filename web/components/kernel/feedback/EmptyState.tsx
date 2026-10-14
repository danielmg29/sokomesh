import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type EmptyKind = 'no-data' | 'no-results' | 'no-related' | 'no-config'

/** The open crate from the mark, drawn as an empty outline: a UNIT with nothing in it. */
function EmptyCrate({ kind }: { kind: EmptyKind }) {
  return (
    <svg viewBox="0 0 48 48" className="size-12 text-border-strong" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="miter" aria-hidden="true">
      <path d="M8 21l16 8 16-8v15L24 44 8 36z" />
      <path d="M8 21l16 8-6 4L5 27zM40 21l-16 8 6 4 13-6z" />
      {kind === 'no-results' ? <path d="M30 6l-12 12M18 6l12 12" className="text-tone-warning" stroke="currentColor" /> : null}
      {kind === 'no-config' ? <path d="M24 5v10M19 10h10" /> : null}
      {kind === 'no-data' || kind === 'no-related' ? <path d="M16 14h16" strokeDasharray="3 3" /> : null}
    </svg>
  )
}

type Props = {
  kind: EmptyKind
  title: string
  /** What this means and what can be done next, in plain commercial language. */
  description?: ReactNode
  /** Only actions the viewer is permitted to take. */
  action?: ReactNode
  size?: 'block' | 'inline'
  className?: string
}

export function EmptyState({ kind, title, description, action, size = 'block', className }: Props) {
  return (
    <div
      role="status"
      className={cn(
        'flex gap-4',
        size === 'block' ? 'flex-col items-center px-6 py-10 text-center' : 'items-start px-4 py-4 text-left',
        className,
      )}
    >
      <EmptyCrate kind={kind} />
      <div className={cn('flex flex-col gap-1.5', size === 'block' && 'max-w-md items-center')}>
        <p className="font-display text-lg font-bold">{title}</p>
        {description ? <p className="text-md text-muted">{description}</p> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  )
}
