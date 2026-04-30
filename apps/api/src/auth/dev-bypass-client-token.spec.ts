import { createHmac } from 'node:crypto';

import {
  createDevBypassClientToken,
  verifyDevBypassClientToken,
} from './dev-bypass-client-token';

const SECRET = 'test-dev-bypass-client-secret';

function signPayload(payload: unknown): string {
  const payloadSegment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', SECRET).update(payloadSegment).digest('base64url');
  return `${payloadSegment}.${signature}`;
}

describe('verifyDevBypassClientToken', () => {
  it('accepts a valid token', () => {
    const token = createDevBypassClientToken(
      { userId: 'user-123', email: 'demo@taskforge.dev' },
      SECRET,
      Date.UTC(2026, 3, 30, 0, 0, 0),
    );

    expect(
      verifyDevBypassClientToken(token, SECRET, Date.UTC(2026, 3, 30, 0, 1, 0)),
    ).toEqual({
      userId: 'user-123',
      email: 'demo@taskforge.dev',
    });
  });

  it('rejects signed payloads with missing numeric expiration', () => {
    const token = signPayload({
      sub: 'user-123',
      email: 'demo@taskforge.dev',
      aud: 'taskforge-dev-bypass',
      iat: Math.floor(Date.UTC(2026, 3, 30, 0, 0, 0) / 1000),
    });

    expect(() =>
      verifyDevBypassClientToken(token, SECRET, Date.UTC(2026, 3, 30, 0, 1, 0)),
    ).toThrow('Invalid dev bypass token expiration');
  });

  it('rejects signed payloads with non-numeric issued-at values', () => {
    const token = signPayload({
      sub: 'user-123',
      email: 'demo@taskforge.dev',
      aud: 'taskforge-dev-bypass',
      iat: 'tomorrow',
      exp: Math.floor(Date.UTC(2026, 3, 30, 0, 15, 0) / 1000),
    });

    expect(() =>
      verifyDevBypassClientToken(token, SECRET, Date.UTC(2026, 3, 30, 0, 1, 0)),
    ).toThrow('Invalid dev bypass token issued-at timestamp');
  });
});
