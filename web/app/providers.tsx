'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/overlay'
import { ToastProvider } from '@/components/ui/toast'
import { ApiError } from '@/lib/client/api'

/** Client-side data cache for signed-in pages: one QueryClient per browser tab, bounded retries. */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Retry only what the contract says is retryable, and at most twice.
            retry: (count, err) => count < 2 && (!(err instanceof ApiError) || err.error.retryable),
            refetchOnWindowFocus: false,
            gcTime: 5 * 60_000,
          },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ToastProvider>{children}</ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
