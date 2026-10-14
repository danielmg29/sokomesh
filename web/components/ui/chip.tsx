import { cva } from 'class-variance-authority'

/**
 * Toggle chip: a filter or option that is on or off. The on-state matches Segmented (inverse), so
 * every toggle reads the same; signal stays for applied-filter tokens and trade attention.
 */
export const chipStyles = cva(
  [
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border px-2.5 text-sm font-semibold pointer-coarse:h-(--touch-target)',
    'motion-bind transition-[color,background-color,transform] active:translate-y-px',
  ],
  {
    variants: {
      on: {
        true: 'border-inverse bg-inverse text-inverse-foreground',
        false: 'border-border-strong bg-surface text-foreground hover:bg-sunken',
      },
    },
    defaultVariants: { on: false },
  },
)
