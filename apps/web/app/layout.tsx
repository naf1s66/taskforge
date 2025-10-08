import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';

import { SiteHeader } from '@/components/layout/site-header';
import { Providers } from './providers';
import '../styles/globals.css';

import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'TaskForge',
  description: 'Task management with a dark, animated UI.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background text-foreground antialiased', inter.variable)}>
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
            <SiteHeader />
            <main className="flex-1 py-8">{children}</main>
            <footer className="pt-6 text-sm text-muted-foreground">Build momentum, one task at a time.</footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
