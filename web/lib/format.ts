// Display formatting for quantities, dates and contacts. Kenya: Africa/Nairobi (EAT, UTC+3).

export const TIME_ZONE = 'Africa/Nairobi'
const LOCALE = 'en-KE'

const dateFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const weekdayFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' })

export function formatQuantity(quantity: number | string, unit?: { one: string; other: string } | string): string {
  const n = typeof quantity === 'string' ? Number(quantity) : quantity
  const text = Number.isInteger(n) ? n.toLocaleString(LOCALE) : String(quantity)
  if (!unit) return text
  const label = typeof unit === 'string' ? unit : n === 1 ? unit.one : unit.other
  return `${text} ${label}`
}

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

export function formatTime(iso: string): string {
  return `${timeFmt.format(new Date(iso))} EAT`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${dateFmt.format(d)}, ${timeFmt.format(d)} EAT`
}

export function formatDay(iso: string): string {
  return weekdayFmt.format(new Date(iso))
}

/** "9 min ago" / "in 11 min" relative to `now`; absolute time stays available to assistive tech. */
export function formatRelative(iso: string, now: string | Date): string {
  const diff = Math.round((new Date(iso).getTime() - new Date(now).getTime()) / 1000)
  const abs = Math.abs(diff)
  const [value, unit] =
    abs < 60 ? [abs, 's'] : abs < 3600 ? [Math.round(abs / 60), 'min'] : abs < 86400 ? [Math.round(abs / 3600), 'h'] : [Math.round(abs / 86400), abs < 172800 ? 'day' : 'days']
  if (abs < 45) return diff < 0 ? 'just now' : 'in a moment'
  return diff < 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`
}

/** "+254 712 345 678". Accepts +2547…, 2547… or local 07…/7… forms. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('254') ? digits.slice(3) : digits.replace(/^0/, '')
  if (local.length !== 9) return phone
  return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}

/** SellaPay wants the 9-digit local form ("712345678"): 7xx or 1xx, no country code. */
export function toSellaPayPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('254') ? digits.slice(3) : digits.replace(/^0/, '')
  return /^[17]\d{8}$/.test(local) ? local : null
}

export function maskPhone(phone: string): string {
  const formatted = formatPhone(phone)
  return formatted.replace(/(\+254 )\d{3} \d{3}/, '$1••• •••')
}
