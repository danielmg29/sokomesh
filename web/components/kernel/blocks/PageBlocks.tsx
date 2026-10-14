import type { ComponentType, ReactNode } from 'react'
import { Grid, Split, Stack } from '@/components/layout/primitives'
import { ChatBlock } from './ChatBlock'
import { ActivityBlock, DetailBlock, RelatedBlock, StatsBlock } from './DataBlocks'
import { FiltersBlock } from './FiltersBlock'
import { HeaderBlock } from './HeaderBlock'
import { ListBlock } from './ListBlock'

export type BlockCtx = { role?: string; now?: string }

/** A page is data: an ordered list of typed blocks (manual 6.8). */
export type BlockSpec = {
  block: string
  props?: Record<string, unknown>
  /** split: [main, aside]; grid: one array per cell. */
  children?: BlockSpec[][]
  /** Presentation only; the API still refuses what a role cannot see. */
  visibleFor?: readonly string[]
  ratio?: 'sidebar' | 'wide-aside' | 'half' | 'media-first' | 'aside-first'
  columns?: 1 | 2 | 3 | 4
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- block props are validated by each block's own types at registration
export type BlockComponent = ComponentType<any>

export const kernelBlocks: Record<string, BlockComponent> = {
  header: HeaderBlock,
  filters: FiltersBlock,
  list: ListBlock,
  detail: DetailBlock,
  stats: StatsBlock,
  activity: ActivityBlock,
  related: RelatedBlock,
  chat: ChatBlock,
}

/** Divergent and project blocks join by registration, never by editing pages. */
export function withBlocks(extra: Record<string, BlockComponent>) {
  return { ...kernelBlocks, ...extra }
}

export function PageBlocks({ page, ctx = {}, registry = kernelBlocks }: { page: readonly BlockSpec[]; ctx?: BlockCtx; registry?: Record<string, BlockComponent> }) {
  return <Stack gap="lg">{page.map((b, i) => <Block key={`${b.block}-${i}`} spec={b} ctx={ctx} registry={registry} />)}</Stack>
}

function Block({ spec, ctx, registry }: { spec: BlockSpec; ctx: BlockCtx; registry: Record<string, BlockComponent> }): ReactNode {
  if (spec.visibleFor && (!ctx.role || !spec.visibleFor.includes(ctx.role))) return null
  if (spec.block === 'split') {
    const [main = [], aside = []] = spec.children ?? []
    return <Split ratio={spec.ratio ?? 'sidebar'}><PageBlocks page={main} ctx={ctx} registry={registry} /><PageBlocks page={aside} ctx={ctx} registry={registry} /></Split>
  }
  if (spec.block === 'grid') {
    return <Grid columns={spec.columns ?? 2}>{(spec.children ?? []).map((c, i) => <PageBlocks key={i} page={c} ctx={ctx} registry={registry} />)}</Grid>
  }
  const Component = registry[spec.block]
  if (!Component) throw new Error(`Unknown block "${spec.block}": register it before using it in a page definition`)
  return <Component {...spec.props} now={ctx.now} />
}

export const blockNames = () => ['split', 'grid', ...Object.keys(kernelBlocks)]
