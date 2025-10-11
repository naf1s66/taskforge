'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { signOut } from 'next-auth/react';

import { Button } from '@/components/ui/button';

import { useAuth } from '@/hooks/use-auth';

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
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSigningOut, startSignOut] = useTransition();

  return (
    <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">TaskForge</div>
        <h1 className="text-3xl font-semibold text-foreground">Plan. Execute. Ship.</h1>
        <p className="text-sm text-muted-foreground">Day 2 · Auth scaffolding ready for OAuth hand-off.</p>
      </div>
      <div className="flex items-center gap-4">
        {loading && (
          <div className="h-10 w-32 animate-pulse rounded-full bg-border/60" />
        )}
        {!loading && user && (
          <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-3 py-2">
            <UserAvatar name={user.email} image={user.image} />
            <div className="flex min-w-[8rem] flex-col leading-tight">
              <span className="text-sm font-medium text-foreground">{user.email.split('@')[0]}</span>
              <span className="text-xs text-muted-foreground">Member since {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border/60"
              disabled={isSigningOut}
              onClick={() =>
                startSignOut(() => {
                  void signOut({ redirect: false }).finally(() => {
                    router.push('/login');
                    router.refresh();
                  });
                })
              }
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        )}
        {!loading && !user && (
          <Button asChild size="sm" className="rounded-full">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
