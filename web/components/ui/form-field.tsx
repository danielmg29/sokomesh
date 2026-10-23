'use client'

import { Label as LabelPrimitive } from 'radix-ui'
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Icon } from './icon'

type FieldIds = { control: string; help: string; error: string; invalid: boolean; describedBy: string | undefined; required: boolean }

const FieldContext = createContext<FieldIds | null>(null)

/** Ids and ARIA wiring for the control inside the nearest FormField. */
export function useFieldControl() {
  return useContext(FieldContext)
}

/** Spread onto any input-like element inside a FormField. */
export function useFieldControlProps() {
  const field = useFieldControl()
  if (!field) return {}
  return {
    id: field.control,
    'aria-describedby': field.describedBy,
    'aria-invalid': field.invalid || undefined,
    'aria-required': field.required || undefined,
  }
}

type FormFieldProps = {
  label: ReactNode
  help?: ReactNode
  error?: ReactNode
  required?: boolean
  /** Visually hide the label but keep it for assistive tech (e.g. table-cell editors). */
  hideLabel?: boolean
  trailing?: ReactNode
  className?: string
  children: ReactNode
}

/** Label, help and error for one control: every FieldInput renderer is wrapped in this. */
export function FormField({ label, help, error, required = false, hideLabel, trailing, className, children }: FormFieldProps) {
  const base = useId()
  const ids = { control: `${base}-control`, help: `${base}-help`, error: `${base}-error` }
  const describedBy = [help ? ids.help : null, error ? ids.error : null].filter(Boolean).join(' ') || undefined
  return (
    <FieldContext.Provider value={{ ...ids, invalid: Boolean(error), describedBy, required }}>
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <div className={cn('flex items-baseline justify-between gap-3', hideLabel && 'sr-only')}>
          <FieldLabel htmlFor={ids.control}>
            {label}
            {required ? <span className="text-tone-danger" aria-hidden="true"> *</span> : null}
            {required ? <span className="sr-only"> (required)</span> : null}
          </FieldLabel>
          {trailing}
        </div>
        {children}
        {help && !error ? <p id={ids.help} className="text-sm text-muted">{help}</p> : null}
        {help && error ? <p id={ids.help} className="sr-only">{help}</p> : null}
        {error ? (
          <p id={ids.error} className="flex items-start gap-1.5 text-sm font-medium text-tone-danger">
            <Icon icon={CircleAlert} className="mt-0.5" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}

export function FieldLabel({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('text-md font-semibold text-foreground', className)} {...props} />
}

