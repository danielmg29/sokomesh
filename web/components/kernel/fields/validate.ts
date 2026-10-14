import type { FieldMeta } from '@/lib/contract/types'
import { toSellaPayPhone } from '@/lib/format'
import { asNumber, asRichText, asString, asStringList, isEmpty, unitLabel } from './types'

const DECIMAL = /^-?\d+(\.\d+)?$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Mirrors constraints the contract already declares (required, lengths, ranges, steps,
 * formats) for immediate feedback. It never originates a rule; the server's answer wins.
 */
export function mirrorValidate(field: FieldMeta, value: unknown): string | null {
  const label = field.label ?? field.name
  if (field.required && (isEmpty(value) || (field.widget === 'richtext' && !asRichText(value)?.text))) return `${label} is required.`
  if (isEmpty(value)) return null

  switch (field.widget) {
    case 'text': case 'textarea': case 'code': {
      const s = asString(value) ?? ''
      if (field.maxLength && s.length > field.maxLength) return `Use ${field.maxLength.toLocaleString('en-KE')} characters or fewer (${(s.length - field.maxLength).toLocaleString('en-KE')} over).`
      return null
    }
    case 'richtext': {
      const text = asRichText(value)?.text ?? ''
      if (field.maxLength && text.length > field.maxLength) return `Use ${field.maxLength.toLocaleString('en-KE')} characters or fewer.`
      return null
    }
    case 'currency': case 'decimal': {
      const s = (asString(value) ?? '').trim()
      if (!DECIMAL.test(s)) return 'Enter a number, for example 1740.00.'
      const [whole = '', fraction = ''] = s.replace('-', '').split('.')
      const places = field.decimalPlaces ?? 2
      if (fraction.length > places) return `Use at most ${places} decimal places.`
      if (field.maxDigits && whole.length > field.maxDigits - places) return 'This amount is larger than allowed.'
      if (field.min !== undefined && Number(s) < field.min) return `Must be at least ${field.min}.`
      return null
    }
    case 'quantity': case 'integer': {
      const n = asNumber(value)
      if (n === null || !Number.isInteger(n)) return 'Enter a whole number.'
      const unit = (x: number) => unitLabel(field.unit, x) ?? ''
      if (field.min !== undefined && n < field.min) return field.widget === 'quantity' ? `Minimum order is ${field.min} ${unit(field.min)}.` : `Must be at least ${field.min}.`
      if (field.max !== undefined && n > field.max) return field.widget === 'quantity' ? `Only ${field.max} ${unit(field.max)} available.` : `Must be at most ${field.max}.`
      if (field.step && field.step > 1 && n % field.step !== 0) return `Order in multiples of ${field.step}.`
      return null
    }
    case 'email':
      return EMAIL.test(asString(value) ?? '') ? null : 'Enter an email address like name@business.co.ke.'
    case 'phone':
      return toSellaPayPhone(asString(value) ?? '') ? null : 'Enter a Kenyan mobile number starting 07 or 01.'
    case 'url':
      return /^https:\/\//.test(asString(value) ?? '') ? null : 'Use a secure https:// address.'
    case 'multiselect': {
      const n = asStringList(value).length
      return field.maxItems && n > field.maxItems ? `Choose at most ${field.maxItems}.` : null
    }
    case 'json': {
      if (typeof value !== 'string') return null // already-parsed objects are valid
      try { JSON.parse(value); return null } catch { return 'This is not valid JSON.' }
    }
    default:
      return null
  }
}
