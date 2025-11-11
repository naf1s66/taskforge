'use client';

import type { PropsWithChildren } from 'react';
import { SessionProvider } from 'next-auth/react';
import { domAnimation, LazyMotion } from 'framer-motion';

import { AuthProvider } from '@/lib/use-auth';

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <AuthProvider>
        <LazyMotion features={domAnimation}>{children}</LazyMotion>
      </AuthProvider>
    </SessionProvider>
  );
}
