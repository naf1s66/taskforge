'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { AuthProviderSummary } from '@/lib/auth-config';

type LoginFormProps = {
  providers: ReadonlyArray<AuthProviderSummary>;
};

export function LoginForm({ providers }: LoginFormProps) {
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const searchParams = useSearchParams();

  async function handleSignIn(providerId: string) {
    setActiveProvider(providerId);

    try {
      const from = searchParams?.get('from');
      const callbackUrl = from && from.startsWith('/') ? from : '/dashboard';

      await signIn(providerId, { callbackUrl });
    } finally {
      setActiveProvider(null);
    }
  }

  const hasProviders = providers.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Choose an authentication provider to continue to your TaskForge workspace.
        </p>
      </div>
      {!hasProviders && (
        <Alert>
          <AlertTitle>No providers configured</AlertTitle>
          <AlertDescription>
            Add OAuth credentials to your <code>.env.local</code> file or configure them in <code>infra/env/web.env</code> to
            enable sign-in buttons during development.
          </AlertDescription>
        </Alert>
      )}
      {hasProviders && (
        <div className="space-y-3">
          {providers.map((provider) => {
            const { id, name } = provider;
            const isLoading = activeProvider === id;

            return (
              <Button
                key={id}
                type="button"
                variant="outline"
                className="flex w-full items-center justify-between border-border/70"
                disabled={isLoading}
                onClick={() => handleSignIn(id)}
              >
                <span className="text-sm font-medium">Continue with {name}</span>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            );
          })}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Need an account? Sign up with one of the providers above, then return to{' '}
        <Link href="/dashboard" className="font-medium text-primary hover:underline">
          your dashboard
        </Link>
        .
      </p>
    </div>
  );
}
