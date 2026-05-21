import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  getApiUrl: (path: string) => `https://api.test/api/taskforge/${path}`,
}));

describe('/api/cron/digest', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'cron-secret');
    vi.stubEnv('DIGEST_JOB_SECRET', 'job-secret');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ attempted: 1, sent: 1, skipped: 0, failed: 0 }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('validates the Vercel cron bearer token and forwards to the protected API job endpoint', async () => {
    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://app.test/api/cron/digest?digestDate=2026-05-19&dryRun=true&sendLimit=5&digestHourUtc=8', {
        headers: { authorization: 'Bearer cron-secret' },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith('https://api.test/api/taskforge/v1/jobs/digest', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-job-secret': 'job-secret',
      },
      body: JSON.stringify({
        digestDate: '2026-05-19',
        digestHourUtc: '8',
        dryRun: true,
        sendLimit: '5',
      }),
      cache: 'no-store',
    });
  });

  it('forwards numeric query values without truncating them', async () => {
    const { GET } = await import('./route');

    const response = await GET(
      new Request('https://app.test/api/cron/digest?digestDate=2026-05-19&sendLimit=1e2&digestHourUtc=8.5', {
        headers: { authorization: 'Bearer cron-secret' },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith('https://api.test/api/taskforge/v1/jobs/digest', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-job-secret': 'job-secret',
      },
      body: JSON.stringify({
        digestDate: '2026-05-19',
        digestHourUtc: '8.5',
        dryRun: false,
        sendLimit: '1e2',
      }),
      cache: 'no-store',
    });
  });

  it('rejects requests without the cron bearer token', async () => {
    const { GET } = await import('./route');

    const response = await GET(new Request('https://app.test/api/cron/digest'));

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});
