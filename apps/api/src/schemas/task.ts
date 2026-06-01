import { z } from 'zod';

import { TagLabelSchema } from './tag';

export const TASK_TITLE_MAX_LENGTH = 160;
export const TASK_DESCRIPTION_MAX_LENGTH = 5_000;
export const TASK_TAGS_MAX_LENGTH = 10;
export const TASK_QUERY_MAX_LENGTH = 200;

export const TaskTagsSchema = z.array(TagLabelSchema).max(TASK_TAGS_MAX_LENGTH);

export const TaskTitleSchema = z.string().trim().min(1).max(TASK_TITLE_MAX_LENGTH);
export const TaskDescriptionSchema = z.string().trim().min(1).max(TASK_DESCRIPTION_MAX_LENGTH);

export const TaskCreateSchema = z.object({
  title: TaskTitleSchema,
  description: TaskDescriptionSchema.optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional(),
  tags: TaskTagsSchema.optional(),
}).strict();

export const TaskUpdateSchema = z.object({
  title: TaskTitleSchema.optional(),
  description: z.union([TaskDescriptionSchema, z.null()]).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.union([z.string().datetime(), z.null()]).optional(),
  tags: TaskTagsSchema.optional(),
}).strict();

export const TaskBoardMoveSchema = z.object({
  taskId: z
    .string({ required_error: 'Task id is required', invalid_type_error: 'Invalid identifier' })
    .trim()
    .uuid({ message: 'Invalid identifier' }),
  targetStatus: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  targetIndex: z.number().int().min(0),
}).strict();
