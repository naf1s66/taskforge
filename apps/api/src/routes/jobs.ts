import { Router } from 'express';
import { z } from 'zod';

import type { DailyDigestRunner } from '../notifications/daily-digest-runner';

const runDigestSchema = z.object({
  digestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dryRun: z.coerce.boolean().default(false),
  sendLimit: z.coerce.number().int().min(0).optional(),
});

export function createJobsRouter(runner: DailyDigestRunner, secret: string) {
  const router = Router();

  router.post('/digest', async (req, res) => {
    if (req.get('x-job-secret') !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = runDigestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const result = await runner.run({
      digestDate: parsed.data.digestDate,
      dryRun: parsed.data.dryRun,
      sendLimit: parsed.data.sendLimit,
    });

    return res.json(result);
  });

  return router;
}
