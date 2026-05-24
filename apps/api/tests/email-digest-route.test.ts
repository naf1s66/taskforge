import express, { type ErrorRequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';

import type { DailyDigestRunner } from '../src/notifications/daily-digest-runner';
import { createEmailDigestRouter, type EmailDigestRouterOptions } from '../src/routes/email-digest';

describe('email digest routes', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  function appWithUser(
    prisma: PrismaClient,
    run = jest.fn().mockResolvedValue({ sent: 0 }),
    routerOptions: Partial<Omit<EmailDigestRouterOptions, 'digestRunner'>> = {},
  ) {
    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      res.locals.user = { id: 'user-1', email: 'user@example.com', createdAt: new Date().toISOString() };
      next();
    });
    app.use(
      '/email/digest',
      createEmailDigestRouter(prisma, { ...routerOptions, digestRunner: { run } as unknown as DailyDigestRunner }),
    );
    return { app, run };
  }

  it('returns digest preview for authenticated user', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestTimezone: 'UTC' }) },
    } as unknown as PrismaClient;
    const { app } = appWithUser(prisma);

    const response = await request(app).get('/email/digest/preview?dueSoonDays=3').expect(200);

    expect(response.body).toMatchObject({ timezone: 'UTC', groups: expect.any(Array) });
  });

  it('validates preview query and send payload', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestEnabled: true, dailyDigestTimezone: 'UTC' }) },
    } as unknown as PrismaClient;
    const { app } = appWithUser(prisma);

    await request(app).get('/email/digest/preview?dueSoonDays=0').expect(400);
    await request(app).get('/email/digest/preview?timezone=Not/A_Timezone').expect(400);
    await request(app).post('/email/digest/send').send({ digestHourUtc: 99 }).expect(400);
    await request(app).post('/email/digest/send').send({ digestHourUtc: null }).expect(400);
  });

  it('treats blank digest hour values as omitted', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestEnabled: true, dailyDigestTimezone: 'UTC' }) },
    } as unknown as PrismaClient;
    const { app, run } = appWithUser(prisma, jest.fn().mockResolvedValue({ digestDate: '2026-05-21', attempted: 1 }));

    await request(app)
      .post('/email/digest/send')
      .send({ digestDate: '2026-05-21', digestHourUtc: '', dryRun: true })
      .expect(200);
    await request(app)
      .post('/email/digest/send')
      .send({ digestDate: '2026-05-21', digestHourUtc: ' ', dryRun: true })
      .expect(200);

    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[0]?.[0]).toHaveProperty('digestHourUtc', undefined);
    expect(run.mock.calls[1]?.[0]).toHaveProperty('digestHourUtc', undefined);
  });

  it('forwards preference lookup failures from manual send', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockRejectedValue(new Error('database unavailable')) },
    } as unknown as PrismaClient;
    const { app, run } = appWithUser(prisma);
    const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
      res.status(503).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    };
    app.use(errorHandler);

    const response = await request(app).post('/email/digest/send').send({ dryRun: true }).expect(503);

    expect(response.body).toEqual({ error: 'database unavailable' });
    expect(run).not.toHaveBeenCalled();
  });

  it('returns JSON when the digest endpoint rate limit is exceeded', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestTimezone: 'UTC' }) },
    } as unknown as PrismaClient;
    const { app } = appWithUser(prisma);

    for (let requestNumber = 0; requestNumber < 10; requestNumber += 1) {
      await request(app).get('/email/digest/preview').expect(200);
    }

    const response = await request(app).get('/email/digest/preview').expect(429);

    expect(response.type).toBe('application/json');
    expect(response.body).toEqual({ error: 'Too many requests, please try again later.' });
  });

  it('returns a client error for an invalid stored digest timezone', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestTimezone: 'Not/A_Timezone' }) },
    } as unknown as PrismaClient;
    const { app } = appWithUser(prisma);

    await request(app).get('/email/digest/preview').expect(400);
  });

  it('blocks send when digest preference is disabled and supports dry run', async () => {
    const disabledPrisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestEnabled: false }) },
    } as unknown as PrismaClient;
    const { app: blockedApp } = appWithUser(disabledPrisma);
    await request(blockedApp).post('/email/digest/send').send({ dryRun: true }).expect(409);

    const enabledPrisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestEnabled: true }) },
    } as unknown as PrismaClient;
    const { app, run } = appWithUser(
      enabledPrisma,
      jest.fn().mockResolvedValue({ digestDate: '2026-05-21', attempted: 1 }),
      { defaultSendLimit: 50 },
    );

    await request(app).post('/email/digest/send').send({ digestDate: '2026-05-21', dryRun: true }).expect(200);

    expect(run).toHaveBeenCalledWith(expect.objectContaining({ digestDate: '2026-05-21', dryRun: true, sendLimit: 50 }));
  });

  it('derives the default send date from the user digest timezone', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-18T11:30:00.000Z'));

    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: {
        findUnique: jest.fn().mockResolvedValue({ dailyDigestEnabled: true, dailyDigestTimezone: 'Pacific/Kiritimati' }),
      },
    } as unknown as PrismaClient;
    const { app, run } = appWithUser(prisma, jest.fn().mockResolvedValue({ digestDate: '2026-05-19', attempted: 1 }));

    await request(app).post('/email/digest/send').send({ dryRun: true }).expect(200);

    expect(run).toHaveBeenCalledWith(expect.objectContaining({ digestDate: '2026-05-19' }));
  });

  it('keeps dry run available when email delivery is not configured', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestEnabled: true }) },
    } as unknown as PrismaClient;
    const { app, run } = appWithUser(prisma, jest.fn().mockResolvedValue({ digestDate: '2026-05-21' }), {
      sendConfigured: false,
    });

    await request(app).post('/email/digest/send').send({ digestDate: '2026-05-21' }).expect(503);
    expect(run).not.toHaveBeenCalled();

    await request(app).post('/email/digest/send').send({ digestDate: '2026-05-21', dryRun: true }).expect(200);
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
  });
});
