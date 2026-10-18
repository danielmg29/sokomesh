// Renders contract/ac-contract.json into lib/contract/generated.ts (manual 3.1).
// Runs on Node against the committed artefact, so no Python is needed in web builds.
import type { Contract, FieldMeta } from '../lib/contract/types.ts'

function zodFor(f: FieldMeta): string {
  let z: string
  switch (f.type) {
    case 'uuid': z = 'z.uuid()'; break
    case 'string': case 'text':
      z = `z.string()${f.maxLength ? `.max(${f.maxLength})` : ''}`
      if (f.required) z += '.min(1)'
      break
    case 'email': z = 'z.email()'; break
    case 'integer':
      z = `z.number().int()${f.min != null ? `.min(${f.min})` : ''}${f.max != null ? `.max(${f.max})` : ''}`
      break
    // Money never becomes a float (A-07): validate the string form instead.
    case 'decimal': z = `decimalString(${f.maxDigits ?? 18}, ${f.decimalPlaces ?? 2})`; break
    case 'boolean': z = 'z.boolean()'; break
    case 'date': z = 'z.iso.date()'; break
    case 'datetime': z = 'z.iso.datetime({ offset: true })'; break
    case 'enum': z = `z.enum([${(f.choices ?? []).map(c => JSON.stringify(c.value)).join(', ')}])`; break
    case 'relation': z = 'z.uuid()'; break
    case 'file': z = 'z.string()'; break
    default: z = 'z.unknown()'
  }
  return f.required ? z : `${z}.nullish()`
}

const pascal = (s: string) => s.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase())
const constant = (name: string, value: unknown) => `export const ${name} = ${JSON.stringify(value, null, 2)} as const`

export function renderContract(contract: Contract): string {
  const models = Object.entries(contract.models)
  const fields = models.flatMap(([, m]) => m.fields)
  const out: string[] = [
    `// AUTO-GENERATED from contract/ac-contract.json (contract ${contract.meta.contractVersion}) by tools/gen-contract.mts — do not edit.`,
  ]
  if (models.length) out.push(`import { z } from 'zod'`, `import type { ModelMeta } from '@/lib/contract/types'`)
  if (fields.some(f => f.type === 'decimal')) out.push(`import { decimalString } from '@/lib/contract/decimal'`)

  out.push(
    `export const CONTRACT_VERSION = ${JSON.stringify(contract.meta.contractVersion)}`,
    `export const API_BASE = ${JSON.stringify(contract.meta.apiBase)}`,
    constant('auth', contract.auth),
    constant('limits', contract.limits),
    constant('listQuery', contract.listQuery),
    constant('locales', contract.locales),
    constant('richText', contract.richText),
    `export type Locale = (typeof locales)['supported'][number]['value']`,
    constant('errors', contract.errors),
    `export type ErrorCode = keyof typeof errors`,
    constant('roles', Object.keys(contract.policies.roles)),
    `export type Role = (typeof roles)[number]`,
    // What each role may do: the client mirrors it to show or hide controls; the API decides.
    constant('rolePermissions', contract.policies.roles),
  )

  for (const [key, m] of models) {
    const P = pascal(key)
    out.push(`export const ${P}Schema = z.object({`)
    for (const f of m.fields) out.push(`  ${f.name}: ${zodFor(f)},`)
    out.push(`})`, `export type ${P} = z.infer<typeof ${P}Schema>`)
    // Write schema: read-only fields removed, derived once here instead of in every form.
    const ro = m.fields.filter(f => f.readOnly).map(f => `${f.name}: true`).join(', ')
    out.push(`export const ${P}WriteSchema = ${ro ? `${P}Schema.omit({ ${ro} })` : `${P}Schema`}`)
    out.push(`export const ${P}Meta = ${JSON.stringify({ key, ...m }, null, 2)} as const satisfies ModelMeta`)
  }
  const entries = models.map(([k]) => `${k}: () => ({ schema: ${pascal(k)}Schema, write: ${pascal(k)}WriteSchema, meta: ${pascal(k)}Meta })`)
  out.push(`export const registry = {${entries.length ? ` ${entries.join(', ')} ` : ''}} as const`, `export type ModelKey = keyof typeof registry`)
  return out.join('\n') + '\n'
}
