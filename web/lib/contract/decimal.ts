import { z } from 'zod'

/**
 * Money and quantities travel as strings so they never pass through a float (manual A-07).
 * Mirrors Django's DecimalField(max_digits, decimal_places); the server result still wins.
 */
export function decimalString(maxDigits: number, decimalPlaces: number) {
  const whole = maxDigits - decimalPlaces
  const pattern = new RegExp(`^-?\\d{1,${Math.max(whole, 1)}}${decimalPlaces ? `(\\.\\d{1,${decimalPlaces}})?` : ''}$`)
  return z.string().regex(pattern, { error: `Use up to ${whole} digits and ${decimalPlaces} decimal places.` })
}
