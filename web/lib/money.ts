// Money arrives from the contract as decimal strings and never becomes a float (manual A-07).
// Arithmetic runs in integer minor units (BigInt); formatting groups digits from the string.

const MONEY = /^(-?)(\d+)(?:\.(\d+))?$/

export type Money = { amount: string; currency: string }

function parts(amount: string) {
  const m = MONEY.exec(amount.trim())
  if (!m) throw new Error(`not a decimal string: ${amount}`)
  return { negative: m[1] === '-', whole: m[2].replace(/^0+(?=\d)/, ''), fraction: m[3] ?? '' }
}

/** Integer minor units for a decimal string, at `places` decimal places (rounds half away from zero). */
export function toMinor(amount: string, places = 2): bigint {
  const { negative, whole, fraction } = parts(amount)
  const padded = (fraction + '0'.repeat(places + 1)).slice(0, places + 1)
  let minor = BigInt(whole + padded.slice(0, places))
  if (Number(padded[places]) >= 5) minor += BigInt(1)
  return negative ? -minor : minor
}

export function fromMinor(minor: bigint, places = 2): string {
  const negative = minor < BigInt(0)
  const digits = (negative ? -minor : minor).toString().padStart(places + 1, '0')
  const whole = digits.slice(0, digits.length - places)
  const fraction = places ? `.${digits.slice(-places)}` : ''
  return `${negative ? '-' : ''}${whole}${fraction}`
}

export function addMoney(...amounts: string[]): string {
  return fromMinor(amounts.reduce((sum, a) => sum + toMinor(a), BigInt(0)))
}

export function multiplyMoney(amount: string, quantity: number): string {
  if (!Number.isInteger(quantity)) throw new Error('quantity must be a whole number of units')
  return fromMinor(toMinor(amount) * BigInt(quantity))
}

export function compareMoney(a: string, b: string): number {
  const d = toMinor(a) - toMinor(b)
  return d === BigInt(0) ? 0 : d > BigInt(0) ? 1 : -1
}

/** Percentage change from `before` to `after`, one decimal place, as a display string. */
export function percentChange(before: string, after: string): string {
  const b = toMinor(before)
  if (b === BigInt(0)) return 'n/a'
  const tenths = ((toMinor(after) - b) * BigInt(1000)) / b
  const sign = tenths > BigInt(0) ? '+' : ''
  return `${sign}${(Number(tenths) / 10).toFixed(1)}%`
}

function group(whole: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** "KES 1,740.00". Always shows the currency and two decimals (PRODUCT.md voice rule). */
export function formatMoney(amount: string, currency = 'KES', places = 2): string {
  const normalised = fromMinor(toMinor(amount, places), places)
  const { negative, whole, fraction } = parts(normalised)
  const body = `${group(whole)}${fraction ? `.${fraction}` : ''}`
  return `${negative ? '−' : ''}${currency} ${body}`
}

/** Number part only, for tables whose column header names the currency. */
export function formatAmount(amount: string, places = 2): string {
  return formatMoney(amount, '', places).trim()
}
