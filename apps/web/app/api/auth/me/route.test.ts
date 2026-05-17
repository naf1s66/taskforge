import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieGet = vi.fn();
const getCurrentUser = vi.fn();
const getFreshBridgedAccessToken = vi.fn();
const getBridgedAccessToken = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: cookieGet,
  }),
}));

vi.mock('@/lib/env', () => ({
  getApiUrl: () => 'http://api.test/api/taskforge/v1/me',
  SESSION_COOKIE_NAME: 'taskforge_session',
}));

vi.mock('@/lib/dev-auth-bypass', () => ({
  isDevAuthBypassEnabled: () => true,
}));

vi.mock('@/lib/server-auth', () => ({
  getCurrentUser,
}));

vi.mock('@/lib/dev-bypass-client-token', () => ({
  createDevBypassClientToken: () => 'dev-bypass-token',
}));

vi.mock('@/lib/session-bridge', () => ({
  getBridgedAccessToken,
  getFreshBridgedAccessToken,
  getSessionCookieOptions: () => ({
    name: 'taskforge_session',
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
  }),
}));

describe('/api/auth/me', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          user: {
            id: 'stale-cookie-user',
            email: 'stale@example.com',
          },
        }),
      }),
    );
    cookieGet.mockReturnValue({ value: 'stale-api-cookie' });
    getCurrentUser.mockResolvedValue({
      id: 'dev-bypass-user',
      email: 'dev@example.com',
    });
    getFreshBridgedAccessToken.mockRejectedValue(new Error('bridge disabled'));
    getBridgedAccessToken.mockResolvedValue('bridged-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('expires a mismatched API cookie before returning dev bypass client auth', async () => {
    const { GET } = await import('./route');

    const response = await GET();
    const body = await response.json();

    expect(getFreshBridgedAccessToken).toHaveBeenCalledWith({
      id: 'dev-bypass-user',
      email: 'dev@example.com',
    });
    expect(body).toEqual({
      user: {
        id: 'dev-bypass-user',
        email: 'dev@example.com',
      },
      clientAuth: {
        strategy: 'dev-bypass',
        token: 'dev-bypass-token',
      },
    });
    expect(response.headers.get('set-cookie')).toContain(
      'taskforge_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0',
    );
    expect(console.warn).toHaveBeenCalledWith(
      '[auth] Ignoring cookie session that does not match the active dev bypass user.',
    );
    expect(console.error).toHaveBeenCalledWith(
      '[auth] Failed to bridge dev bypass session',
      expect.any(Error),
    );
  });
});
