import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { renderContract } from './contract.mts'

const SOURCE = join('..', 'contract', 'ac-contract.json')
const TARGET = 'lib/contract/generated.ts'

mkdirSync(dirname(TARGET), { recursive: true })
writeFileSync(TARGET, renderContract(JSON.parse(readFileSync(SOURCE, 'utf8'))))
console.log(`wrote ${TARGET}`)
