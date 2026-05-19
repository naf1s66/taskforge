import express from 'express';
import request from 'supertest';

import type { DailyDigestRunner } from '../src/notifications/daily-digest-runner';
import { createJobsRouter } from '../src/routes/jobs';

describe('jobs router', () => {
  function createRunner(run: jest.Mock): DailyDigestRunner {
    return { run } as unknown as DailyDigestRunner;
  }

  it('accepts Vercel-compatible GET requests with bearer auth', async () => {
    const run = jest.fn().mockResolvedValue({ attempted: 1, sent: 1, skipped: 0, failed: 0 });
    const app = express();
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    const response = await request(app)
      .get('/jobs/digest?digestDate=2026-05-19&dryRun=true&digestHourUtc=8')
      .set('Authorization', 'Bearer job-secret')
      .expect(200);

    expect(response.body).toEqual({ attempted: 1, sent: 1, skipped: 0, failed: 0 });
    expect(run).toHaveBeenCalledWith({
      digestDate: '2026-05-19',
      digestHourUtc: 8,
      dryRun: true,
      sendLimit: 90,
    });
  });

  it('accepts protected POST requests with an explicit send limit', async () => {
    const run = jest.fn().mockResolvedValue({ attempted: 0, sent: 0, skipped: 0, failed: 0 });
    const app = express();
    app.use(express.json());
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-05-19', sendLimit: 5 })
      .expect(200);

    expect(run).toHaveBeenCalledWith({
      digestDate: '2026-05-19',
      digestHourUtc: undefined,
      dryRun: false,
      sendLimit: 5,
    });
  });

  it('rejects unauthorized and invalid digest job requests', async () => {
    const run = jest.fn();
    const app = express();
    app.use(express.json());
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    await request(app).post('/jobs/digest').send({ digestDate: '2026-05-19' }).expect(401);
    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-99-99' })
      .expect(400);

    expect(run).not.toHaveBeenCalled();
  });
});
