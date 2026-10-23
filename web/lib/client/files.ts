// Files chosen in a command's form go up first, as private documents (`POST files`), and the command is sent
// with their ids. An upload's own error is reported on the form field that chose the file.

import type { ActionMeta, AppError, Rec } from '../contract/types'
import { ApiError, api } from './api'

type Run = (action: ActionMeta, record: Rec, input?: Record<string, unknown>) => Promise<unknown>

const chosenFile = (v: unknown): File | null =>
  typeof v === 'object' && v !== null && 'file' in v && typeof File !== 'undefined' && (v as { file?: unknown }).file instanceof File ? (v as { file: File }).file : null

export async function uploadDocument(file: File): Promise<{ id: string }> {
  const form = new FormData()
  form.set('file', file)
  form.set('kind', 'document')
  return api<{ id: string }>('files', { method: 'POST', body: form })
}

/** `run` with every chosen file in `input` uploaded first; the API's upload error names the form's field. */
export function withUploads(run: Run): (action: ActionMeta, record: Rec, input?: Record<string, unknown>) => Promise<void> {
  return async (action, record, input) => {
    let body = input
    for (const [name, value] of Object.entries(input ?? {})) {
      const file = chosenFile(value)
      if (!file) continue
      try {
        const stored = await uploadDocument(file)
        body = { ...body, [name]: stored.id }
      } catch (err) {
        if (!(err instanceof ApiError)) throw err
        const { file: problem, ...rest } = err.error.fields ?? {}
        throw { ...err.error, fields: problem ? { ...rest, [name]: problem } : rest } satisfies AppError
      }
    }
    await run(action, record, body)
  }
}
