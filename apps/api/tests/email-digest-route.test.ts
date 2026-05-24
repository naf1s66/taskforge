import express from 'express';
import request from 'supertest';

import { createEmailDigestRouter } from '../src/routes/email-digest';

describe('email digest routes', () => {
  function appWithUser(prisma: any, run = jest.fn().mockResolvedValue({ sent: 0 })) {
    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      res.locals.user = { id: 'user-1', email: 'user@example.com', createdAt: new Date().toISOString() };
      next();
    });
    app.use('/email/digest', createEmailDigestRouter(prisma, { run } as any));
    return { app, run };
  }

  it('returns digest preview for authenticated user', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestTimezone: 'UTC' }) },
    };
    const { app } = appWithUser(prisma);

    const response = await request(app).get('/email/digest/preview?dueSoonDays=3').expect(200);

    expect(response.body).toMatchObject({ timezone: 'UTC', groups: expect.any(Array) });
  });

  it('validates preview query and send payload', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestEnabled: true, dailyDigestTimezone: 'UTC' }) },
    };
    const { app } = appWithUser(prisma);

    await request(app).get('/email/digest/preview?dueSoonDays=0').expect(400);
    await request(app).post('/email/digest/send').send({ digestHourUtc: 99 }).expect(400);
  });

  it('blocks send when digest preference is disabled and supports dry run', async () => {
    const disabledPrisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestEnabled: false }) },
    };
    const { app: blockedApp } = appWithUser(disabledPrisma);
    await request(blockedApp).post('/email/digest/send').send({ dryRun: true }).expect(409);

    const enabledPrisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      emailPreference: { findUnique: jest.fn().mockResolvedValue({ dailyDigestEnabled: true }) },
    };
    const { app, run } = appWithUser(enabledPrisma, jest.fn().mockResolvedValue({ digestDate: '2026-05-21', attempted: 1 }));

    await request(app).post('/email/digest/send').send({ digestDate: '2026-05-21', dryRun: true }).expect(200);

    expect(run).toHaveBeenCalledWith(expect.objectContaining({ digestDate: '2026-05-21', dryRun: true, sendLimit: 1 }));
  });
});
