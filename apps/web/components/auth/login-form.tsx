'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Info, Loader2, LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getApiBaseUrl } from '@/lib/env';
import type { AuthProviderSummary } from '@/lib/auth-config';

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;

function sanitizeReturnPath(value: string | null | undefined) {
  if (!value) {
    return '/dashboard';
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('/') && !decoded.startsWith('//')) {
      return decoded;
    }
  } catch {
    // ignore decode failures and fall back to default
  }

  return '/dashboard';
}

type LoginFormProps = {
  providers: ReadonlyArray<AuthProviderSummary>;
};

export function LoginForm({ providers }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromParam = searchParams?.get('from');
  const reasonParam = searchParams?.get('reason');
  const redirectPath = useMemo(() => sanitizeReturnPath(fromParam), [fromParam]);
  const reasonMessage = useMemo(() => {
    if (!reasonParam) {
      return null;
    }

    switch (reasonParam) {
      case 'session-bridge':
        return 'Your session expired. Please sign in again to continue where you left off.';
      default:
        return null;
    }
  }, [reasonParam]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleProviderSignIn = useCallback(
    async (providerId: string) => {
      setActiveProvider(providerId);

      try {
        await signIn(providerId, { callbackUrl: redirectPath });
      } finally {
        setActiveProvider(null);
      }
    },
    [redirectPath],
  );

  const handleSubmit = useCallback(
    async (values: LoginValues) => {
      setFormError(null);
      setIsSubmitting(true);

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/taskforge/v1/auth/login`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify(values),
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; details?: { fieldErrors?: Record<string, string[]> } }
          | { user?: { email?: string | null }; tokens?: { accessToken?: string } }
          | null;

        if (!response.ok) {
          if (response.status === 400 && payload && 'details' in payload && payload.details?.fieldErrors) {
            const entries = Object.entries(payload.details.fieldErrors);
            for (const [field, messages] of entries) {
              if (field in values && Array.isArray(messages) && messages.length > 0) {
                form.setError(field as keyof LoginValues, { message: messages[0] });
              }
            }
          }

          const defaultMessage =
            response.status >= 500
              ? 'We ran into a server issue while signing you in. Please try again in a moment.'
              : 'Unable to sign in with the provided credentials.';
          const message = (payload && 'error' in payload && payload.error) || defaultMessage;

          if (response.status === 401) {
            form.setError('password', { message: 'The email and password combination is incorrect.' });
          }

          setFormError(message);
          return;
        }

        router.push(redirectPath);
        router.refresh();
      } catch (error) {
        console.error('[auth] Login request failed', error);
        setFormError('Something went wrong while signing you in. Please check your connection and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, redirectPath, router],
  );

  const hasProviders = providers.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to access your TaskForge workspace.</p>
      </div>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate aria-busy={isSubmitting}>
          {reasonMessage && (
            <Alert>
              <Info className="h-4 w-4" aria-hidden />
              <AlertTitle>Please sign in again</AlertTitle>
              <AlertDescription>{reasonMessage}</AlertDescription>
            </Alert>
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" /> Sign in
              </>
            )}
          </Button>
          <p aria-live="polite" className="sr-only">
            {isSubmitting
              ? 'Submitting your sign-in request.'
              : formError
                ? `Sign-in failed: ${formError}`
                : 'Sign-in form ready.'}
          </p>
        </form>
      </Form>
      {formError && (
        <Alert variant="destructive">
          <AlertTitle>Sign-in failed</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {hasProviders && (
        <div className="space-y-3">
          <div className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Or continue with</div>
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
                onClick={() => handleProviderSignIn(id)}
              >
                <span className="text-sm font-medium">Continue with {name}</span>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            );
          })}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Need an account?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one now
        </Link>
        .
      </p>
    </div>
  );
}
