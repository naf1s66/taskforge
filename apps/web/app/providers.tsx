'use client';

import type { PropsWithChildren } from 'react';
import { domAnimation, LazyMotion } from 'framer-motion';

import { AuthProvider } from '@/components/auth/auth-provider';

export function Providers({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </AuthProvider>
  );
}
