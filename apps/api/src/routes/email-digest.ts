import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import { z } from 'zod';

import type { PrismaClient } from '@prisma/client';

import { DailyDigestQueryService } from '../notifications/digest-query-service';
import type { DailyDigestRunner } from '../notifications/daily-digest-runner';

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Expected a valid YYYY-MM-DD date.');

const optionalIntegerParam = (schema: z.ZodNumber) =>
  z.preprocess(
    value => (typeof value === 'string' && value.trim() === '') || value === null ? Number.NaN : value,
    schema.optional(),
  );

const timezoneSchema = z.string().trim().min(1).max(100).refine(value => isValidTimezone(value), {
  message: 'Expected a valid IANA timezone.',
});

const previewQuerySchema = z.object({
  timezone: timezoneSchema.optional(),
  dueSoonDays: optionalIntegerParam(z.coerce.number().int().min(1).max(30)),
  recentlyUpdatedDays: optionalIntegerParam(z.coerce.number().int().min(1).max(30)),
  maxTasksPerGroup: optionalIntegerParam(z.coerce.number().int().min(1).max(50)),
});

const sendPayloadSchema = z.object({
  digestDate: dateOnlySchema.optional(),
  digestHourUtc: optionalIntegerParam(z.coerce.number().int().min(0).max(23)),
  dryRun: z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).optional().transform(value => value === true || value === 'true' || value === '1'),
});

interface AuthUser { id: string }

export function createEmailDigestRouter(prisma: PrismaClient, digestRunner: DailyDigestRunner) {
  const router = Router();
  const queryService = new DailyDigestQueryService(prisma);

  router.use(rateLimit({ windowMs: 60_000, max: 10 }));

  router.get('/preview', async (req, res, next) => {
    const user = res.locals.user as AuthUser | undefined;
    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = previewQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    }

    try {
      const digest = await queryService.queryForUser(user.id, parsed.data);
      return res.json(digest);
    } catch (error) {
      if (isInvalidTimezoneError(error)) {
        return res.status(400).json({ error: 'Invalid digest timezone preference.' });
      }

      return next(error);
    }
  });

  router.post('/send', async (req, res, next) => {
    const user = res.locals.user as AuthUser | undefined;
    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = sendPayloadSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const preference = await prisma.emailPreference.findUnique({
      where: { userId: user.id },
      select: { dailyDigestEnabled: true },
    });

    if (!preference?.dailyDigestEnabled) {
      return res.status(409).json({ error: 'Daily digest is disabled for this user.' });
    }

    const digestDate = parsed.data.digestDate ?? new Date().toISOString().slice(0, 10);

    try {
      const result = await digestRunner.run({
        digestDate,
        digestHourUtc: parsed.data.digestHourUtc,
        dryRun: parsed.data.dryRun,
        sendLimit: 1,
        userIds: [user.id],
      });
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date(0));
    return true;
  } catch (error) {
    if (isInvalidTimezoneError(error)) {
      return false;
    }

    throw error;
  }
}

function isInvalidTimezoneError(error: unknown): boolean {
  return error instanceof RangeError;
}
