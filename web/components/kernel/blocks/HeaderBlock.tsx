import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { ModelMeta, Rec } from '@/lib/contract/types'
import { StatusBadge } from '../feedback/StatusBadge'
import { Breadcrumbs, type Crumb } from '../nav/Breadcrumbs'
import { displayOf } from '@/lib/contract/display'

type Props = {
  /** meta: the collection's plural label; record: the record's display field and status; explicit: given title. */
  source: 'meta' | 'record' | 'explicit'
  meta?: ModelMeta
  record?: Rec
  title?: ReactNode
  description?: ReactNode
  count?: number
  status?: ReactNode
  actions?: ReactNode
  breadcrumbs?: readonly Crumb[]
  variant?: 'standard' | 'compact'
  /** 1 when the header titles the page (one per route); 2 inside a page. */
  level?: 1 | 2
  className?: string
}

export function HeaderBlock({ source, meta, record, title, description, count, status, actions, breadcrumbs, variant = 'standard', level = 2, className }: Props) {
  const Heading = level === 1 ? 'h1' : 'h2'
  const statusField = meta?.fields.find(f => f.widget === 'status')
  const heading =
    source === 'meta' ? meta?.labelPlural ?? meta?.label
    : source === 'record' && meta && record ? displayOf(meta, record)
    : title
  const badge = status ?? (source === 'record' && statusField && record ? <StatusBadge field={statusField} value={record[statusField.name]} /> : null)
  return (
    <header className={cn('flex flex-col gap-3', variant === 'compact' && 'gap-1.5', className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} variant={variant === 'compact' ? 'compact' : 'full'} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <Heading className={cn('font-display font-extrabold tracking-display', variant === 'compact' ? 'text-2xl' : 'text-3xl sm:text-4xl')}>{heading}</Heading>
            {badge}
            {count !== undefined ? <span className="text-md text-muted tabular">{count.toLocaleString('en-KE')} {count === 1 ? meta?.label.toLowerCase() : (meta?.labelPlural ?? '').toLowerCase()}</span> : null}
          </div>
          {description ? <p className="max-w-2xl text-md text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
