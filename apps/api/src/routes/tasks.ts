import { Router } from 'express';

import type { TaskDTO, TaskPriority, TaskStatus } from '@taskforge/shared';

import { TaskCreateSchema, TaskUpdateSchema } from '../schemas/task';

export const router = Router();

type TaskRecord = TaskDTO & {
  id: string;
  status: TaskStatus;
  priority: TaskPriority;
};

const tasks: TaskRecord[] = [];

router.get('/', (_req, res) => {
  res.json({ items: tasks });
});

router.post('/', (req, res) => {
  const parsed = TaskCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const task: TaskRecord = {
    id: String(Date.now()),
    status: parsed.data.status ?? 'TODO',
    priority: parsed.data.priority ?? 'MEDIUM',
    ...parsed.data,
  };

  tasks.push(task);
  res.status(201).json(task);
});

router.patch('/:id', (req, res) => {
  const parsed = TaskUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const index = tasks.findIndex(task => task.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Not found' });

  tasks[index] = {
    ...tasks[index],
    ...parsed.data,
    status: parsed.data.status ?? tasks[index].status,
    priority: parsed.data.priority ?? tasks[index].priority,
  };

  res.json(tasks[index]);
});

router.delete('/:id', (req, res) => {
  const index = tasks.findIndex(task => task.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Not found' });

  const [deleted] = tasks.splice(index, 1);
  res.json(deleted);
});
