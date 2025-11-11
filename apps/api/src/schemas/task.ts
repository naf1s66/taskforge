import { z } from 'zod';

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

export const TaskUpdateSchema = TaskCreateSchema.partial();
