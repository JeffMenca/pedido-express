import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ApiError } from '../shared/http/client'
import { AuthProvider } from '../features/auth'
import { router } from './router'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Polling already retries every 3 s; client errors will not fix themselves.
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  })
}

export function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  )
}
