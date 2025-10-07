import type { ReactNode } from 'react';
import '../styles/globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        <div className="max-w-5xl mx-auto p-6">
          <header className="py-4 text-xl font-semibold">TaskForge</header>
          {children}
        </div>
      </body>
    </html>
  )
}
