import { randomUUID } from 'node:crypto';

import type { TaskRecordDTO } from '@taskforge/shared';

import {
  type TaskCreateInput,
  type TaskRepository,
  type TaskUpdateInput,
} from '../../src/repositories/task-repository';
import { normalizeTagLabels } from '../../src/repositories/task-mapper';

interface StoredTask extends TaskRecordDTO {
  userId: string;
}

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, StoredTask>();

  async listTasks(userId: string): Promise<TaskRecordDTO[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.userId === userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(task => ({ ...task }));
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
    return { ...task };
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
    return { ...existing };
  }

  async deleteTask(userId: string, taskId: string): Promise<TaskRecordDTO | null> {
    const existing = this.tasks.get(taskId);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    this.tasks.delete(taskId);
    return { ...existing };
  }
}
