'use client';

import { useState, type PropsWithChildren } from 'react';
import { SessionProvider } from 'next-auth/react';
import { domAnimation, LazyMotion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/lib/use-auth';

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              if ((error as Error | undefined)?.name === 'TaskClientError') {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <LazyMotion features={domAnimation}>{children}</LazyMotion>
        </QueryClientProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
