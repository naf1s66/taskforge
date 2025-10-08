import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';

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
            <header className="pb-6">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">TaskForge</div>
              <h1 className="text-3xl font-semibold">Day 1 scaffold</h1>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="pt-6 text-sm text-muted-foreground">Build momentum, one task at a time.</footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
