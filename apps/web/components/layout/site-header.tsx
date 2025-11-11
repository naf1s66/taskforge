'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo, useTransition } from 'react';
import { signOut } from 'next-auth/react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/use-auth';

function UserAvatar({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? 'Account avatar'}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full border border-border/60 object-cover"
      />
    );
  }

  const initials = name
    ?.split(' ')
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted text-sm font-medium uppercase text-muted-foreground">
      {initials || 'TF'}
    </div>
  );
}

export function SiteHeader() {
  const { user, status, error, isLoading, refresh } = useAuth();
  const [isSigningOut, startSignOut] = useTransition();

  const displayName = user?.name || user?.email || 'Account';
  const retryDisabled = isLoading;
  const statusMessage = useMemo(() => {
    switch (status) {
      case 'loading':
        return 'Checking your session status.';
      case 'authenticated':
        return `Signed in as ${displayName}.`;
      case 'error':
        return error ?? 'We could not verify your session.';
      default:
        return 'You are not signed in.';
    }
  }, [displayName, error, status]);

  const handleRetry = useCallback(() => {
    if (!retryDisabled) {
      refresh();
    }
  }, [refresh, retryDisabled]);

  return (
    <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">TaskForge</div>
        <h1 className="text-3xl font-semibold text-foreground">Plan. Execute. Ship.</h1>
        <p className="text-sm text-muted-foreground">Day 2 · Auth scaffolding ready for OAuth hand-off.</p>
        <p aria-live="polite" className="sr-only">
          {statusMessage}
        </p>
      </div>
      <div className="flex items-center gap-4">
        {status === 'loading' && <div className="h-10 w-32 animate-pulse rounded-full bg-border/60" />}
        {status === 'authenticated' && user && (
          <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-3 py-2">
            <UserAvatar name={displayName} image={user.image ?? null} />
            <div className="flex min-w-[8rem] flex-col leading-tight">
              <span className="text-sm font-medium text-foreground">{displayName}</span>
              {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border/60"
              disabled={isSigningOut}
              onClick={() =>
                startSignOut(() => {
                  void (async () => {
                    try {
                      await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json', 'x-requested-with': 'fetch' },
                        credentials: 'include',
                        body: JSON.stringify({}),
                      });
                    } catch (error) {
                      console.error('[auth] Failed to clear API session', error);
                    } finally {
                      await signOut({ callbackUrl: '/login' });
                    }
                  })();
                })
              }
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        )}
        {status === 'error' && (
          <div className="flex w-full max-w-xs flex-col gap-3" aria-live="assertive">
            <Alert variant="destructive">
              <AlertTitle>Session error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleRetry} disabled={retryDisabled}>
                {retryDisabled ? 'Retrying…' : 'Retry'}
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        )}
        {status === 'idle' && (
          <Button asChild size="sm" className="rounded-full">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
