import { z } from 'zod';

import { requestTaskforgeJson } from './tasks-client';

const DigestTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string().optional(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
});

const DigestGroupSchema = z.object({
  key: z.enum(['overdue', 'dueToday', 'dueSoon', 'recentlyUpdated', 'blockedByStatus']),
  label: z.string(),
  total: z.number().int().nonnegative(),
  tasks: z.array(DigestTaskSchema),
});

const DigestPreviewWindowSchema = z.object({
  startOfTodayUtc: z.string(),
  startOfTomorrowUtc: z.string(),
  dueSoonUntilUtc: z.string(),
  recentlyUpdatedSinceUtc: z.string(),
});

const DigestPreviewSchema = z.object({
  generatedAt: z.string(),
  timezone: z.string(),
  window: DigestPreviewWindowSchema,
  totalTasksConsidered: z.number().int().nonnegative(),
  groups: z.array(DigestGroupSchema),
});

export type DigestPreview = z.infer<typeof DigestPreviewSchema>;

export async function getDigestPreview(): Promise<DigestPreview> {
  return requestTaskforgeJson('v1/email/digest/preview', {
    method: 'GET',
    schema: DigestPreviewSchema,
  });
}
