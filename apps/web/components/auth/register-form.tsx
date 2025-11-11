'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getApiUrl } from '@/lib/env';

const registerSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string({ required_error: 'Confirm your password' }).min(8, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

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
    // ignore decode errors and fall back to default
  }

  return '/dashboard';
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromParam = searchParams?.get('from');
  const redirectPath = useMemo(() => sanitizeReturnPath(fromParam), [fromParam]);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = useCallback(
    async (values: RegisterValues) => {
      setFormError(null);
      setIsSubmitting(true);

      const payloadToSend = { email: values.email, password: values.password };

      try {
        const response = await fetch(getApiUrl('v1/auth/register'), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify(payloadToSend),
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; details?: { fieldErrors?: Record<string, string[]> } }
          | { user?: { email?: string | null } }
          | null;

        if (!response.ok) {
          if (response.status === 400 && payload && 'details' in payload && payload.details?.fieldErrors) {
            const entries = Object.entries(payload.details.fieldErrors);
            for (const [field, messages] of entries) {
              if (field in payloadToSend && Array.isArray(messages) && messages.length > 0) {
                const key = field === 'password' ? 'password' : (field as keyof RegisterValues);
                form.setError(key, { message: messages[0] });
              }
            }
          }

          const defaultMessage =
            response.status >= 500
              ? 'We could not create your account due to a server issue. Please try again shortly.'
              : 'Unable to create an account right now.';
          const message = (payload && 'error' in payload && payload.error) || defaultMessage;

          if (response.status === 409) {
            form.setError('email', { message: 'An account with this email already exists.' });
          }

          setFormError(message);
          return;
        }

        router.push(redirectPath);
        router.refresh();
      } catch (error) {
        console.error('[auth] Registration request failed', error);
        setFormError('We could not create your account. Please check your connection and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, redirectPath, router],
  );

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Create your TaskForge account</h1>
        <p className="text-sm text-muted-foreground">Start planning sprints, managing tasks, and shipping faster.</p>
      </div>
      <Form {...form}>
        <form
          className="space-y-4 text-left"
          onSubmit={form.handleSubmit(handleSubmit)}
          noValidate
          aria-busy={isSubmitting}
        >
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
                  <Input type="password" autoComplete="new-password" placeholder="At least 8 characters" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" placeholder="Repeat your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" /> Create account
              </>
            )}
          </Button>
          <p aria-live="polite" className="sr-only">
            {isSubmitting
              ? 'Submitting your registration request.'
              : formError
                ? `Registration failed: ${formError}`
                : 'Registration form ready.'}
          </p>
        </form>
      </Form>
      {formError && (
        <Alert variant="destructive">
          <AlertTitle>Registration failed</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}

