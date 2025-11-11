import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, beforeAll, afterAll, expect } from 'vitest';

import { LoginForm } from './login-form';
import type { AuthProviderSummary } from '@/lib/auth-config';

const mockRouter = {
  push: vi.fn(),
  refresh: vi.fn(),
};

const mockSignIn = vi.fn();
let searchParamsString = '';

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock('@/lib/env', () => ({
  getApiUrl: (path: string) => {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    return `http://localhost/${normalized}`;
  },
}));

const providers: AuthProviderSummary[] = [
  { id: 'google', name: 'Google', type: 'oauth' },
];

const fetchMock = vi.fn();

beforeAll(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  searchParamsString = '';
  mockRouter.push.mockReset();
  mockRouter.refresh.mockReset();
  mockSignIn.mockReset();
  fetchMock.mockReset();
});

describe('LoginForm', () => {
  it('surfaces the session bridge notice when reason param is present', () => {
    searchParamsString = 'reason=session-bridge';

    render(<LoginForm providers={providers} />);

    expect(
      screen.getByText(/your session expired. please sign in again/i),
    ).toBeInTheDocument();
  });

  it('submits credentials and redirects on success', async () => {
    searchParamsString = 'from=%2Fdashboard';

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { email: 'demo@taskforge.dev' },
        tokens: { accessToken: 'token' },
      }),
    } as Response);

    render(<LoginForm providers={providers} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'demo@taskforge.dev');
    await user.type(screen.getByLabelText(/password/i), 'Demo1234!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost/v1/auth/login',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('shows validation feedback when the API rejects credentials', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'Invalid credentials',
      }),
    } as Response);

    render(<LoginForm providers={providers} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'demo@taskforge.dev');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/sign-in failed/i).length).toBeGreaterThan(0);
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
