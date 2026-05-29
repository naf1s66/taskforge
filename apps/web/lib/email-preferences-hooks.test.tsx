import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useEmailPreferenceQuery,
  useUpdateEmailPreferenceMutation,
} from './email-preferences-hooks';

const authMock = vi.hoisted(() => ({
  user: { id: 'user-1' },
  status: 'authenticated',
}));

const getEmailPreferenceMock = vi.hoisted(() => vi.fn());
const updateEmailPreferenceMock = vi.hoisted(() => vi.fn());

vi.mock('./use-auth', () => ({
  useAuth: () => authMock,
}));

vi.mock('./email-preferences-client', () => ({
  getEmailPreference: (...args: unknown[]) => getEmailPreferenceMock(...args),
  updateEmailPreference: (...args: unknown[]) => updateEmailPreferenceMock(...args),
}));

function wrapperWithClient(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('email preference hooks', () => {
  beforeEach(() => {
    authMock.user = { id: 'user-1' };
    authMock.status = 'authenticated';
    getEmailPreferenceMock.mockReset();
    updateEmailPreferenceMock.mockReset();
  });

  it('loads preference for authenticated users', async () => {
    getEmailPreferenceMock.mockResolvedValue({ dailyDigestEnabled: true, dailyDigestTimezone: 'UTC' });

    const queryClient = new QueryClient();
    const { result } = renderHook(() => useEmailPreferenceQuery(), {
      wrapper: wrapperWithClient(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ dailyDigestEnabled: true, dailyDigestTimezone: 'UTC' });
    });
    expect(getEmailPreferenceMock).toHaveBeenCalledTimes(1);
  });

  it('rolls back optimistic toggle when update fails', async () => {
    let rejectUpdate!: (error: Error) => void;
    updateEmailPreferenceMock.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectUpdate = reject;
      }),
    );

    const queryClient = new QueryClient();
    queryClient.setQueryData(['email-preferences', 'user-1'], {
      dailyDigestEnabled: true,
      dailyDigestTimezone: 'America/New_York',
    });

    const { result } = renderHook(() => useUpdateEmailPreferenceMutation(), {
      wrapper: wrapperWithClient(queryClient),
    });

    act(() => {
      result.current.mutate(false);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(['email-preferences', 'user-1'])).toEqual({
        dailyDigestEnabled: false,
        dailyDigestTimezone: 'America/New_York',
      });
    });
    await waitFor(() => {
      expect(updateEmailPreferenceMock).toHaveBeenCalledWith({ dailyDigestEnabled: false });
    });

    act(() => {
      rejectUpdate(new Error('request failed'));
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(['email-preferences', 'user-1'])).toEqual({
        dailyDigestEnabled: true,
        dailyDigestTimezone: 'America/New_York',
      });
    });
  });

  it('uses server value after successful toggle update', async () => {
    updateEmailPreferenceMock.mockResolvedValue({
      dailyDigestEnabled: false,
      dailyDigestTimezone: 'Asia/Tokyo',
    });

    const queryClient = new QueryClient();
    queryClient.setQueryData(['email-preferences', 'user-1'], {
      dailyDigestEnabled: true,
      dailyDigestTimezone: 'UTC',
    });

    const { result } = renderHook(() => useUpdateEmailPreferenceMutation(), {
      wrapper: wrapperWithClient(queryClient),
    });

    result.current.mutate(false);

    await waitFor(() => {
      expect(queryClient.getQueryData(['email-preferences', 'user-1'])).toEqual({
        dailyDigestEnabled: false,
        dailyDigestTimezone: 'Asia/Tokyo',
      });
    });
  });
});
