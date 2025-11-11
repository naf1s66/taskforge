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

const TaskListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .passthrough();

const TaskIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Task id is required'),
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

      const { page, pageSize } = parseQuery.data;
      const { items, total } = await repository.listTasks(user.id, { page, pageSize });
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
      return res.status(400).json({ error: 'Invalid payload', details: params.error.flatten() });
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

      const payload: TaskUpdateInput = parsed.data;
      const updated = await repository.updateTask(user.id, params.data.id, payload);
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
      return res.status(400).json({ error: 'Invalid payload', details: params.error.flatten() });
    }

    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const deleted = await repository.deleteTask(user.id, params.data.id);
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
