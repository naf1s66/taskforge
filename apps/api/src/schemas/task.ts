import { z } from 'zod';

import { TagLabelSchema } from './tag';

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(TagLabelSchema).optional(),
});

export const TaskUpdateSchema = TaskCreateSchema.partial();

export const TaskBoardMoveSchema = z.object({
  taskId: z
    .string({ required_error: 'Task id is required', invalid_type_error: 'Invalid identifier' })
    .trim()
    .uuid({ message: 'Invalid identifier' }),
  targetStatus: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  targetIndex: z.number().int().min(0),
});
