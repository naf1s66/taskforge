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

  it('accepts scheduled digest runs without an explicit digest date', async () => {
    const run = jest.fn().mockResolvedValue({ digestDate: null, digestDates: [], attempted: 0, sent: 0, skipped: 0, failed: 0 });
    const app = express();
    app.use(express.json());
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ dryRun: true, sendLimit: 5 })
      .expect(200);

    expect(run).toHaveBeenCalledWith({
      digestDate: undefined,
      digestHourUtc: undefined,
      dryRun: true,
      sendLimit: 5,
    });
  });

  it('parses explicit false dry-run query values as real sends', async () => {
    const run = jest.fn().mockResolvedValue({ attempted: 1, sent: 1, skipped: 0, failed: 0 });
    const app = express();
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    await request(app)
      .get('/jobs/digest?digestDate=2026-05-19&dryRun=false')
      .set('Authorization', 'Bearer job-secret')
      .expect(200);
    await request(app)
      .get('/jobs/digest?digestDate=2026-05-20&dryRun=0')
      .set('Authorization', 'Bearer job-secret')
      .expect(200);

    expect(run).toHaveBeenNthCalledWith(1, {
      digestDate: '2026-05-19',
      digestHourUtc: undefined,
      dryRun: false,
      sendLimit: 90,
    });
    expect(run).toHaveBeenNthCalledWith(2, {
      digestDate: '2026-05-20',
      digestHourUtc: undefined,
      dryRun: false,
      sendLimit: 90,
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



  it('rejects missing and incorrect job secrets without logging or echoing supplied values', async () => {
    const run = jest.fn();
    const app = express();
    app.use(express.json());
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const missing = await request(app).post('/jobs/digest').send({ digestDate: '2026-05-19' }).expect(401);
    const wrongHeader = await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'definitely-wrong-secret')
      .send({ digestDate: '2026-05-19' })
      .expect(401);
    const wrongBearer = await request(app)
      .get('/jobs/digest?digestDate=2026-05-19')
      .set('Authorization', 'Bearer definitely-wrong-bearer')
      .expect(401);

    expect(missing.body).toEqual({ error: 'Unauthorized' });
    expect(wrongHeader.text).not.toContain('definitely-wrong-secret');
    expect(wrongBearer.text).not.toContain('definitely-wrong-bearer');
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();

    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('rate limits invalid job-secret attempts without spending the valid job budget', async () => {
    const run = jest.fn().mockResolvedValue({ attempted: 1, sent: 1, skipped: 0, failed: 0 });
    const app = express();
    app.use(express.json());
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    for (let index = 0; index < 5; index += 1) {
      await request(app)
        .post('/jobs/digest')
        .set('x-job-secret', `wrong-secret-${index}`)
        .send({ digestDate: '2026-05-19' })
        .expect(401);
    }

    const limited = await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'wrong-secret-5')
      .send({ digestDate: '2026-05-19' })
      .expect(429);

    expect(limited.body).toEqual({ error: 'Too many requests, please try again later.' });
    expect(limited.headers['ratelimit-limit']).toBe('5');

    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-05-19' })
      .expect(200);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('rate limits valid protected job runs after secret validation', async () => {
    const run = jest.fn().mockResolvedValue({ attempted: 0, sent: 0, skipped: 0, failed: 0 });
    const app = express();
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    for (let index = 0; index < 5; index += 1) {
      await request(app)
        .get(`/jobs/digest?digestDate=2026-05-${20 + index}&dryRun=true`)
        .set('Authorization', 'Bearer job-secret')
        .expect(200);
    }

    const limited = await request(app)
      .get('/jobs/digest?digestDate=2026-05-25&dryRun=true')
      .set('Authorization', 'Bearer job-secret')
      .expect(429);

    expect(limited.body).toEqual({ error: 'Too many requests, please try again later.' });
    expect(limited.headers['ratelimit-limit']).toBe('5');
    expect(run).toHaveBeenCalledTimes(5);
  });

  it('rejects unknown job query and body fields', async () => {
    const run = jest.fn();
    const app = express();
    app.use(express.json());
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    await request(app)
      .get('/jobs/digest?digestDate=2026-05-19&unexpected=true')
      .set('Authorization', 'Bearer job-secret')
      .expect(400);
    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-05-19', unexpected: true })
      .expect(400);
    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-05-19', sendLimit: 501 })
      .expect(400);

    expect(run).not.toHaveBeenCalled();
  });

  it('rejects blank string send limits instead of coercing them to zero', async () => {
    const run = jest.fn();
    const app = express();
    app.use(express.json());
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    await request(app)
      .get('/jobs/digest?digestDate=2026-05-19&sendLimit=')
      .set('Authorization', 'Bearer job-secret')
      .expect(400);
    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-05-19', sendLimit: '' })
      .expect(400);
    await request(app)
      .get('/jobs/digest?digestDate=2026-05-19&sendLimit=%20%20')
      .set('Authorization', 'Bearer job-secret')
      .expect(400);
    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-05-19', digestHourUtc: ' ' })
      .expect(400);

    expect(run).not.toHaveBeenCalled();
  });

  it('rejects null optional digest params instead of coercing them to zero', async () => {
    const run = jest.fn();
    const app = express();
    app.use(express.json());
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-05-19', sendLimit: null })
      .expect(400);
    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-05-19', digestHourUtc: null })
      .expect(400);

    expect(run).not.toHaveBeenCalled();
  });

  it('rejects unsafe send limits at request validation time', async () => {
    const run = jest.fn();
    const app = express();
    app.use(express.json());
    app.use('/jobs', createJobsRouter(createRunner(run), { defaultSendLimit: 90, secret: 'job-secret' }));

    await request(app)
      .get('/jobs/digest?digestDate=2026-05-19&sendLimit=9007199254740992')
      .set('Authorization', 'Bearer job-secret')
      .expect(400);
    await request(app)
      .post('/jobs/digest')
      .set('x-job-secret', 'job-secret')
      .send({ digestDate: '2026-05-19', sendLimit: 9007199254740992 })
      .expect(400);

    expect(run).not.toHaveBeenCalled();
  });
});
