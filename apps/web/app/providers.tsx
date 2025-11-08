'use client';

import type { PropsWithChildren } from 'react';
import { SessionProvider } from 'next-auth/react';
import { domAnimation, LazyMotion } from 'framer-motion';

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </SessionProvider>
  );
}
