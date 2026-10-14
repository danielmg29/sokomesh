import { cva, type VariantProps } from 'class-variance-authority'
import {
  Ban, Check, CircleDashed, CircleHelp, Clock, Diamond, Info, LoaderCircle, Lock, Minus, OctagonX, TriangleAlert, type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/contract/types'
import { Icon } from './icon'

/** A mark per tone, so state never depends on colour alone (constitution, WCAG 1.4.1). */
export const toneMark: Record<Tone, LucideIcon> = {
  neutral: Minus,
  info: Info,
  success: Check,
  warning: TriangleAlert,
  danger: OctagonX,
  signal: Diamond,
}

/** Marks for specific commerce conditions, overriding the tone default when they are more precise. */
export const conditionMark = {
  pending: Clock,
  processing: LoaderCircle,
  partial: CircleDashed,
  restricted: Lock,
  unavailable: Ban,
  unknown: CircleHelp,
} satisfies Record<string, LucideIcon>

export type StampCondition = keyof typeof conditionMark

const stampStyles = cva(
  'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-xs border-[length:var(--border-stamp)] font-semibold uppercase tracking-caps tabular',
  {
    variants: {
      tone: {
        neutral: 'border-tone-neutral bg-tone-neutral-bg text-tone-neutral',
        info: 'border-tone-info bg-tone-info-bg text-tone-info',
        success: 'border-tone-success bg-tone-success-bg text-tone-success',
        warning: 'border-tone-warning bg-tone-warning-bg text-tone-warning',
        danger: 'border-tone-danger bg-tone-danger-bg text-tone-danger',
        signal: 'border-signal-border bg-signal-stamp text-signal-stamp-foreground',
      },
      size: { sm: 'px-1.5 py-px text-xs leading-4', md: 'px-2 py-0.5 text-xs' },
      presentation: { stamp: '', dot: 'border-0 bg-transparent px-0 normal-case tracking-normal text-sm font-medium' },
    },
    // Without its amber ground, signal text takes the page foreground; ink would vanish on the dark theme.
    compoundVariants: [{ tone: 'signal', presentation: 'dot', className: 'text-foreground' }],
    defaultVariants: { tone: 'neutral', size: 'md', presentation: 'stamp' },
  },
)

type StampProps = VariantProps<typeof stampStyles> & {
  tone: Tone
  children: ReactNode
  condition?: StampCondition
  /** Detail after the label, e.g. "14 bales". Keeps its case. */
  detail?: ReactNode
  /** Plays the STAMP motion once when the state is newly confirmed. */
  fresh?: boolean
  className?: string
}

/** STAMP: the visual form of an authoritative state. Label always visible. */
export function Stamp({ tone, size, presentation, condition, detail, fresh, className, children }: StampProps) {
  const mark = condition ? conditionMark[condition] : toneMark[tone]
  return (
    <span className={cn(stampStyles({ tone, size, presentation }), fresh && 'animate-stamp', className)}>
      {presentation === 'dot' ? (
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-xs', dotFill[tone])} />
      ) : (
        <Icon icon={mark} className={cn('size-[1.1em] shrink-0', condition === 'processing' && 'animate-spin')} strokeWidth={2.25} />
      )}
      {/* The state word never truncates when a detail can wrap instead. */}
      <span className={detail ? 'shrink-0' : 'truncate'}>{children}</span>
      {detail ? <span className="min-w-0 font-medium whitespace-normal normal-case tracking-normal">· {detail}</span> : null}
    </span>
  )
}

const dotFill: Record<Tone, string> = {
  neutral: 'bg-tone-neutral',
  info: 'bg-tone-info',
  success: 'bg-tone-success',
  warning: 'bg-tone-warning',
  danger: 'bg-tone-danger',
  signal: 'bg-signal ring-1 ring-signal-border',
}
