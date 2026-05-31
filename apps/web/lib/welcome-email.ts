import 'server-only';

import { getApiUrl } from './env';

export interface WelcomeEmailUser {
  id: string;
  email?: string | null;
}

function getBridgeSecret() {
  const secret = process.env.SESSION_BRIDGE_SECRET;
  if (!secret) {
    throw new Error('SESSION_BRIDGE_SECRET is not configured');
  }
  return secret;
}

export async function scheduleWelcomeEmail(user: WelcomeEmailUser): Promise<void> {
  const response = await fetch(getApiUrl('v1/auth/welcome-email'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-session-bridge-secret': getBridgeSecret(),
    },
    cache: 'no-store',
    body: JSON.stringify({
      userId: user.id,
      email: user.email ?? undefined,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'unknown error');
    throw new Error(`Failed to schedule welcome email: ${response.status} ${message}`);
  }
}
