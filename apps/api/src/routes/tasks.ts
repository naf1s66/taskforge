import { Router } from 'express';
import { TaskCreateSchema, TaskUpdateSchema } from '../schemas/task';

export const router = Router();

let memory: any[] = [];

router.get('/', (_req, res) => {
  res.json({ items: memory });
});

router.post('/', (req, res) => {
  const parsed = TaskCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const task = { id: String(Date.now()), status: 'TODO', priority: 'MEDIUM', ...parsed.data };
  memory.push(task);
  res.status(201).json(task);
});

router.patch('/:id', (req, res) => {
  const parsed = TaskUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const i = memory.findIndex(t => t.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  memory[i] = { ...memory[i], ...parsed.data };
  res.json(memory[i]);
});

router.delete('/:id', (req, res) => {
  const i = memory.findIndex(t => t.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  const t = memory.splice(i, 1)[0];
  res.json(t);
});
