'use client'

import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useFieldControlProps } from './form-field'

export const controlStyles = [
  'w-full min-w-0 rounded-sm border border-border-strong bg-surface text-foreground',
  'placeholder:text-muted motion-bind transition-[border-color,box-shadow]',
  'hover:border-foreground',
  'aria-invalid:border-tone-danger aria-invalid:bg-tone-danger-bg/40',
  'disabled:cursor-not-allowed disabled:border-border disabled:bg-sunken disabled:text-muted',
  'read-only:border-border read-only:bg-sunken',
].join(' ')

type InputProps = Omit<ComponentProps<'input'>, 'prefix'> & {
  /** Fixed text before the value, e.g. "KES". */
  prefix?: ReactNode
  /** Fixed text after the value, e.g. a unit. */
  suffix?: ReactNode
  inputClassName?: string
}

export function Input({ className, inputClassName, prefix, suffix, ...props }: InputProps) {
  const field = useFieldControlProps()
  const input = (
    <input
      {...field}
      {...props}
      className={cn(
        controlStyles,
        'h-(--density-control-height) px-3 text-md',
        (prefix || suffix) && 'border-0 bg-transparent hover:border-0 aria-invalid:bg-transparent read-only:bg-transparent disabled:bg-transparent focus-visible:outline-none focus-visible:shadow-none',
        prefix ? 'pl-1.5' : null,
        suffix ? 'pr-1.5' : null,
        inputClassName,
        !(prefix || suffix) && className,
      )}
    />
  )
  if (!prefix && !suffix) return input
  return (
    <div
      className={cn(
        controlStyles,
        'flex h-(--density-control-height) items-center overflow-hidden',
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring-contrast has-[input:focus-visible]:shadow-[0_0_0_2px_var(--color-ring)]',
        'has-[input[aria-invalid=true]]:border-tone-danger has-[input:disabled]:border-border has-[input:disabled]:bg-sunken has-[input:read-only]:bg-sunken',
        className,
      )}
    >
      {prefix ? <span className="pl-3 text-sm font-semibold text-muted select-none">{prefix}</span> : null}
      {input}
      {suffix ? <span className="pr-3 text-sm text-muted select-none">{suffix}</span> : null}
    </div>
  )
}

type TextareaProps = ComponentProps<'textarea'> & { showCount?: boolean }

export function Textarea({ className, maxLength, showCount = Boolean(maxLength), value, defaultValue, ...props }: TextareaProps) {
  const field = useFieldControlProps()
  const length = String(value ?? defaultValue ?? '').length
  const over = maxLength !== undefined && length > maxLength
  return (
    <div className="flex flex-col gap-1">
      <textarea
        {...field}
        {...props}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={over || field['aria-invalid'] || undefined}
        className={cn(controlStyles, 'min-h-24 resize-y px-3 py-2 text-md leading-relaxed', className)}
      />
      {showCount && maxLength ? (
        <span className={cn('self-end text-xs tabular', over ? 'font-semibold text-tone-danger' : 'text-muted')} aria-live="polite">
          {length.toLocaleString('en-KE')} / {maxLength.toLocaleString('en-KE')}
          {over ? ` · ${(length - maxLength).toLocaleString('en-KE')} over the limit` : ''}
        </span>
      ) : null}
    </div>
  )
}
