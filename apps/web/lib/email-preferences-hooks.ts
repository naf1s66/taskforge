'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getEmailPreference, updateEmailPreference, type EmailPreference } from './email-preferences-client';
import { useAuth } from './use-auth';

const queryKeyFor = (userId: string | null | undefined) => ['email-preferences', userId ?? 'anonymous'] as const;

export function useEmailPreferenceQuery() {
  const { user } = useAuth();
  const queryKey = queryKeyFor(user?.id);

  return useQuery({
    queryKey,
    queryFn: getEmailPreference,
    enabled: Boolean(user?.id),
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
      queryClient.setQueryData<EmailPreference>(queryKey, (current) => ({
        dailyDigestEnabled,
        dailyDigestTimezone: current?.dailyDigestTimezone ?? previous?.dailyDigestTimezone ?? 'UTC',
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
    },
  });
}
