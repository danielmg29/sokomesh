import { cva, type VariantProps } from 'class-variance-authority'
import type { ModelMeta, Tone } from '@/lib/contract/types'
import type { Density } from '@/lib/design/tokens.generated'

// The four recipe axes (manual 6.7). Every recipe uses the same axes; values are never model-specific.
export const intents = ['row', 'card', 'detail', 'stat', 'media', 'relation', 'audit', 'thread', 'auth', 'feedback'] as const
export const surfaces = ['flat', 'bordered', 'raised', 'inset'] as const
export const tones = ['neutral', 'info', 'success', 'warning', 'danger', 'signal'] as const satisfies readonly Tone[]

export type Intent = (typeof intents)[number]
export type Surface = (typeof surfaces)[number]
export type { Density, Tone }

/** Separation from the page. Borders carry structure; only `raised` lifts. */
export const surfaceStyles = cva('', {
  variants: {
    surface: {
      flat: '',
      bordered: 'border border-border bg-surface',
      raised: 'border border-border-strong bg-surface shadow-raised',
      inset: 'border border-border bg-sunken',
    },
    tone: {
      neutral: '',
      info: 'border-tone-info bg-tone-info-bg/50',
      success: 'border-tone-success bg-tone-success-bg/50',
      warning: 'border-tone-warning bg-tone-warning-bg/50',
      danger: 'border-tone-danger bg-tone-danger-bg/50',
      signal: 'border-signal-border bg-signal-soft',
    },
  },
  defaultVariants: { surface: 'bordered', tone: 'neutral' },
})

/** Projection recipe: one record in any presentation. */
export const card = cva('min-w-0 rounded-md motion-reflow transition-[background-color,border-color]', {
  variants: {
    intent: {
      row: 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1',
      card: 'flex flex-col gap-2',
      detail: 'flex flex-col gap-5',
      stat: 'flex flex-col gap-1',
      media: 'flex flex-col overflow-hidden',
      relation: 'flex items-center gap-2',
      audit: 'grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3',
      thread: 'flex flex-col gap-1',
      auth: 'mx-auto flex w-full max-w-sm flex-col gap-4',
      feedback: 'flex flex-col items-center gap-3 text-center',
    },
    density: { compact: 'p-3 text-sm', comfortable: 'p-4 text-md', spacious: 'p-6 text-base' },
    surface: { flat: '', bordered: 'border border-border bg-surface', raised: 'border border-border-strong bg-surface shadow-raised', inset: 'border border-border bg-sunken' },
    tone: {
      neutral: '',
      info: 'border-tone-info',
      success: 'border-tone-success',
      warning: 'border-tone-warning',
      danger: 'border-tone-danger',
      signal: 'border-signal-border',
    },
  },
  compoundVariants: [
    { intent: 'media', className: 'p-0' }, // media bleeds regardless of density
    { intent: 'relation', className: 'rounded-sm p-2' },
    { intent: 'audit', density: 'spacious', className: 'p-3' }, // logs are scanned, not admired
  ],
  defaultVariants: { intent: 'card', density: 'comfortable', tone: 'neutral', surface: 'bordered' },
})

export type CardVariants = { intent: Intent; density: Density; surface: Surface; tone?: Tone }
export type CardVariantProps = VariantProps<typeof card>

export type RecipeContext = 'list' | 'detail' | 'picker' | 'dashboard' | 'thread'
export type RecipeOverride = Partial<CardVariants> & { name?: string }
/** `figure` is the record's commercial quantity (a price or total), set large so it can be compared at a glance. */
export type SlotName = 'title' | 'subtitle' | 'badge' | 'media' | 'figure' | 'meta' | 'timestamp' | 'owner' | 'actions'

/**
 * Resolution order (manual 6.7): explicit override > feature override > inference from
 * contract metadata and context > user preference > recipe defaults.
 */
export function resolveRecipe(meta: ModelMeta, ctx: RecipeContext, override?: RecipeOverride, pref?: Partial<CardVariants>) {
  const visible = meta.list.fields.length
  const hasMedia = meta.fields.some(f => f.widget === 'image')
  const inferred: CardVariants =
    meta.immutable ? { intent: 'audit', density: 'compact', surface: 'flat' }
    : ctx === 'dashboard' ? { intent: 'stat', density: 'spacious', surface: 'bordered' }
    : ctx === 'picker' ? { intent: 'relation', density: 'compact', surface: 'flat' }
    : ctx === 'thread' ? { intent: 'thread', density: 'compact', surface: 'flat' }
    : ctx === 'detail' ? { intent: 'detail', density: 'comfortable', surface: 'bordered' }
    : hasMedia ? { intent: 'media', density: 'comfortable', surface: 'bordered' }
    : { intent: 'row', density: visible > 6 ? 'compact' : 'comfortable', surface: 'bordered' }
  const variants: CardVariants = { ...inferred, ...pref, ...override }
  const slots: readonly SlotName[] =
    variants.intent === 'relation' ? ['title', 'subtitle']
    : variants.intent === 'stat' ? ['title', 'meta']
    : variants.intent === 'audit' ? ['timestamp', 'title', 'badge', 'meta']
    : ['media', 'title', 'subtitle', 'badge', 'figure', 'meta', 'timestamp', 'owner', 'actions']
  return { name: override?.name ?? 'card', variants, slots }
}
