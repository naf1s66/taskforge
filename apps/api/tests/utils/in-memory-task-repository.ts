import { randomUUID } from 'node:crypto';

import type { TaskRecordDTO } from '@taskforge/shared';

import {
  type TaskCreateInput,
  type TaskListOptions,
  type TaskListResult,
  type TaskRepository,
  type TaskUpdateInput,
} from '../../src/repositories/task-repository';
import { normalizeTagLabels } from '../../src/repositories/task-mapper';

interface StoredTask extends TaskRecordDTO {
  userId: string;
}

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, StoredTask>();

  async listTasks(userId: string, options?: TaskListOptions): Promise<TaskListResult> {
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20));

    const status = options?.status;
    const priority = options?.priority;
    const tags = options?.tags;
    const search = options?.search;
    const dueFrom = options?.dueFrom;
    const dueTo = options?.dueTo;

    const all = Array.from(this.tasks.values())
      .filter(task => task.userId === userId)
      .filter(task => {
        if (status && task.status !== status) {
          return false;
        }
        if (priority && task.priority !== priority) {
          return false;
        }

        if (tags?.length) {
          const taskTags = task.tags.map(label => label.toLowerCase());
          const requiredTags = tags.map(label => label.toLowerCase());
          if (!requiredTags.every(label => taskTags.includes(label))) {
            return false;
          }
        }

        if (search) {
          const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase();
          if (!haystack.includes(search.toLowerCase())) {
            return false;
          }
        }

        if (dueFrom) {
          if (!task.dueDate) {
            return false;
          }
          if (new Date(task.dueDate).getTime() < dueFrom.getTime()) {
            return false;
          }
        }

        if (dueTo) {
          if (!task.dueDate) {
            return false;
          }
          if (new Date(task.dueDate).getTime() > dueTo.getTime()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const total = all.length;
    const start = (page - 1) * pageSize;
    const paginated = all.slice(start, start + pageSize).map(({ userId: _userId, ...task }) => ({ ...task }));

    return { items: paginated, total };
  }

  async createTask(userId: string, input: TaskCreateInput): Promise<TaskRecordDTO> {
    const now = new Date().toISOString();
    const task: StoredTask = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: input.status ?? 'TODO',
      priority: input.priority ?? 'MEDIUM',
      dueDate: input.dueDate,
      tags: normalizeTagLabels(input.tags),
      createdAt: now,
      updatedAt: now,
      userId,
    };

    this.tasks.set(task.id, task);
    const { userId: _userId, ...dto } = task;
    return { ...dto };
  }

  async updateTask(
    userId: string,
    taskId: string,
    input: TaskUpdateInput,
  ): Promise<TaskRecordDTO | null> {
    const existing = this.tasks.get(taskId);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    if (input.title !== undefined) {
      existing.title = input.title;
    }
    if (input.description !== undefined) {
      existing.description = input.description;
    }
    if (input.status !== undefined) {
      existing.status = input.status;
    }
    if (input.priority !== undefined) {
      existing.priority = input.priority;
    }
    if (input.dueDate !== undefined) {
      existing.dueDate = input.dueDate;
    }
    if (input.tags !== undefined) {
      existing.tags = normalizeTagLabels(input.tags);
    }

    existing.updatedAt = new Date().toISOString();
    const { userId: _userId, ...dto } = existing;
    return { ...dto };
  }

  async deleteTask(userId: string, taskId: string): Promise<TaskRecordDTO | null> {
    const existing = this.tasks.get(taskId);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    this.tasks.delete(taskId);
    const { userId: _userId, ...dto } = existing;
    return { ...dto };
  }
}
