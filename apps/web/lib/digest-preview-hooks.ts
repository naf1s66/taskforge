'use client';

import { useQuery } from '@tanstack/react-query';

import { getDigestPreview } from './digest-preview-client';
import { useAuth } from './use-auth';

const FALLBACK_USER_KEY = 'anonymous';

export const digestPreviewQueryKeys = {
  all: (userId: string | null | undefined) => ['email-digest-preview', userId ?? FALLBACK_USER_KEY] as const,
};

export function useDigestPreviewQuery() {
  const { user, status } = useAuth();

  return useQuery({
    queryKey: digestPreviewQueryKeys.all(user?.id),
    queryFn: getDigestPreview,
    enabled: status === 'authenticated' && Boolean(user?.id),
  });
}
