import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './icon'

export const buttonStyles = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm border font-semibold',
    'motion-bind transition-[background-color,border-color,color,transform]',
    // Tactile press: the control settles 1px while held. Links and disabled controls stay put.
    'active:translate-y-px aria-disabled:active:translate-y-0',
    'disabled:cursor-not-allowed disabled:border-border disabled:bg-sunken disabled:text-muted',
    'aria-disabled:cursor-not-allowed aria-disabled:border-border aria-disabled:bg-sunken aria-disabled:text-muted',
  ],
  {
    variants: {
      variant: {
        primary: 'border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover',
        secondary: 'border-border-strong bg-surface text-foreground hover:bg-sunken',
        ghost: 'border-transparent bg-transparent text-foreground hover:bg-sunken',
        signal: 'border-signal-border bg-signal text-signal-foreground hover:bg-signal-hover',
        danger: 'border-tone-danger bg-tone-danger text-primary-foreground hover:bg-tone-danger/90',
        'danger-outline': 'border-tone-danger bg-surface text-tone-danger hover:bg-tone-danger-bg',
        'warning-outline': 'border-tone-warning bg-surface text-tone-warning hover:bg-tone-warning-bg',
        link: 'h-auto border-transparent bg-transparent px-0 text-primary underline-offset-4 hover:underline active:translate-y-0',
      },
      size: {
        sm: 'h-8 px-2.5 text-sm',
        md: 'h-(--density-control-height) px-3.5 text-md',
        lg: 'h-12 px-5 text-base',
        icon: 'size-(--density-control-height) p-0 text-md',
        'icon-sm': 'size-8 p-0 text-sm',
      },
      block: { true: 'w-full' },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonStyles> & {
    asChild?: boolean
    loading?: boolean
    /** Text announced while loading, e.g. "Confirming order". */
    loadingLabel?: string
    leadingIcon?: LucideIcon
    trailingIcon?: LucideIcon
  }

export function Button({
  className, variant, size, block, asChild, loading, loadingLabel, leadingIcon, trailingIcon, children, disabled, type, ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const busy = Boolean(loading)
  return (
    <Comp
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonStyles({ variant, size, block }), className)}
      disabled={asChild ? undefined : disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {asChild ? children : (
        <>
          {busy ? <Icon icon={LoaderCircle} className="animate-spin" /> : leadingIcon ? <Icon icon={leadingIcon} /> : null}
          <span className={cn(busy && loadingLabel && 'sr-only')}>{children}</span>
          {busy && loadingLabel ? <span aria-live="polite">{loadingLabel}</span> : null}
          {!busy && trailingIcon ? <Icon icon={trailingIcon} /> : null}
        </>
      )}
    </Comp>
  )
}

type IconButtonProps = Omit<ButtonProps, 'children' | 'leadingIcon' | 'trailingIcon' | 'size'> & {
  icon: LucideIcon
  /** Required: icon-only controls must name their action. */
  label: string
  size?: 'icon' | 'icon-sm'
  badge?: ReactNode
}

export function IconButton({ icon, label, size = 'icon', variant = 'ghost', badge, className, ...props }: IconButtonProps) {
  return (
    <Button size={size} variant={variant} aria-label={label} title={label} className={className} {...props}>
      <Icon icon={icon} className="size-[1.15em]" />
      {badge}
    </Button>
  )
}
