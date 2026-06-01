import type { UpdateTaskInput } from '@/lib/tasks-client';
import { sanitizeTaskInputTags } from '@/lib/task-tags';

import type { TaskFormValues } from './task-form';

export function taskFormValuesToUpdateInput(
  values: TaskFormValues,
  options: { includeTags: boolean },
): UpdateTaskInput {
  const input: UpdateTaskInput = {
    title: values.title.trim(),
    description: values.description?.trim() ? values.description.trim() : null,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate ?? null,
  };

  if (options.includeTags) {
    input.tags = sanitizeTaskInputTags(values.tags);
  }

  return input;
}
