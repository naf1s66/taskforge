import { Router } from 'express';
import { z } from 'zod';

import { getPrismaClient } from '../prisma';
import { TaskCreateSchema, TaskUpdateSchema } from '../schemas/task';
import {
  createTaskRepository,
  type TaskCreateInput,
  type TaskRepository,
  type TaskUpdateInput,
} from '../repositories/task-repository';
import { normalizeTagLabels } from '../repositories/task-mapper';

const TaskListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    tag: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1))]).optional(),
    q: z.string().trim().min(1).optional(),
    dueFrom: z.string().datetime().optional(),
    dueTo: z.string().datetime().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    if (data.dueFrom && data.dueTo) {
      const from = new Date(data.dueFrom);
      const to = new Date(data.dueTo);
      if (from.getTime() > to.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dueFrom'],
          message: 'dueFrom must be earlier than or equal to dueTo',
        });
      }
    }
  });

const TaskIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Task id is required', invalid_type_error: 'Invalid identifier' })
    .trim()
    .uuid({ message: 'Invalid identifier' }),
});

export function createTaskRouter(taskRepository?: TaskRepository) {
  const repository = taskRepository ?? createTaskRepository(getPrismaClient());
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const parseQuery = TaskListQuerySchema.safeParse(req.query);
      if (!parseQuery.success) {
        return res
          .status(400)
          .json({ error: 'Invalid payload', details: parseQuery.error.flatten() });
      }

      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { page, pageSize, status, priority, tag, q, dueFrom, dueTo } = parseQuery.data;

      const normalizedTags = normalizeTagLabels(
        Array.isArray(tag) ? tag : tag ? [tag] : undefined,
      );

      const { items, total } = await repository.listTasks(user.id, {
        page,
        pageSize,
        status,
        priority,
        tags: normalizedTags.length ? normalizedTags : undefined,
        search: q,
        dueFrom: dueFrom ? new Date(dueFrom) : undefined,
        dueTo: dueTo ? new Date(dueTo) : undefined,
      });
      res.json({ items, page, pageSize, total });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    const parsed = TaskCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const payload: TaskCreateInput = parsed.data;
      const task = await repository.createTask(user.id, payload);
      console.info('task.created', { userId: user.id, taskId: task.id });
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    const params = TaskIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: 'Invalid identifier' });
    }

    const parsed = TaskUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = params.data;
      const payload: TaskUpdateInput = parsed.data;
      const updated = await repository.updateTask(user.id, id, payload);
      if (!updated) {
        return res.status(404).json({ error: 'Not found' });
      }

      console.info('task.updated', { userId: user.id, taskId: updated.id });
      // TODO: Emit structured audit log event once the audit pipeline is available.
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    const params = TaskIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: 'Invalid identifier' });
    }

    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = params.data;
      const deleted = await repository.deleteTask(user.id, id);
      if (!deleted) {
        return res.status(404).json({ error: 'Not found' });
      }

      console.info('task.deleted', { userId: user.id, taskId: deleted.id });
      // TODO: Emit structured audit log event once the audit pipeline is available.
      res.json({ id: deleted.id, status: 'deleted' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
