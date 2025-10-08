'use client';

import { useTransition } from 'react';
import { signIn } from 'next-auth/react';

import { Button } from '@/components/ui/button';

type DevSignInButtonProps = {
  callbackPath: string;
  email: string;
  label?: string;
};

export function DevSignInButton({ callbackPath, email, label }: DevSignInButtonProps) {
  const [isSigningIn, startSignIn] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={isSigningIn}
      onClick={() =>
        startSignIn(() => {
          void signIn('dev', {
            email,
            callbackUrl: callbackPath,
          });
        })
      }
    >
      {isSigningIn ? 'Signing in…' : label ?? 'Continue in dev mode'}
    </Button>
  );
}
