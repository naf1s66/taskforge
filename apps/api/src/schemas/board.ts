import { z } from 'zod';

export const BoardMoveSchema = z.object({
  taskId: z
    .string({ required_error: 'Task id is required', invalid_type_error: 'Invalid identifier' })
    .trim()
    .uuid({ message: 'Invalid identifier' }),
  targetStatus: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  targetIndex: z.number().int().min(0),
});
