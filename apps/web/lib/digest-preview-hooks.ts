'use client';

import { useQuery } from '@tanstack/react-query';

import { getDigestPreview } from './digest-preview-client';
import { useAuth } from './use-auth';

export function useDigestPreviewQuery() {
  const { user, status } = useAuth();

  return useQuery({
    queryKey: ['email-digest-preview', user?.id ?? 'anonymous'],
    queryFn: getDigestPreview,
    enabled: status === 'authenticated' && Boolean(user?.id),
  });
}
