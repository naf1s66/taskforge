import type { PrismaClient, TaskStatus } from '@prisma/client';

import { taskWithTagsInclude, toTaskBoardItemDTO } from '../repositories/task-mapper';

export interface DailyDigestTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  updatedAt: string;
  tags: string[];
}

export interface DailyDigestGroup {
  key: 'overdue' | 'dueToday' | 'dueSoon' | 'recentlyUpdated' | 'blockedByStatus';
  label: string;
  total: number;
  tasks: DailyDigestTaskSummary[];
}

export interface DailyDigestQueryResult {
  generatedAt: string;
  timezone: string;
  window: {
    startOfTodayUtc: string;
    startOfTomorrowUtc: string;
    dueSoonUntilUtc: string;
    recentlyUpdatedSinceUtc: string;
  };
  totalTasksConsidered: number;
  groups: DailyDigestGroup[];
}

export interface DailyDigestQueryOptions {
  now?: Date;
  timezone?: string;
  dueSoonDays?: number;
  recentlyUpdatedDays?: number;
  maxTasksPerGroup?: number;
}

export class DailyDigestQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  async queryForUser(userId: string, options: DailyDigestQueryOptions = {}): Promise<DailyDigestQueryResult> {
    const now = options.now ?? new Date();
    const timezone = options.timezone ?? 'UTC';
    const dueSoonDays = Math.max(1, options.dueSoonDays ?? 7);
    const recentlyUpdatedDays = Math.max(1, options.recentlyUpdatedDays ?? 2);
    const maxTasksPerGroup = Math.max(1, options.maxTasksPerGroup ?? 10);

    const boundaries = computeUtcWindowBoundaries(now, timezone, dueSoonDays, recentlyUpdatedDays);

    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
      },
      include: taskWithTagsInclude,
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });

    const taskSummaries = tasks.map(task => {
      const boardItem = toTaskBoardItemDTO(task);
      return {
        id: boardItem.id,
        title: boardItem.title,
        status: boardItem.status as TaskStatus,
        priority: boardItem.priority,
        dueDate: boardItem.dueDate,
        updatedAt: boardItem.updatedAt,
        tags: boardItem.tags,
      } satisfies DailyDigestTaskSummary;
    });

    const overdue = taskSummaries.filter(task =>
      Boolean(task.dueDate) && new Date(task.dueDate as string) < boundaries.startOfTodayUtc && task.status !== 'DONE');

    const dueToday = taskSummaries.filter(task => {
      if (!task.dueDate || task.status === 'DONE') {
        return false;
      }
      const due = new Date(task.dueDate);
      return due >= boundaries.startOfTodayUtc && due < boundaries.startOfTomorrowUtc;
    });

    const dueSoon = taskSummaries.filter(task => {
      if (!task.dueDate || task.status === 'DONE') {
        return false;
      }
      const due = new Date(task.dueDate);
      return due >= boundaries.startOfTomorrowUtc && due < boundaries.dueSoonUntilUtc;
    });

    const recentlyUpdated = taskSummaries.filter(task =>
      new Date(task.updatedAt) >= boundaries.recentlyUpdatedSinceUtc && task.status !== 'DONE');

    const blockedByStatus = taskSummaries.filter(task => task.status === 'TODO');

    return {
      generatedAt: now.toISOString(),
      timezone,
      window: {
        startOfTodayUtc: boundaries.startOfTodayUtc.toISOString(),
        startOfTomorrowUtc: boundaries.startOfTomorrowUtc.toISOString(),
        dueSoonUntilUtc: boundaries.dueSoonUntilUtc.toISOString(),
        recentlyUpdatedSinceUtc: boundaries.recentlyUpdatedSinceUtc.toISOString(),
      },
      totalTasksConsidered: taskSummaries.length,
      groups: [
        { key: 'overdue', label: 'Overdue', total: overdue.length, tasks: overdue.slice(0, maxTasksPerGroup) },
        { key: 'dueToday', label: 'Due today', total: dueToday.length, tasks: dueToday.slice(0, maxTasksPerGroup) },
        { key: 'dueSoon', label: 'Due soon', total: dueSoon.length, tasks: dueSoon.slice(0, maxTasksPerGroup) },
        {
          key: 'recentlyUpdated',
          label: 'Recently updated',
          total: recentlyUpdated.length,
          tasks: recentlyUpdated.slice(0, maxTasksPerGroup),
        },
        {
          key: 'blockedByStatus',
          label: 'Still todo',
          total: blockedByStatus.length,
          tasks: blockedByStatus.slice(0, maxTasksPerGroup),
        },
      ],
    };
  }
}

export function computeUtcWindowBoundaries(
  now: Date,
  timezone: string,
  dueSoonDays: number,
  recentlyUpdatedDays: number,
): {
  startOfTodayUtc: Date;
  startOfTomorrowUtc: Date;
  dueSoonUntilUtc: Date;
  recentlyUpdatedSinceUtc: Date;
} {
  const localDate = toLocalDateParts(now, timezone);
  const startOfTodayUtc = localMidnightToUtc(localDate.year, localDate.month, localDate.day, timezone);
  const startOfTomorrowUtc = localMidnightToUtc(localDate.year, localDate.month, localDate.day + 1, timezone);
  const dueSoonUntilUtc = localMidnightToUtc(
    localDate.year,
    localDate.month,
    localDate.day + 1 + dueSoonDays,
    timezone,
  );

  return {
    startOfTodayUtc,
    startOfTomorrowUtc,
    dueSoonUntilUtc,
    recentlyUpdatedSinceUtc: addUtcDays(now, -recentlyUpdatedDays),
  };
}

function toLocalDateParts(date: Date, timezone: string): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  const day = Number(parts.find(part => part.type === 'day')?.value);

  if (!year || !month || !day) {
    throw new Error(`Unable to compute local date parts for timezone ${timezone}`);
  }

  return { year, month, day };
}

function localMidnightToUtc(year: number, month: number, day: number, timezone: string): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const partsInTz = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(utcGuess);

  const tzYear = Number(partsInTz.find(part => part.type === 'year')?.value);
  const tzMonth = Number(partsInTz.find(part => part.type === 'month')?.value);
  const tzDay = Number(partsInTz.find(part => part.type === 'day')?.value);
  const tzHour = normalizeIntlHour(Number(partsInTz.find(part => part.type === 'hour')?.value));
  const tzMinute = Number(partsInTz.find(part => part.type === 'minute')?.value);
  const tzSecond = Number(partsInTz.find(part => part.type === 'second')?.value);

  const asUtcFromTzView = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
  const offsetMs = asUtcFromTzView - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offsetMs);
}

function normalizeIntlHour(hour: number): number {
  return hour === 24 ? 0 : hour;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
