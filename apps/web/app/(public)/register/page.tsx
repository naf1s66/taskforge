import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Create account • TaskForge',
  description: 'Register for TaskForge to collaborate on tasks with your team.',
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-border/60 bg-background/40 p-6 shadow-xl shadow-black/20 backdrop-blur lg:flex-row lg:p-10">
      <Card className="flex-1 border-dashed border-primary/40 bg-primary/5">
        <CardContent className="flex h-full flex-col justify-between gap-6 p-6 text-sm text-primary-foreground/90">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-primary">
              <Sparkles className="h-3 w-3" /> New to TaskForge
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Everything you need to start shipping</h2>
              <p>
                Create an account with your preferred identity provider to unlock kanban boards, keyboard shortcuts, and a focused space for your team&apos;s deliverables.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-primary-foreground/80">
            <li className="flex items-center gap-2">
              <span className="text-primary/50">•</span> Personal and shared workspaces
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary/50">•</span> Progress tracking with real-time updates
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary/50">•</span> Built with accessibility and responsiveness in mind
            </li>
          </ul>
        </CardContent>
      </Card>
      <Card className="flex-1 border-border/70 bg-card/80">
        <CardContent className="flex h-full flex-col justify-center gap-6 p-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Sign up through your provider</h1>
            <p className="text-sm text-muted-foreground">
              TaskForge relies on OAuth providers configured for NextAuth. Head to the sign-in page to choose GitHub, Google, or any provider you enable in your environment variables.
            </p>
          </div>
          <Button asChild className="mx-auto w-full max-w-xs">
            <Link href="/login">View sign-in options</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Missing buttons on the login screen? Double-check your <code>NEXTAUTH_SECRET</code> and provider keys in <code>.env.local</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
