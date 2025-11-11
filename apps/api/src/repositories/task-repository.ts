import type {
  Prisma,
  PrismaClient,
  TaskPriority as PrismaTaskPriority,
  TaskStatus as PrismaTaskStatus,
} from '@prisma/client';
import type {
  TaskPriority as SharedTaskPriority,
  TaskStatus as SharedTaskStatus,
  TaskRecordDTO,
} from '@taskforge/shared';

import { normalizeTagLabels, parseDueDate, taskWithTagsInclude, toTaskRecordDTO } from './task-mapper';

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
}

export interface TaskListResult {
  items: TaskRecordDTO[];
  total: number;
}

export interface TaskRepository {
  listTasks(userId: string, options?: TaskListOptions): Promise<TaskListResult>;
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

      const [tasks, total] = await prisma.$transaction([
        prisma.task.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          include: taskWithTagsInclude,
          skip,
          take: pageSize,
        }),
        prisma.task.count({ where: { userId } }),
      ]);

      return {
        items: tasks.map(toTaskRecordDTO),
        total,
      };
    },

    async createTask(userId, input) {
      const normalizedTags = normalizeTagLabels(input.tags);
      const task = await prisma.task.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          status: (input.status ?? 'TODO') as PrismaTaskStatus,
          priority: (input.priority ?? 'MEDIUM') as PrismaTaskPriority,
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
          updateData.status = input.status as PrismaTaskStatus;
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
