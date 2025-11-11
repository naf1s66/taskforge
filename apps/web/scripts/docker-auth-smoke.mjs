#!/usr/bin/env node

const now = Date.now();
const email = `docker-smoke+${now}@example.com`;
const password = 'Taskforge!1';

function ensureBase(base) {
  if (!base) {
    return 'http://api:4000/api/taskforge';
  }
  return base.replace(/\/$/, '');
}

function join(base, path) {
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return new URL(path, normalized).toString();
}

async function jsonOrThrow(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON (${response.status}): ${text}`);
  }
}

async function registerOrLogin(authBaseUrl) {
  const payload = { email, password };
  const headers = { 'content-type': 'application/json' };
  const registerUrl = join(authBaseUrl, 'register');
  const registerResponse = await fetch(registerUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (registerResponse.ok) {
    return jsonOrThrow(registerResponse);
  }

  if (registerResponse.status !== 409) {
    const body = await registerResponse.text();
    throw new Error(`Register failed (${registerResponse.status}): ${body}`);
  }

  const loginUrl = join(authBaseUrl, 'login');
  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!loginResponse.ok) {
    const body = await loginResponse.text();
    throw new Error(`Login failed (${loginResponse.status}): ${body}`);
  }

  return jsonOrThrow(loginResponse);
}

async function bridgeSession(authBaseUrl, user) {
  const secret = process.env.SESSION_BRIDGE_SECRET;
  if (!secret) {
    throw new Error('SESSION_BRIDGE_SECRET is not configured inside the web container');
  }

  const bridgeUrl = join(authBaseUrl, 'session-bridge');
  const response = await fetch(bridgeUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-session-bridge-secret': secret,
    },
    body: JSON.stringify({ userId: user.id, email: user.email }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Session bridge failed (${response.status}): ${body}`);
  }

  return jsonOrThrow(response);
}

async function fetchMe(apiBaseUrl, token) {
  const meUrl = join(apiBaseUrl, 'v1/me');
  const response = await fetch(meUrl, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fetching /me failed (${response.status}): ${body}`);
  }

  return jsonOrThrow(response);
}

async function main() {
  const base = ensureBase(process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL);
  const authBase = join(base, 'v1/auth/');

  const registerResult = await registerOrLogin(authBase);
  const user = registerResult?.user;
  const tokens = registerResult?.tokens;

  if (!user?.id) {
    throw new Error('Register/Login response did not include a user id');
  }

  const bridgeResult = await bridgeSession(authBase, user);
  const bridgedToken = bridgeResult?.tokens?.accessToken ?? tokens?.accessToken;

  if (!bridgedToken) {
    throw new Error('No access token available after session bridge');
  }

  const meResult = await fetchMe(base, bridgedToken);
  if (!meResult?.user?.id || meResult.user.id !== user.id) {
    throw new Error('Auth smoke test did not return the expected user');
  }

  console.log('✅ Auth smoke test succeeded for user %s', user.email);
}

main().catch((error) => {
  console.error('❌ Auth smoke test failed');
  console.error(error);
  process.exit(1);
});
