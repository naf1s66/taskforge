'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';

function UserAvatar({ name, image }: { name?: string | null; image?: string | null }) {
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
  const { data: session, status } = useSession();
  const [isSigningOut, startSignOut] = useTransition();

  return (
    <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">TaskForge</div>
        <h1 className="text-3xl font-semibold text-foreground">Plan. Execute. Ship.</h1>
        <p className="text-sm text-muted-foreground">Day 2 · Auth scaffolding ready for OAuth hand-off.</p>
      </div>
      <div className="flex items-center gap-4">
        {status === 'loading' && (
          <div className="h-10 w-32 animate-pulse rounded-full bg-border/60" />
        )}
        {status !== 'loading' && session?.user && (
          <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-3 py-2">
            <UserAvatar name={session.user.name} image={session.user.image} />
            <div className="flex min-w-[8rem] flex-col leading-tight">
              <span className="text-sm font-medium text-foreground">{session.user.name ?? 'Signed in'}</span>
              {session.user.email && <span className="text-xs text-muted-foreground">{session.user.email}</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border/60"
              disabled={isSigningOut}
              onClick={() =>
                startSignOut(() =>
                  signOut({
                    callbackUrl: '/login',
                  }),
                )
              }
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        )}
        {status !== 'loading' && !session?.user && (
          <Button asChild size="sm" className="rounded-full">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
