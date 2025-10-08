'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import type { OAuthProviderId } from '@/lib/auth';

interface ProviderButtonConfig {
  id: OAuthProviderId;
  label: string;
  icon: ReactNode;
}

interface OAuthSignInProps {
  providers: ProviderButtonConfig[];
}

export function OAuthSignIn({ providers }: OAuthSignInProps) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProviderId | null>(null);

  const handleSignIn = (providerId: OAuthProviderId) => {
    setPendingProvider(providerId);
    void signIn(providerId, { callbackUrl: '/' });
  };

  return (
    <div className="flex flex-col gap-3">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          variant="outline"
          className="w-full justify-start gap-3 border-border/60 bg-card/40 text-foreground hover:bg-card/60"
          onClick={() => handleSignIn(provider.id)}
          disabled={pendingProvider !== null}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/40 text-sm text-muted-foreground">
            {provider.icon}
          </span>
          <span className="text-sm font-medium">
            {pendingProvider === provider.id ? 'Redirecting…' : provider.label}
          </span>
        </Button>
      ))}
    </div>
  );
}
