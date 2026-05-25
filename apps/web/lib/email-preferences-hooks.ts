'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getEmailPreference, updateEmailPreference, type EmailPreference } from './email-preferences-client';
import { useAuth } from './use-auth';

const queryKeyFor = (userId: string | null | undefined) => ['email-preferences', userId ?? 'anonymous'] as const;
const FALLBACK_USER_KEY = 'anonymous';

export function useEmailPreferenceQuery() {
  const { user, status } = useAuth();
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);
  const queryKey = queryKeyFor(user?.id);

  useEffect(() => {
    if (status !== 'authenticated') {
      queryClient.removeQueries({ queryKey: queryKeyFor(FALLBACK_USER_KEY) });
    }
  }, [queryClient, status]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const nextUserId = user?.id ?? null;

    if (previousUserId && previousUserId !== nextUserId) {
      queryClient.removeQueries({ queryKey: queryKeyFor(previousUserId) });
    }

    previousUserIdRef.current = nextUserId;
  }, [queryClient, user?.id]);

  return useQuery({
    queryKey,
    queryFn: getEmailPreference,
    enabled: status === 'authenticated' && Boolean(user?.id),
  });
}

export function useUpdateEmailPreferenceMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeyFor(user?.id);

  return useMutation({
    mutationFn: (dailyDigestEnabled: boolean) => updateEmailPreference({ dailyDigestEnabled }),
    onMutate: async (dailyDigestEnabled) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<EmailPreference>(queryKey);
      const hadPrevious = previous !== undefined;
      queryClient.setQueryData<EmailPreference>(queryKey, (current) => ({
        dailyDigestEnabled,
        dailyDigestTimezone: current?.dailyDigestTimezone ?? previous?.dailyDigestTimezone ?? 'UTC',
      }));
      return { previous, hadPrevious };
    },
    onError: (_error, _variables, context) => {
      if (context?.hadPrevious) {
        queryClient.setQueryData(queryKey, context.previous);
      } else {
        queryClient.removeQueries({ queryKey, exact: true });
      }
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
    },
  });
}
