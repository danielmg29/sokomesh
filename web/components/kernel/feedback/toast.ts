import type { ToastInput } from '@/components/ui/toast'
import { errors } from '@/lib/contract/generated'
import type { ActionMeta, AppError } from '@/lib/contract/types'

/** Toast for an API error: message and retry affordance come from the contract's errors block. */
export function toastForError(error: AppError, retry?: () => void): ToastInput {
  const spec = (errors as Record<string, { message: string; retryable: boolean }>)[error.code]
  const retryable = error.retryable || spec?.retryable
  return {
    tone: error.code === 'CONFLICT' || error.code === 'RATE_LIMITED' ? 'warning' : 'danger',
    title: spec?.message ?? 'Something went wrong.',
    description: error.detail && error.detail !== spec?.message ? error.detail : undefined,
    action: retryable && retry ? { label: 'Try again', onAction: retry, altText: 'Try the action again' } : undefined,
  }
}

/** Toast for a completed command, named by the action it confirms. */
export function toastForAction(action: Pick<ActionMeta, 'label'>, subject: string, detail?: string): ToastInput {
  return { tone: 'success', title: `${action.label}: ${subject}`, description: detail }
}
