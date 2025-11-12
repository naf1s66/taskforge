import { randomUUID } from 'node:crypto';

import type { AuthUserDTO, TaskRecordDTO, TaskPriority, TaskStatus } from '@taskforge/shared';

import { createPasswordHasher } from '../../src/auth/password';
import { createTaskRepository } from '../../src/repositories/task-repository';
import { getTestPrisma } from './prisma';

const defaultPassword = 'Secret123!';
const hasher = createPasswordHasher(4);

export interface CreateUserOptions {
  id?: string;
  email?: string;
  password?: string;
  createdAt?: Date;
  passwordHash?: string | null;
}

export interface CreatedUserFactoryResult {
  user: AuthUserDTO;
  password: string;
  passwordHash: string | null;
}

export async function createUser(options: CreateUserOptions = {}): Promise<CreatedUserFactoryResult> {
  const prisma = getTestPrisma();
  const email = options.email ?? `user-${randomUUID()}@example.com`;
  const password = options.password ?? defaultPassword;
  const passwordHash =
    options.passwordHash ?? (await hasher.hash(password));

  const record = await prisma.user.create({
    data: {
      id: options.id,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: options.createdAt ?? new Date(),
    },
  });

  return {
    user: {
      id: record.id,
      email: record.email,
      createdAt: record.createdAt.toISOString(),
    },
    password,
    passwordHash,
  };
}

export interface CreateTaskOptions {
  userId?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
}

export interface CreatedTaskFactoryResult {
  task: TaskRecordDTO;
  userId: string;
}

export async function createTask(options: CreateTaskOptions = {}): Promise<CreatedTaskFactoryResult> {
  const prisma = getTestPrisma();
  const ownerId = options.userId ?? (await createUser()).user.id;
  const repository = createTaskRepository(prisma);

  const task = await repository.createTask(ownerId, {
    title: options.title ?? `Task ${randomUUID().slice(0, 8)}`,
    description: options.description,
    status: options.status,
    priority: options.priority,
    dueDate: options.dueDate,
    tags: options.tags,
  });

  return { task, userId: ownerId };
}

export { defaultPassword };
