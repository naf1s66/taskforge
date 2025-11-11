import { Router } from 'express';

import { getPrismaClient } from '../prisma';
import { TaskCreateSchema, TaskUpdateSchema } from '../schemas/task';
import {
  createTaskRepository,
  type TaskCreateInput,
  type TaskRepository,
  type TaskUpdateInput,
} from '../repositories/task-repository';

export function createTaskRouter(
  taskRepository: TaskRepository = createTaskRepository(getPrismaClient()),
) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tasks = await taskRepository.listTasks(user.id);
      res.json({ items: tasks });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    const parsed = TaskCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const payload: TaskCreateInput = parsed.data;
      const task = await taskRepository.createTask(user.id, payload);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    const parsed = TaskUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const payload: TaskUpdateInput = parsed.data;
      const updated = await taskRepository.updateTask(user.id, req.params.id, payload);
      if (!updated) {
        return res.status(404).json({ error: 'Not found' });
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const deleted = await taskRepository.deleteTask(user.id, req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Not found' });
      }

      res.json(deleted);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const router = createTaskRouter();
