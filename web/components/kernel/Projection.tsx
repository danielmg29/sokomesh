import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { ModelMeta, Rec } from '@/lib/contract/types'
import { ActionBar, ActionMenu, type RunAction } from './actions/ActionBar'
import { StatusBadge } from './feedback/StatusBadge'
import { FieldView } from './fields/FieldView'
import { Empty } from './fields/views'
import type { FieldContext } from './fields/types'
import { card, resolveRecipe, type CardVariants, type RecipeContext, type RecipeOverride } from './recipes/recipes'
import { resolveSlots, type Filled } from './slots/resolve'

type Props = {
  meta: ModelMeta
  record: Rec
  context: RecipeContext
  override?: RecipeOverride
  pref?: Partial<CardVariants>
  onRun?: RunAction
  pending?: string | null
  /** Link target for the title (detail route or sheet). */
  href?: string
  now?: string
  /** Extra region rendered after meta: project extensions (stock, price tiers) slot in here. */
  extra?: ReactNode
  className?: string
}

const fieldCtx = (density: CardVariants['density'], intent: CardVariants['intent']): FieldContext =>
  intent === 'row' || intent === 'audit' || density === 'compact' ? 'compact' : density

/** The title's words: a relation reads as its label (the record's own name), never as an object. */
const titleText = (slot?: Filled): string | null => {
  const v = slot?.value
  const s = v && typeof v === 'object' && 'label' in v ? (v as { label: unknown }).label : v
  return s == null || s === '' ? null : String(s)
}

function Title({ slot, href, as: As = 'h3', className }: { slot?: Filled; href?: string; as?: 'h3' | 'p' | 'span'; className?: string }) {
  const text = titleText(slot) ?? <Empty />
  return (
    <As className={cn('min-w-0 font-semibold text-foreground', className)}>
      {href ? <Link href={href as Route} className="after:absolute after:inset-0 hover:underline focus-visible:outline-none">{text}</Link> : text}
    </As>
  )
}

/** The record's commercial quantity, large and tabular, labelled by its field so the unit is never implied. */
function Figure({ slot, size, align = 'start' }: { slot?: Filled; size: 'md' | 'lg' | 'xl'; align?: 'start' | 'end' }) {
  if (!slot) return null
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', align === 'end' && 'items-end text-right')}>
      <span className={cn('font-display font-extrabold leading-tight', size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-2xl' : 'text-lg')}>
        <FieldView field={slot.field} value={slot.value} context="comfortable" />
      </span>
      <span className="text-xs text-muted">{slot.field.label}</span>
    </div>
  )
}

// In a merchandised cell, text values speak for themselves ("Bale of 12 × 2 kg"); numbers and quantities keep
// their label ("Minimum order 5 packs"). Read from the widget, so no field name is involved.
const SELF_EVIDENT = new Set(['text', 'textarea', 'select', 'relation', 'unit'])

function MetaList({ items, ctx, now, layout }: { items: Filled[]; ctx: FieldContext; now?: string; layout: 'inline' | 'stack' | 'grid' | 'values' }) {
  if (!items.length) return null
  if (layout === 'values') {
    return (
      <dl className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
        {items.map(s => (
          <div key={s.field.name} className="flex min-w-0 items-baseline gap-1">
            <dt className={cn(SELF_EVIDENT.has(s.field.widget) && 'sr-only')}>{s.field.label}</dt>
            <dd className="min-w-0"><FieldView field={s.field} value={s.value} context="compact" now={now} /></dd>
          </div>
        ))}
      </dl>
    )
  }
  return (
    <dl className={cn(
      layout === 'inline' && 'flex flex-wrap gap-x-4 gap-y-1 text-sm',
      layout === 'stack' && 'flex flex-col gap-1.5',
      layout === 'grid' && 'grid grid-cols-1 gap-x-6 gap-y-4 @xl:grid-cols-2',
    )}>
      {items.map(s => (
        <div key={s.field.name} className={cn('flex min-w-0', layout === 'inline' ? 'items-baseline gap-1.5' : 'flex-col gap-0.5', layout === 'stack' && 'flex-row items-baseline justify-between gap-3')}>
          <dt className={cn('shrink-0 text-muted', layout === 'grid' ? 'caps' : 'text-sm')}>{s.field.label}</dt>
          <dd className={cn('min-w-0', layout === 'stack' && 'text-right')}><FieldView field={s.field} value={s.value} context={ctx} now={now} /></dd>
        </div>
      ))}
    </dl>
  )
}

/** Renders any record in any context from metadata alone (manual 6.4). Names no model. */
export function Projection({ meta, record, context, override, pref, onRun, pending, href, now, extra, className }: Props) {
  const recipe = resolveRecipe(meta, context, override, pref)
  const { intent, density, surface, tone } = recipe.variants
  const slots = resolveSlots(meta, record, recipe.slots, intent === 'detail' ? 24 : intent === 'row' ? 3 : 4)
  const ctx = fieldCtx(density, intent)
  const actions = recipe.slots.includes('actions') && onRun
  const root = cn(card({ intent, density, surface, tone }), href && 'relative', className)
  const badge = slots.badge ? <StatusBadge field={slots.badge.field} value={slots.badge.value} size={density === 'compact' ? 'sm' : 'md'} /> : null
  const timestamp = slots.timestamp ? <span className="text-sm text-muted"><FieldView field={slots.timestamp.field} value={slots.timestamp.value} now={now} /></span> : null

  if (intent === 'row') {
    return (
      <article className={root}>
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
          {slots.media ? <FieldView field={slots.media.field} value={slots.media.value} context="compact" /> : null}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2"><Title slot={slots.title} href={href} as="p" className="truncate" />{badge}</div>
            {slots.subtitle ? <span className="truncate text-sm text-muted"><FieldView field={slots.subtitle.field} value={slots.subtitle.value} context="compact" /></span> : null}
            <MetaList items={slots.meta} ctx="compact" now={now} layout="inline" />
          </div>
        </div>
        <div className="relative z-10 ml-auto flex items-center gap-4">
          <Figure slot={slots.figure} size="md" align="end" />
          {timestamp}
          {actions ? <ActionMenu meta={meta} record={record} onRun={onRun} density={density} /> : null}
        </div>
        {extra ? <div className="basis-full">{extra}</div> : null}
      </article>
    )
  }

  if (intent === 'relation') {
    return (
      <div className={root}>
        <div className="flex min-w-0 flex-col"><Title slot={slots.title} href={href} as="span" className="truncate" />{slots.subtitle ? <span className="truncate text-sm text-muted"><FieldView field={slots.subtitle.field} value={slots.subtitle.value} context="compact" /></span> : null}</div>
      </div>
    )
  }

  if (intent === 'audit') {
    return (
      <div className={root}>
        <span className="text-sm text-muted tabular">{timestamp ?? <Empty label="No time recorded" />}</span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><Title slot={slots.title} as="p" className="text-sm" />{badge}</div>
          <MetaList items={slots.meta} ctx="compact" now={now} layout="inline" />
        </div>
      </div>
    )
  }

  if (intent === 'stat') {
    return (
      <div className={root}>
        <Title slot={slots.title} as="p" className="text-sm font-semibold text-muted" />
        <MetaList items={slots.meta} ctx="spacious" now={now} layout="stack" />
      </div>
    )
  }

  if (intent === 'detail') {
    return (
      <section className={cn(root, '@container')} aria-label={titleText(slots.title) ?? meta.label}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5"><Title slot={slots.title} as="h3" className="font-display text-2xl font-bold" />{badge}</div>
            {slots.subtitle ? <span className="text-muted"><FieldView field={slots.subtitle.field} value={slots.subtitle.value} /></span> : null}
          </div>
          {actions ? <ActionBar meta={meta} record={record} onRun={onRun} pending={pending} density={density} /> : null}
        </header>
        <Figure slot={slots.figure} size="xl" />
        {slots.media ? <FieldView field={slots.media.field} value={slots.media.value} context="comfortable" /> : null}
        <MetaList items={slots.meta} ctx="comfortable" now={now} layout="grid" />
        {extra}
        {timestamp ? <footer className="border-t border-border pt-3">{timestamp}</footer> : null}
      </section>
    )
  }

  // card and media: the photo sits in a square well with the state stamped on it; as on a merchandised
  // shelf, the seller reads first, the name second, the pack as one quiet line, and the figure closes the
  // cell at the same height in every cell of a row, so prices line up across the grid.
  const pad = density === 'compact' ? 'p-3' : density === 'spacious' ? 'p-5' : 'p-4'
  const merch = intent === 'media'
  const subtitle = slots.subtitle ? <span className={cn('text-sm text-muted', merch && 'truncate')}><FieldView field={slots.subtitle.field} value={slots.subtitle.value} context="compact" /></span> : null
  return (
    <article className={cn(root, merch && 'group')}>
      {slots.media ? (
        <div className="relative border-b border-border">
          <FieldView field={slots.media.field} value={slots.media.value} context="media" />
          {badge ? <div className="absolute top-2.5 left-2.5">{badge}</div> : null}
        </div>
      ) : null}
      <div className={cn('flex min-w-0 flex-1 flex-col', merch ? cn('gap-1', pad) : 'gap-2')}>
        {merch ? subtitle : null}
        <Title slot={slots.title} href={href} className={cn(density === 'spacious' ? 'text-lg' : 'text-md', 'leading-snug', merch && 'group-hover:underline')} />
        {merch ? null : subtitle}
        <MetaList items={slots.meta} ctx={merch ? 'media' : ctx} now={now} layout={merch ? 'values' : 'stack'} />
        {badge && !slots.media ? <div>{badge}</div> : null}
        {slots.figure ? <div className={cn('mt-auto', merch ? 'pt-3' : 'border-t border-border pt-3')}><Figure slot={slots.figure} size={density === 'compact' ? 'md' : 'lg'} /></div> : null}
        {extra}
        {actions ? <div className={cn('relative z-10 pt-1', !slots.figure && 'mt-auto')}><ActionBar meta={meta} record={record} onRun={onRun} pending={pending} density={density} inline={2} /></div> : null}
      </div>
    </article>
  )
}
