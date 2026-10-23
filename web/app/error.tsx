'use client'

// A page that failed while rendering: say so plainly and offer to try again, keeping the header and footer of
// whichever layout the page sits in. Data errors are handled on the page (ErrorState with the API's code).

import { ErrorState } from '@/components/kernel/feedback/ErrorState'

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState kind="retryable" title="This page did not load" onRetry={reset}
        detail={<>Something went wrong while showing it. Try again; if it keeps happening, quote {error.digest ? <code className="font-mono">{error.digest}</code> : 'the time'} to support.</>} />
    </div>
  )
}
