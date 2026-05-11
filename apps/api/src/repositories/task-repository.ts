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
  BoardMoveRequestDTO,
} from '@taskforge/shared';

import {
  normalizeTagLabels,
  parseDueDate,
  taskWithTagsInclude,
  toTaskBoardItemDTO,
  toTaskRecordDTO,
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
  getTask(userId: string, taskId: string): Promise<TaskRecordDTO | null>;
  getTaskBoard(userId: string): Promise<BoardReadModelDTO>;
  moveTaskOnBoard(
    userId: string,
    input: BoardMoveRequestDTO,
  ): Promise<TaskBoardMoveResult>;
  createTask(userId: string, input: TaskCreateInput): Promise<TaskRecordDTO>;
  updateTask(
    userId: string,
    taskId: string,
    input: TaskUpdateInput,
  ): Promise<TaskRecordDTO | null>;
  deleteTask(userId: string, taskId: string): Promise<TaskRecordDTO | null>;
}

export type TaskBoardMoveResult =
  | { status: 'ok'; board: BoardReadModelDTO }
  | { status: 'not_found' }
  | { status: 'invalid'; message: string };

export function createTaskRepository(prisma: PrismaClient): TaskRepository {
  const lockBoardLane = async (
    tx: Prisma.TransactionClient,
    userId: string,
    status: PrismaTaskStatus,
  ): Promise<void> => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended((CAST(${userId} AS text) || ':' || CAST(${status} AS text)), 0)
      )
    `;
  };

  const lockBoardLanes = async (
    tx: Prisma.TransactionClient,
    userId: string,
    statuses: PrismaTaskStatus[],
  ): Promise<void> => {
    const uniqueStatuses = [...new Set(statuses)].sort((a, b) => a.localeCompare(b));
    for (const status of uniqueStatuses) {
      await lockBoardLane(tx, userId, status);
    }
  };

  const allocateBoardOrder = async (
    tx: Prisma.TransactionClient,
    userId: string,
    status: PrismaTaskStatus,
  ): Promise<number> => {
    // Serialize MAX(boardOrder)+1 allocations, including empty lanes.
    await lockBoardLane(tx, userId, status);

    const [row] = await tx.$queryRaw<Array<{ max: number | null }>>`
      SELECT MAX("boardOrder") AS max
      FROM "Task"
      WHERE "userId" = CAST(${userId} AS uuid)
        AND "status" = CAST(${status} AS "TaskStatus")
    `;

    return (row?.max ?? -1) + 1;
  };

  const buildTaskBoard = async (userId: string): Promise<BoardReadModelDTO> => {
    const tasks = await prisma.task.findMany({
      where: { userId },
      include: taskWithTagsInclude,
    });

    const now = new Date();
    const latestUpdatedAt = tasks.reduce<Date>(
      (latest, task) => (task.updatedAt > latest ? task.updatedAt : latest),
      new Date(0),
    );
    const columns = buildBoardColumns(tasks.map(toTaskBoardItemDTO), now);
    const summary = buildBoardSummary(columns);

    return {
      columns,
      summary,
      updatedAt: (tasks.length ? latestUpdatedAt : new Date(0)).toISOString(),
      generatedAt: now.toISOString(),
    };
  };

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

    async getTask(userId, taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId },
        include: taskWithTagsInclude,
      });

      return task ? toTaskRecordDTO(task) : null;
    },

    async getTaskBoard(userId) {
      return buildTaskBoard(userId);
    },

    async moveTaskOnBoard(userId, input) {
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const task = await tx.task.findFirst({ where: { id: input.taskId, userId } });
        if (!task) {
          return { status: 'not_found' } as const;
        }

        const sourceStatus = task.status;
        const targetStatus = input.targetStatus as PrismaTaskStatus;
        await lockBoardLanes(tx, userId, [sourceStatus, targetStatus]);
        const sourceTasks = await tx.task.findMany({
          where: { userId, status: sourceStatus },
          include: taskWithTagsInclude,
        });

        const sourceIds = sourceTasks
          .map(toTaskBoardItemDTO)
          .sort(compareBoardItems)
          .map(item => item.id)
          .filter(id => id !== task.id);

        if (sourceStatus === targetStatus) {
          if (input.targetIndex > sourceIds.length) {
            return {
              status: 'invalid',
              message: `targetIndex must be between 0 and ${sourceIds.length}`,
            } as const;
          }

          const nextIds = [...sourceIds];
          nextIds.splice(input.targetIndex, 0, task.id);

          await Promise.all(
            nextIds.map((id, index) =>
              tx.task.update({
                where: { id },
                data: { boardOrder: index },
              }),
            ),
          );

          return { status: 'ok' } as const;
        }

        const targetTasks = await tx.task.findMany({
          where: { userId, status: targetStatus },
          include: taskWithTagsInclude,
        });
        const targetIds = targetTasks
          .map(toTaskBoardItemDTO)
          .sort(compareBoardItems)
          .map(item => item.id);

        if (input.targetIndex > targetIds.length) {
          return {
            status: 'invalid',
            message: `targetIndex must be between 0 and ${targetIds.length}`,
          } as const;
        }

        const nextTargetIds = [...targetIds];
        nextTargetIds.splice(input.targetIndex, 0, task.id);

        await Promise.all([
          ...sourceIds.map((id, index) =>
            tx.task.update({
              where: { id },
              data: { boardOrder: index },
            }),
          ),
          ...nextTargetIds.map((id, index) =>
            tx.task.update({
              where: { id },
              data: {
                boardOrder: index,
                ...(id === task.id ? { status: targetStatus } : {}),
              },
            }),
          ),
        ]);

        return { status: 'ok' } as const;
      });

      if (result.status !== 'ok') {
        return result;
      }

      const board = await buildTaskBoard(userId);
      return { status: 'ok', board };
    },

    async createTask(userId, input) {
      const normalizedTags = normalizeTagLabels(input.tags);
      const status = (input.status ?? 'TODO') as PrismaTaskStatus;
      const priority = (input.priority ?? 'MEDIUM') as PrismaTaskPriority;

      const task = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        return tx.task.create({
          data: {
            title: input.title,
            description: input.description ?? null,
            status,
            priority,
            boardOrder: await allocateBoardOrder(tx, userId, status),
            dueDate: parseDueDate(input.dueDate),
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
      });

      return toTaskRecordDTO(task);
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
            updateData.boardOrder = await allocateBoardOrder(tx, userId, nextStatus);
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
          if (Object.keys(updateData).length === 0) {
            await tx.task.update({
              where: { id: taskId },
              data: { updatedAt: new Date() },
            });
          }
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

function compareBoardItems(left: TaskBoardItemDTO, right: TaskBoardItemDTO): number {
  const positionDelta = left.position - right.position;
  if (positionDelta !== 0) {
    return positionDelta;
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

function buildBoardColumns(tasks: TaskBoardItemDTO[], now: Date): BoardColumnDTO[] {
  const buckets = new Map<SharedTaskStatus, TaskBoardItemDTO[]>();
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
    const overdueCount = sorted.filter(task => isOverdue(task, now)).length;
    const tags = summarizeTags(sorted);

    return {
      status,
      title,
      order,
      tasks: sorted,
      total: sorted.length,
      overdueCount,
      tags,
    };
  });
}

function compareBoardTasks(left: TaskBoardItemDTO, right: TaskBoardItemDTO): number {
  return compareBoardItems(left, right);
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
