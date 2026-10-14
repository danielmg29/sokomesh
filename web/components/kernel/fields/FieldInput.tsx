'use client'

import { Lock } from 'lucide-react'
import { useState, type ComponentType, type ReactNode } from 'react'
import { FormField } from '@/components/ui/form-field'
import { Icon } from '@/components/ui/icon'
import * as F from './filters'
import * as I from './inputs'
import { FieldView } from './FieldView'
import { rendererFor } from './registry'
import type { FilterProps, InputProps } from './types'
import { mirrorValidate } from './validate'

const inputs: Record<string, ComponentType<InputProps>> = {
  text: I.TextInput, textarea: I.TextareaInput, richtext: I.RichTextInput, code: I.CodeInput,
  currency: I.CurrencyInput, quantity: I.QuantityInput, integer: I.IntegerInput, decimal: I.DecimalInput, unit: I.UnitInput,
  select: I.SelectInput, status: I.StatusInput, multiselect: I.MultiselectInput, relation: I.RelationInput, boolean: I.BooleanInput,
  date: I.DateInput, datetime: I.DatetimeInput, image: I.ImageInput, file: I.FileInput,
  email: I.EmailInput, phone: I.PhoneInput, url: I.UrlInput, address: I.AddressInput, location: I.LocationInput,
  secret: I.SecretInput, json: I.JsonInput,
}

const filters: Record<string, ComponentType<FilterProps>> = {
  text: F.TextFilter, textarea: F.TextFilter, code: F.TextFilter, email: F.TextFilter, phone: F.TextFilter, richtext: F.TextFilter,
  select: F.ChoiceFilter, status: F.ChoiceFilter, multiselect: F.ChoiceFilter, unit: F.ChoiceFilter, boolean: F.BooleanFilter,
  currency: F.RangeFilter, quantity: F.RangeFilter, integer: F.RangeFilter, decimal: F.RangeFilter,
  date: F.DateRangeFilter, datetime: F.DateRangeFilter, relation: F.RelationFilter, address: F.RegionFilter, location: F.NearFilter,
}

export const inputWidgets = Object.keys(inputs)
export const filterWidgets = Object.keys(filters)

type FieldInputProps = InputProps & {
  /** Server error for this field (AppError.fields); always wins over the client mirror. */
  error?: string
  /** Why this role cannot edit the field (from fieldPolicy / _can), shown instead of a control. */
  restrictedReason?: string
  /** Validate on blur against the contract's declared constraints. Default true. */
  mirror?: boolean
  trailing?: ReactNode
}

/** Write context for any field: label, help and error wired once, renderer from the widget. */
export function FieldInput({ field, value, onChange, error, restrictedReason, mirror = true, trailing, ...rest }: FieldInputProps) {
  const [touched, setTouched] = useState(false)
  const local = mirror && touched ? mirrorValidate(field, value) : null
  const shown = error ?? local ?? undefined
  const Control = inputs[field.widget]
  const label = field.label ?? field.name

  if (restrictedReason || field.readOnly || !Control) {
    return (
      <FormField label={label} help={restrictedReason ?? field.help} trailing={trailing}>
        <div className="flex min-h-(--density-control-height) items-center gap-2 rounded-sm border border-border bg-sunken px-3 py-1.5">
          <FieldView field={field} value={value} />
          {restrictedReason ? <Icon icon={Lock} className="ml-auto text-muted" label="Restricted" /> : null}
        </div>
      </FormField>
    )
  }

  const control = (
    <div onBlur={() => setTouched(true)} className="min-w-0">
      <Control field={field} value={value} onChange={onChange} invalid={Boolean(shown)} {...rest} />
    </div>
  )

  if (rendererFor(field.widget)?.inlineInput) {
    return (
      <div className="flex flex-col gap-1.5">
        {control}
        {shown ? <p className="text-sm font-medium text-tone-danger">{shown}</p> : null}
      </div>
    )
  }
  return (
    <FormField label={label} help={field.help} error={shown} required={field.required} trailing={trailing}>
      {control}
    </FormField>
  )
}

/** Filter context: the operator family follows the widget; operators come from `field.filter`. */
export function FieldFilter(props: FilterProps) {
  const Control = filters[props.field.widget]
  if (!Control || props.field.filter?.length === 0) return null
  return <Control {...props} />
}
