import { describe, expect, test } from 'vitest'
import artefact from '../../../contract/ac-contract.json'
import { renderContract } from '../../tools/contract.mts'
import { decimalString } from '@/lib/contract/decimal'
import { CONTRACT_VERSION, errors, limits, listQuery, locales, richText, roles } from '@/lib/contract/generated'
import type { Contract } from '@/lib/contract/types'

const contract = artefact as Contract

describe('generated client matches the committed artefact', () => {
  test('version, limits, locales, errors and roles', () => {
    expect(CONTRACT_VERSION).toBe(contract.meta.contractVersion)
    expect(limits).toEqual(contract.limits)
    expect(listQuery).toEqual(contract.listQuery)
    expect(locales).toEqual(contract.locales)
    expect(richText).toEqual(contract.richText)
    expect(errors).toEqual(contract.errors)
    expect([...roles]).toEqual(Object.keys(contract.policies.roles))
  })

  test('generation is deterministic', () => {
    expect(renderContract(contract)).toBe(renderContract(structuredClone(contract)))
  })
})

describe('model rendering', () => {
  const withModel: Contract = {
    ...contract,
    models: {
      price_rule: {
        label: 'Price rule',
        list: { fields: ['name'], defaultPageSize: 25, maxPageSize: 100 },
        fields: [
          { name: 'id', type: 'uuid', widget: 'hidden', readOnly: true },
          { name: 'name', type: 'string', widget: 'text', required: true, maxLength: 120 },
          { name: 'amount', type: 'decimal', widget: 'currency', maxDigits: 12, decimalPlaces: 2 },
          { name: 'status', type: 'enum', widget: 'status', choices: [{ value: 'draft', label: 'Draft' }] },
        ],
      },
    },
  }
  const out = renderContract(withModel)

  test('maps types to zod and keeps money as strings', () => {
    expect(out).toContain('name: z.string().max(120).min(1),')
    expect(out).toContain('amount: decimalString(12, 2).nullish(),')
    expect(out).toContain('status: z.enum(["draft"]).nullish(),')
    expect(out).toContain("import { decimalString } from '@/lib/contract/decimal'")
  })

  test('derives the write schema by omitting read-only fields', () => {
    expect(out).toContain('export const PriceRuleWriteSchema = PriceRuleSchema.omit({ id: true })')
  })
})

describe('decimalString', () => {
  const money = decimalString(10, 2)
  test.each(['0', '12.5', '12345678.90', '-3.25'])('accepts %s', v => {
    expect(money.safeParse(v).success).toBe(true)
  })
  test.each(['1.234', '123456789', '1e3', '12.', ''])('rejects %s', v => {
    expect(money.safeParse(v).success).toBe(false)
  })
})
