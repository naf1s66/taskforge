'use client';

import type { PropsWithChildren } from 'react';
import { domAnimation, LazyMotion } from 'framer-motion';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <Toaster position="top-center" richColors duration={4000} />
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </SessionProvider>
  );
}
