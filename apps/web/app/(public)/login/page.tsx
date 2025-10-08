import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Sign in • TaskForge',
  description: 'Enter your credentials to access the TaskForge dashboard.',
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-border/60 bg-background/40 p-6 shadow-xl shadow-black/20 backdrop-blur lg:flex-row lg:p-10">
      <aside className="flex flex-1 flex-col justify-between gap-6 rounded-2xl border border-border/50 bg-card/50 p-6 text-sm text-muted-foreground">
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
            <ArrowLeft className="h-3 w-3" />
            Back home
          </Link>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Ship faster with TaskForge</h2>
            <p>
              Organize tasks, prioritize what matters, and keep collaborators focused with a shared, real-time board.
            </p>
          </div>
        </div>
        <ul className="space-y-2 text-xs">
          <li className="flex items-center gap-2 text-muted-foreground/80">
            <span className="text-muted-foreground/40">•</span> Secure password-based login powered by our API
          </li>
          <li className="flex items-center gap-2 text-muted-foreground/80">
            <span className="text-muted-foreground/40">•</span> Session persists across refreshes for smooth workflows
          </li>
          <li className="flex items-center gap-2 text-muted-foreground/80">
            <span className="text-muted-foreground/40">•</span> Optimized for mobile with large tap targets
          </li>
        </ul>
      </aside>
      <Card className="flex-1 border-border/70 bg-card/80">
        <CardContent className="p-6">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
