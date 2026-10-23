'use client'

// SM-F-03, marketplace administrators: category contracts. Drafts are edited in the builder and saved
// through the API, which checks the definition; publishing replaces the category's published version
// (the previous one is retired, never edited) and every derived surface follows: seller fields, buyer
// filters, comparison rows and product cards.

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ActionBar } from '@/components/kernel/actions/ActionBar'
import { HeaderBlock } from '@/components/kernel/blocks/HeaderBlock'
import { ListBlock } from '@/components/kernel/blocks/ListBlock'
import { ErrorState, errorFrom } from '@/components/kernel/feedback/ErrorState'
import { LoadingState } from '@/components/kernel/feedback/LoadingState'
import { PageSection } from '@/components/layout/section'
import { CategoryContractBuilder, definitionFromDraft, draftFromRecord, type SaveOutcome } from '@/features/categories/CategoryContractBuilder'
import { ApiError, api } from '@/lib/client/api'
import type { CategoryContractRecord } from '@/lib/client/records'
import { useCommand, useRecord, useSave, useSource } from '@/lib/client/resources'
import { CategoryContractMeta, CategoryMeta, ProductMeta, VariantMeta } from '@/lib/contract/generated'
import type { ActionMeta, Rec } from '@/lib/contract/types'
import { formatDate } from '@/lib/format'

/** The marketplace's packaging units, from the contract's variant field (the API's own list). */
const units = (VariantMeta.fields.find(f => f.name === 'packaging_unit')?.choices ?? []).map(c => ({ value: c.value, label: c.label }))

export function AdminContracts() {
  const source = useSource(CategoryContractMeta)
  const command = useCommand(CategoryContractMeta, [CategoryMeta])
  return (
    <>
      <HeaderBlock level={1} source="explicit" title="Category contracts"
        description="Each category's attributes, units, buyer filters, comparison rows and display hints, by version. Open a draft to edit it; start a new draft from a published version to change a category." />
      <ListBlock meta={CategoryContractMeta} records={[]} query="server" source={source} onRun={command.run} href={r => `/admin/categories/${r.id}`}
        empty={{ kind: 'no-data', title: 'No category contracts yet', description: 'Contracts appear here when a category is set up.' }} />
    </>
  )
}

export function AdminContract({ id }: { id: string }) {
  const record = useRecord<CategoryContractRecord>(CategoryContractMeta, id)
  const command = useCommand(CategoryContractMeta, [CategoryMeta, ProductMeta])
  const save = useSave(CategoryContractMeta)
  const router = useRouter()
  if (record.isPending) return <LoadingState variant="skeleton" shape="detail" label="Loading the contract" />
  if (record.isError || !record.data) return <ErrorState {...errorFrom(record.error)} title="The contract did not load" onRetry={() => void record.refetch()} />
  const c = record.data
  // A new draft is a new record: open it once the API has made it.
  const run = async (action: ActionMeta, rec: Rec, input?: Record<string, unknown>) => {
    if (action.name !== 'revise') return command.run(action, rec, input)
    try {
      const draft = await api<CategoryContractRecord>(`${CategoryContractMeta.path}/${rec.id}/revise`, { method: 'POST', body: {} })
      router.push(`/admin/categories/${draft.id}` as Route)
    } catch (err) {
      throw err instanceof ApiError ? err.error : err
    }
  }
  const onSave = async (draft: Parameters<typeof definitionFromDraft>[0]): Promise<SaveOutcome> => {
    try {
      await save.mutateAsync({ ref: c.id, body: definitionFromDraft(draft) })
      return { ok: true }
    } catch (err) {
      const e = err instanceof ApiError ? err.error : null
      return { ok: false, detail: e?.detail ?? 'The draft was not saved. Try again in a moment.', fields: e?.fields ?? {} }
    }
  }
  return (
    <>
      <HeaderBlock level={1} source="explicit" title={`${c.name}, version ${c.version}`}
        breadcrumbs={[{ label: 'Category contracts', href: '/admin/categories' }, { label: `${c.name} v${c.version}` }]}
        description={c.status === 'draft' ? 'A draft: edit it, save it, then publish it to replace the published version.' : c.status === 'published' ? 'The version sellers fill in and buyers filter by now.' : 'A retired version, kept for the products that still use it.'} />
      <CategoryContractBuilder key={`${c.id}-${c.updated_at}`} category={c.category.label} version={c.version} status={c.status} initial={draftFromRecord(c)} units={units}
        problems={c.problems} onSave={c.status === 'draft' ? onSave : undefined} saving={save.isPending}
        actions={<ActionBar meta={CategoryContractMeta} record={c} onRun={run} pending={command.pending} inline={2} />} />
      <PageSection title="History" description="Versions are numbered per category and never change once published.">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-md sm:grid-cols-3">
          <div><dt className="text-sm text-muted">Previous version</dt><dd>{c.predecessor ? <Link href={`/admin/categories/${c.predecessor.id}` as Route} className="text-primary hover:underline">{c.predecessor.label}</Link> : 'None: the first version'}</dd></div>
          <div><dt className="text-sm text-muted">Published</dt><dd>{c.published_at ? `${formatDate(c.published_at)}${c.published_by ? ` by ${c.published_by.label}` : ''}` : 'Not yet'}</dd></div>
          <div><dt className="text-sm text-muted">Products on this version</dt><dd className="tabular">{c.product_count}</dd></div>
        </dl>
        <p className="mt-3 text-md"><Link href={`/catalogue/${c.category_slug}` as Route} className="font-semibold text-primary hover:underline">Open the category in the catalogue</Link></p>
      </PageSection>
    </>
  )
}
