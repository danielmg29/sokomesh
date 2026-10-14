import * as V from './views'
import type { FieldRenderer } from './types'

/**
 * One entry per contract widget (manual 6.5). Adding a widget here gives every table, form,
 * filter, detail and diff view the widget at once. A contract test fails on an unknown widget.
 */
export const fieldRegistry = {
  hidden: { view: V.HiddenView },
  text: { view: V.TextView },
  textarea: { view: V.TextareaView },
  richtext: { view: V.RichTextView },
  currency: { view: V.CurrencyView, align: 'end' },
  quantity: { view: V.QuantityView, align: 'end' },
  integer: { view: V.IntegerView, align: 'end' },
  decimal: { view: V.DecimalView, align: 'end' },
  unit: { view: V.UnitView },
  select: { view: V.SelectView },
  status: { view: V.StatusView },
  multiselect: { view: V.MultiselectView },
  relation: { view: V.RelationView },
  boolean: { view: V.BooleanView, inlineInput: true },
  date: { view: V.DateView },
  datetime: { view: V.DatetimeView },
  'relative-time': { view: V.RelativeTimeView },
  image: { view: V.ImageView },
  file: { view: V.FileView },
  email: { view: V.EmailView },
  phone: { view: V.PhoneView },
  url: { view: V.UrlView },
  code: { view: V.CodeView },
  address: { view: V.AddressView },
  location: { view: V.LocationView },
  secret: { view: V.SecretView },
  json: { view: V.JsonView },
} satisfies Record<string, FieldRenderer>

export type Widget = keyof typeof fieldRegistry
export const widgets = Object.keys(fieldRegistry) as Widget[]

export function rendererFor(widget: string): FieldRenderer | undefined {
  return (fieldRegistry as Record<string, FieldRenderer>)[widget]
}
