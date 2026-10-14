import { LoaderCircle } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { Progress, Skeleton } from '@/components/ui/progress'
import { cn } from '@/lib/cn'

type Props =
  | { variant: 'skeleton'; shape: 'list' | 'detail' | 'stat' | 'cards' | 'block'; rows?: number; label?: string; className?: string }
  | { variant: 'inline'; label: string; className?: string }
  | { variant: 'progress'; label: string; value: number | null; max?: number; detail?: string; className?: string }

/** Skeletons reserve the final layout; inline and progress name what is happening. */
export function LoadingState(props: Props) {
  if (props.variant === 'inline') {
    return (
      <span role="status" className={cn('inline-flex items-center gap-2 text-md text-muted', props.className)}>
        <Icon icon={LoaderCircle} className="animate-spin" />{props.label}
      </span>
    )
  }
  if (props.variant === 'progress') {
    return (
      <div role="status" className={cn('flex flex-col gap-1.5', props.className)}>
        <div className="flex justify-between text-sm"><span className="font-semibold">{props.label}</span>{props.detail ? <span className="text-muted tabular">{props.detail}</span> : null}</div>
        <Progress value={props.value} max={props.max} label={props.label} />
      </div>
    )
  }
  const rows = props.rows ?? 4
  const label = props.label ?? 'Loading'
  return (
    <div role="status" aria-label={label} className={cn('w-full', props.className)}>
      <span className="sr-only">{label}</span>
      {props.shape === 'list' ? (
        <div className="flex flex-col divide-y divide-border border border-border bg-surface">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)_6rem] items-center gap-3 px-3 py-3">
              <Skeleton className="size-10" /><div className="flex flex-col gap-1.5"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="h-3 w-2/5" /></div><Skeleton className="h-3.5 w-full" />
            </div>
          ))}
        </div>
      ) : null}
      {props.shape === 'cards' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 border border-border bg-surface p-0 pb-3">
              <Skeleton className="aspect-[4/3] w-full rounded-none" /><Skeleton className="mx-3 h-3.5 w-4/5" /><Skeleton className="mx-3 h-5 w-2/5" />
            </div>
          ))}
        </div>
      ) : null}
      {props.shape === 'detail' ? (
        <div className="flex flex-col gap-4 border border-border bg-surface p-4">
          <Skeleton className="h-7 w-1/2" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{Array.from({ length: rows }, (_, i) => <div key={i} className="flex flex-col gap-1.5"><Skeleton className="h-3 w-1/4" /><Skeleton className="h-4 w-3/4" /></div>)}</div>
        </div>
      ) : null}
      {props.shape === 'stat' ? (
        <div className="grid grid-cols-2 divide-x divide-border border border-border bg-surface sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="flex flex-col gap-2 p-4"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-7 w-3/4" /><Skeleton className="h-3 w-1/3" /></div>)}
        </div>
      ) : null}
      {props.shape === 'block' ? <Skeleton className="h-40 w-full" /> : null}
    </div>
  )
}
