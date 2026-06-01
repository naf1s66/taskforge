import { Router, type Request, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
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

const optionalIntegerParam = (schema: z.ZodNumber) =>
  z.preprocess(
    value => (typeof value === 'string' && value.trim() === '') || value === null ? Number.NaN : value,
    schema.optional(),
  );

const runDigestSchema = z.object({
  digestDate: dateOnlySchema.optional(),
  digestHourUtc: optionalIntegerParam(z.coerce.number().int().min(0).max(23)),
  dryRun: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform(value => value === true || value === 'true' || value === '1'),
  sendLimit: optionalIntegerParam(z.coerce.number().int().min(0).max(500)),
}).strict();

function isAuthorized(req: Request, secret: string): boolean {
  const jobSecret = req.get('x-job-secret');
  const authorization = req.get('authorization');
  return jobSecret === secret || authorization === `Bearer ${secret}`;
}

export function createJobsRouter(runner: DailyDigestRunner, options: JobsRouterOptions) {
  const router = Router();

  const jobRateLimit = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
  });

  const requireJobSecret: RequestHandler = (req, res, next) => {
    if (!isAuthorized(req, options.secret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return next();
  };

  const handleDigestRun: RequestHandler = async (req, res, next) => {
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

  router.get('/digest', requireJobSecret, jobRateLimit, handleDigestRun);
  router.post('/digest', requireJobSecret, jobRateLimit, handleDigestRun);

  return router;
}
