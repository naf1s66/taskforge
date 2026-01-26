import type { Prisma } from '@prisma/client';
import type { TaskBoardItemDTO, TaskRecordDTO } from '@taskforge/shared';

export const taskWithTagsInclude = {
  TaskTag: {
    include: {
      tag: true,
    },
  },
} as const;

export type TaskWithTags = Prisma.TaskGetPayload<{
  include: typeof taskWithTagsInclude;
}>;

export type TaskBoardItemWithOrder = TaskBoardItemDTO & { boardOrder: number };

export function toTaskRecordDTO(task: TaskWithTags): TaskRecordDTO {
  const tags = task.TaskTag.map(({ tag }) => tag.label).sort((a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString(),
    tags,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function toTaskBoardItemDTO(task: TaskWithTags): TaskBoardItemWithOrder {
  const tags = task.TaskTag.map(({ tag }) => tag.label).sort((a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );

  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString(),
    tags,
    updatedAt: task.updatedAt.toISOString(),
    boardOrder: task.boardOrder,
  };
}

export function normalizeTagLabels(tags?: string[]): string[] {
  if (!tags?.length) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const label of tags) {
    const trimmed = label.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function parseDueDate(input?: string): Date | undefined {
  if (!input) {
    return undefined;
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}
