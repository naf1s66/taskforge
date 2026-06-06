import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getFreshBridgedAccessToken: vi.fn(),
  getSessionCookieOptions: vi.fn(() => ({
    name: 'taskforge_session',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })),
  isSessionTokenExpired: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  getApiUrl: (path: string) => `https://api.test/api/taskforge/${path}`,
  SESSION_COOKIE_NAME: 'taskforge_session',
}));

vi.mock('@/lib/server-auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/lib/session-bridge', () => ({
  getFreshBridgedAccessToken: mocks.getFreshBridgedAccessToken,
  getSessionCookieOptions: mocks.getSessionCookieOptions,
  isSessionTokenExpired: mocks.isSessionTokenExpired,
}));

function createRequest(path: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(`https://app.test${path}`, { headers });
}

describe('/auth/session-bridge', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getFreshBridgedAccessToken.mockResolvedValue('minted-token');
    mocks.isSessionTokenExpired.mockReturnValue(false);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('requires an authenticated web user and sanitizes unsafe return paths', async () => {
    const { GET } = await import('./route');

    const response = await GET(createRequest('/auth/session-bridge?from=%2F%2Fevil.test%2Fdashboard'));
    const locationHeader = response.headers.get('location') ?? '';
    const location = new URL(locationHeader, 'https://app.test');

    expect(locationHeader).toBe('/login?from=%2F&reason=session-bridge');
    expect(location.origin).toBe('https://app.test');
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('from')).toBe('/');
    expect(location.searchParams.get('reason')).toBe('session-bridge');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.getFreshBridgedAccessToken).not.toHaveBeenCalled();
  });

  it('probes a non-expired existing API cookie before redirecting without minting', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ user: { id: 'user-1' } }), { status: 200 }));
    const { GET } = await import('./route');

    const response = await GET(createRequest('/auth/session-bridge?from=/dashboard', {
      cookie: 'taskforge_session=existing-token',
    }));
    const locationHeader = response.headers.get('location') ?? '';
    const location = new URL(locationHeader, 'https://app.test');

    expect(locationHeader).toBe('/dashboard');
    expect(location.pathname).toBe('/dashboard');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetch).toHaveBeenCalledWith('https://api.test/api/taskforge/v1/me', {
      method: 'GET',
      headers: {
        cookie: 'taskforge_session=existing-token',
      },
      cache: 'no-store',
    });
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.getFreshBridgedAccessToken).not.toHaveBeenCalled();
  });

  it('mints and sets the API session cookie for an authenticated web user', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    const { GET } = await import('./route');

    const response = await GET(createRequest('/auth/session-bridge?from=/dashboard'));
    const locationHeader = response.headers.get('location') ?? '';
    const location = new URL(locationHeader, 'https://app.test');
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(locationHeader).toBe('/dashboard');
    expect(location.pathname).toBe('/dashboard');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mocks.getFreshBridgedAccessToken).toHaveBeenCalledWith({ id: 'user-1', email: 'user@example.com' });
    expect(setCookie).toContain('taskforge_session=minted-token');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Max-Age=604800');
  });

  it('replaces an invalid existing API cookie for an authenticated web user', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    const { GET } = await import('./route');

    const response = await GET(createRequest('/auth/session-bridge?from=/dashboard', {
      cookie: 'taskforge_session=stale-token',
    }));

    expect(response.headers.get('set-cookie')).toContain('taskforge_session=minted-token');
    expect(mocks.getFreshBridgedAccessToken).toHaveBeenCalledWith({ id: 'user-1', email: 'user@example.com' });
  });
});
