import { randomUUID } from 'node:crypto';

import type { SuperTest, Test } from 'supertest';

import type { AuthSuccessResponseDTO } from '@taskforge/shared';
import { getSessionCookieName } from '@taskforge/shared';

import { defaultPassword } from './factories';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: AuthSuccessResponseDTO['user'];
  tokens: AuthSuccessResponseDTO['tokens'];
  cookies: string[];
  credentials: AuthCredentials;
}

export interface RegisterTestUserOptions {
  email?: string;
  password?: string;
}

export async function registerTestUser(
  agent: SuperTest<Test>,
  options: RegisterTestUserOptions = {},
): Promise<AuthResult> {
  const credentials: AuthCredentials = {
    email: options.email ?? `user-${randomUUID()}@example.com`,
    password: options.password ?? defaultPassword,
  };

  const response = await agent
    .post('/api/taskforge/v1/auth/register')
    .send(credentials)
    .expect(201);

  return mapAuthResponse(response.body, response.headers['set-cookie'], credentials);
}

export interface LoginTestUserOptions {
  credentials?: AuthCredentials;
}

export async function loginTestUser(
  agent: SuperTest<Test>,
  options: LoginTestUserOptions = {},
): Promise<AuthResult> {
  const credentials =
    options.credentials ?? ({ email: `user-${randomUUID()}@example.com`, password: defaultPassword } as AuthCredentials);

  if (!options.credentials) {
    await agent.post('/api/taskforge/v1/auth/register').send(credentials).expect(201);
  }

  const response = await agent
    .post('/api/taskforge/v1/auth/login')
    .send(credentials)
    .expect(200);

  return mapAuthResponse(response.body, response.headers['set-cookie'], credentials);
}

export function extractSessionCookie(cookies: string[] | string | undefined): string | undefined {
  if (!cookies) {
    return undefined;
  }

  const sessionName = getSessionCookieName();
  const candidates = Array.isArray(cookies) ? cookies : [cookies];
  return candidates.find(cookie => cookie.startsWith(`${sessionName}=`));
}

function mapAuthResponse(
  body: AuthSuccessResponseDTO,
  cookieHeader: string[] | string | undefined,
  credentials: AuthCredentials,
): AuthResult {
  const cookies = cookieHeader
    ? Array.isArray(cookieHeader)
      ? cookieHeader
      : [cookieHeader]
    : [];

  return {
    user: body.user,
    tokens: body.tokens,
    cookies,
    credentials,
  };
}
