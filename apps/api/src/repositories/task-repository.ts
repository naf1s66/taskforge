import type {
  Prisma,
  PrismaClient,
  TaskPriority as PrismaTaskPriority,
  TaskStatus as PrismaTaskStatus,
} from '@prisma/client';
import type {
  TaskPriority as SharedTaskPriority,
  TaskStatus as SharedTaskStatus,
  BoardReadModelDTO,
  BoardColumnDTO,
  BoardSummaryDTO,
  TaskRecordDTO,
  TaskBoardItemDTO,
  TagSummaryDTO,
} from '@taskforge/shared';

import {
  normalizeTagLabels,
  parseDueDate,
  taskWithTagsInclude,
  toTaskBoardItemDTO,
  toTaskRecordDTO,
  type TaskBoardItemWithOrder,
} from './task-mapper';

export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: SharedTaskStatus;
  priority?: SharedTaskPriority;
  dueDate?: string;
  tags?: string[];
}

export type TaskUpdateInput = Partial<TaskCreateInput>;

export interface TaskListOptions {
  page?: number;
  pageSize?: number;
  status?: SharedTaskStatus;
  priority?: SharedTaskPriority;
  tags?: string[];
  search?: string;
  dueFrom?: Date;
  dueTo?: Date;
}

export interface TaskListResult {
  items: TaskRecordDTO[];
  total: number;
}

export interface TaskRepository {
  listTasks(userId: string, options?: TaskListOptions): Promise<TaskListResult>;
  getTaskBoard(userId: string): Promise<BoardReadModelDTO>;
  moveTaskOnBoard(
    userId: string,
    input: { taskId: string; targetStatus: SharedTaskStatus; targetIndex: number },
  ): Promise<BoardReadModelDTO | null>;
  createTask(userId: string, input: TaskCreateInput): Promise<TaskRecordDTO>;
  updateTask(
    userId: string,
    taskId: string,
    input: TaskUpdateInput,
  ): Promise<TaskRecordDTO | null>;
  deleteTask(userId: string, taskId: string): Promise<TaskRecordDTO | null>;
}

export function createTaskRepository(prisma: PrismaClient): TaskRepository {
  return {
    async listTasks(userId, options) {
      const page = Math.max(1, options?.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20));
      const skip = (page - 1) * pageSize;

      const andFilters: Prisma.TaskWhereInput[] = [];

      if (options?.tags?.length) {
        for (const label of options.tags) {
          andFilters.push({
            TaskTag: {
              some: {
                tag: {
                  label: {
                    equals: label,
                    mode: 'insensitive',
                  },
                },
              },
            },
          });
        }
      }

      if (options?.search) {
        andFilters.push({
          OR: [
            { title: { contains: options.search, mode: 'insensitive' } },
            { description: { contains: options.search, mode: 'insensitive' } },
          ],
        });
      }

      if (options?.dueFrom || options?.dueTo) {
        andFilters.push({
          dueDate: {
            ...(options?.dueFrom ? { gte: options.dueFrom } : {}),
            ...(options?.dueTo ? { lte: options.dueTo } : {}),
          },
        });
      }

      const where: Prisma.TaskWhereInput = {
        userId,
        ...(options?.status ? { status: options.status as PrismaTaskStatus } : {}),
        ...(options?.priority ? { priority: options.priority as PrismaTaskPriority } : {}),
        ...(andFilters.length ? { AND: andFilters } : {}),
      };

      const [tasks, total] = await prisma.$transaction([
        prisma.task.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          include: taskWithTagsInclude,
          skip,
          take: pageSize,
        }),
        prisma.task.count({ where }),
      ]);

      return {
        items: tasks.map(toTaskRecordDTO),
        total,
      };
    },

    async getTaskBoard(userId) {
      const tasks = await prisma.task.findMany({
        where: { userId },
        include: taskWithTagsInclude,
      });

      const now = new Date();
      const boardItems = tasks.map(toTaskBoardItemDTO);
      const columns = buildBoardColumns(boardItems, now);
      const summary = buildBoardSummary(columns);
      const updatedAt = resolveBoardUpdatedAt(boardItems, now);

      return {
        columns,
        summary,
        generatedAt: now.toISOString(),
        updatedAt,
      };
    },

    async moveTaskOnBoard(userId, input) {
      const moved = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const task = await tx.task.findFirst({
          where: { id: input.taskId, userId },
        });

        if (!task) {
          return null;
        }

        const sourceStatus = task.status;
        const targetStatus = input.targetStatus as PrismaTaskStatus;

        const sourceTasks = await tx.task.findMany({
          where: { userId, status: sourceStatus },
          orderBy: { boardOrder: 'asc' },
          select: { id: true },
        });

        const targetTasks =
          sourceStatus === targetStatus
            ? sourceTasks
            : await tx.task.findMany({
                where: { userId, status: targetStatus },
                orderBy: { boardOrder: 'asc' },
                select: { id: true },
              });

        const sourceIds = sourceTasks.map(item => item.id);
        const targetIds = (sourceStatus === targetStatus ? sourceIds : targetTasks.map(item => item.id))
          .filter(id => id !== task.id);

        const filteredSourceIds =
          sourceStatus === targetStatus ? targetIds : sourceIds.filter(id => id !== task.id);

        const clampedIndex = clampIndex(input.targetIndex, targetIds.length);
        targetIds.splice(clampedIndex, 0, task.id);

        await updateBoardOrders(tx, targetIds, {
          movedTaskId: task.id,
          movedTaskStatus: targetStatus,
        });

        if (sourceStatus !== targetStatus) {
          await updateBoardOrders(tx, filteredSourceIds);
        }

        return true;
      });

      if (!moved) {
        return null;
      }

      return this.getTaskBoard(userId);
    },

    async createTask(userId, input) {
      const normalizedTags = normalizeTagLabels(input.tags);
      return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const status = (input.status ?? 'TODO') as PrismaTaskStatus;
        const boardOrder = await nextBoardOrder(tx, userId, status);
        const task = await tx.task.create({
          data: {
            title: input.title,
            description: input.description ?? null,
            status,
            priority: (input.priority ?? 'MEDIUM') as PrismaTaskPriority,
            dueDate: parseDueDate(input.dueDate),
            boardOrder,
            user: { connect: { id: userId } },
            TaskTag: normalizedTags.length
              ? {
                  create: normalizedTags.map(label => ({
                    tag: {
                      connectOrCreate: {
                        where: { label },
                        create: { label },
                      },
                    },
                  })),
                }
              : undefined,
          },
          include: taskWithTagsInclude,
        });

        return toTaskRecordDTO(task);
      });
    },

    async updateTask(userId, taskId, input) {
      return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const existing = await tx.task.findFirst({ where: { id: taskId, userId } });
        if (!existing) {
          return null;
        }

        const updateData: Prisma.TaskUpdateInput = {};
        if (input.title !== undefined) {
          updateData.title = input.title;
        }
        if (input.description !== undefined) {
          updateData.description = input.description;
        }
        if (input.status !== undefined) {
          const nextStatus = input.status as PrismaTaskStatus;
          updateData.status = nextStatus;
          if (nextStatus !== existing.status) {
            updateData.boardOrder = await nextBoardOrder(tx, userId, nextStatus);
          }
        }
        if (input.priority !== undefined) {
          updateData.priority = input.priority as PrismaTaskPriority;
        }
        if (input.dueDate !== undefined) {
          const dueDate = parseDueDate(input.dueDate);
          updateData.dueDate = dueDate ?? null;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.task.update({ where: { id: taskId }, data: updateData });
        }

        if (input.tags !== undefined) {
          const normalizedTags = normalizeTagLabels(input.tags);
          await replaceTaskTags(tx, taskId, normalizedTags);
        }

        const updated = await tx.task.findUnique({
          where: { id: taskId },
          include: taskWithTagsInclude,
        });

        return updated ? toTaskRecordDTO(updated) : null;
      });
    },

    async deleteTask(userId, taskId) {
      return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const existing = await tx.task.findFirst({
          where: { id: taskId, userId },
          include: taskWithTagsInclude,
        });

        if (!existing) {
          return null;
        }

        await tx.task.delete({ where: { id: taskId } });
        return toTaskRecordDTO(existing);
      });
    },
  };
}

async function replaceTaskTags(
  tx: Prisma.TransactionClient,
  taskId: string,
  labels: string[],
): Promise<void> {
  await tx.taskTag.deleteMany({ where: { taskId } });

  if (!labels.length) {
    return;
  }

  for (const label of labels) {
    const tag = await tx.tag.upsert({
      where: { label },
      update: {},
      create: { label },
    });

    await tx.taskTag.create({
      data: {
        taskId,
        tagId: tag.id,
      },
    });
  }
}

const statusOrder: Array<{
  status: SharedTaskStatus;
  title: string;
  order: number;
}> = [
  { status: 'TODO', title: 'To Do', order: 1 },
  { status: 'IN_PROGRESS', title: 'In Progress', order: 2 },
  { status: 'DONE', title: 'Done', order: 3 },
];

const priorityRank: Record<SharedTaskPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function buildBoardColumns(tasks: TaskBoardItemWithOrder[], now: Date): BoardColumnDTO[] {
  const buckets = new Map<SharedTaskStatus, TaskBoardItemWithOrder[]>();
  for (const { status } of statusOrder) {
    buckets.set(status, []);
  }

  for (const task of tasks) {
    const bucket = buckets.get(task.status);
    if (bucket) {
      bucket.push(task);
    }
  }

  return statusOrder.map(({ status, title, order }) => {
    const items = buckets.get(status) ?? [];
    const sorted = [...items].sort((left, right) => compareBoardTasks(left, right));
    const visibleTasks = sorted.map(({ boardOrder: _boardOrder, ...task }) => task);
    const overdueCount = sorted.filter(task => isOverdue(task, now)).length;
    const tags = summarizeTags(sorted);

    return {
      status,
      title,
      order,
      tasks: visibleTasks,
      total: visibleTasks.length,
      overdueCount,
      tags,
    };
  });
}

function compareBoardTasks(left: TaskBoardItemWithOrder, right: TaskBoardItemWithOrder): number {
  const orderDelta = left.boardOrder - right.boardOrder;
  if (orderDelta !== 0) {
    return orderDelta;
  }

  const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const leftDue = left.dueDate ? Date.parse(left.dueDate) : Number.POSITIVE_INFINITY;
  const rightDue = right.dueDate ? Date.parse(right.dueDate) : Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  const updatedDelta = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  const titleDelta = left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
  if (titleDelta !== 0) {
    return titleDelta;
  }

  return left.id.localeCompare(right.id);
}

function summarizeTags(tasks: TaskBoardItemDTO[]): TagSummaryDTO[] {
  const counts = new Map<string, number>();

  for (const task of tasks) {
    for (const label of task.tags) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));
}

function isOverdue(task: TaskBoardItemDTO, now: Date): boolean {
  if (!task.dueDate) {
    return false;
  }
  if (task.status === 'DONE') {
    return false;
  }
  const due = Date.parse(task.dueDate);
  if (Number.isNaN(due)) {
    return false;
  }
  return due < now.getTime();
}

function buildBoardSummary(columns: BoardColumnDTO[]): BoardSummaryDTO {
  const totalsByStatus = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  } satisfies Record<SharedTaskStatus, number>;
  const overdueByStatus = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  } satisfies Record<SharedTaskStatus, number>;

  for (const column of columns) {
    totalsByStatus[column.status] = column.total;
    overdueByStatus[column.status] = column.overdueCount;
  }

  const totalTasks = Object.values(totalsByStatus).reduce((sum, value) => sum + value, 0);
  const totalOverdue = Object.values(overdueByStatus).reduce((sum, value) => sum + value, 0);

  return {
    totalsByStatus,
    overdueByStatus,
    totalTasks,
    totalOverdue,
  };
}

function resolveBoardUpdatedAt(tasks: TaskBoardItemWithOrder[], fallback: Date): string {
  const maxUpdatedAt = tasks.reduce((latest, task) => {
    const updated = Date.parse(task.updatedAt);
    if (Number.isNaN(updated)) {
      return latest;
    }
    return Math.max(latest, updated);
  }, Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(maxUpdatedAt)) {
    return fallback.toISOString();
  }

  return new Date(maxUpdatedAt).toISOString();
}

async function nextBoardOrder(
  tx: Prisma.TransactionClient,
  userId: string,
  status: PrismaTaskStatus,
): Promise<number> {
  const result = await tx.task.aggregate({
    where: { userId, status },
    _max: { boardOrder: true },
  });

  return (result._max.boardOrder ?? -1) + 1;
}

function clampIndex(index: number, max: number): number {
  if (Number.isNaN(index) || !Number.isFinite(index)) {
    return 0;
  }

  return Math.min(Math.max(0, Math.floor(index)), max);
}

async function updateBoardOrders(
  tx: Prisma.TransactionClient,
  orderedIds: string[],
  options?: { movedTaskId?: string; movedTaskStatus?: PrismaTaskStatus },
): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    const data: Prisma.TaskUpdateInput = { boardOrder: index };
    if (options?.movedTaskId === id && options.movedTaskStatus) {
      data.status = options.movedTaskStatus;
    }

    await tx.task.update({
      where: { id },
      data,
    });
  }
}
