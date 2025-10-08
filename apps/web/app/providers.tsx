'use client';

import { domAnimation, LazyMotion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

export function Providers({ children }: PropsWithChildren) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
