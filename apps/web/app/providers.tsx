'use client';

import { SessionProvider } from 'next-auth/react';
import { domAnimation, LazyMotion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </SessionProvider>
  );
}
