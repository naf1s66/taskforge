import { Router, type Request, type RequestHandler } from 'express';
import { z } from 'zod';

import type { DailyDigestRunner } from '../notifications/daily-digest-runner';

export interface JobsRouterOptions {
  defaultSendLimit: number;
  secret: string;
}

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Expected a valid YYYY-MM-DD date.');

const runDigestSchema = z.object({
  digestDate: dateOnlySchema,
  digestHourUtc: z.coerce.number().int().min(0).max(23).optional(),
  dryRun: z.coerce.boolean().default(false),
  sendLimit: z.coerce.number().int().min(0).optional(),
});

function isAuthorized(req: Request, secret: string): boolean {
  const jobSecret = req.get('x-job-secret');
  const authorization = req.get('authorization');
  return jobSecret === secret || authorization === `Bearer ${secret}`;
}

export function createJobsRouter(runner: DailyDigestRunner, options: JobsRouterOptions) {
  const router = Router();

  const handleDigestRun: RequestHandler = async (req, res, next) => {
    if (!isAuthorized(req, options.secret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload: unknown = req.method === 'GET' ? req.query : req.body;
    const parsed = runDigestSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    try {
      const result = await runner.run({
        digestDate: parsed.data.digestDate,
        digestHourUtc: parsed.data.digestHourUtc,
        dryRun: parsed.data.dryRun,
        sendLimit: parsed.data.sendLimit ?? options.defaultSendLimit,
      });

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  router.get('/digest', handleDigestRun);
  router.post('/digest', handleDigestRun);

  return router;
}
