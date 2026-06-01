import { describe, expect, it } from 'vitest';

import type { TaskFormValues } from './task-form';
import { taskFormValuesToUpdateInput } from './task-form-payload';

const baseValues: TaskFormValues = {
  title: '  Updated title  ',
  description: '  Updated description  ',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  dueDate: undefined,
  tags: ['legacy-a', 'legacy-b'],
};

describe('taskFormValuesToUpdateInput', () => {
  it('omits tags when the edit form tag field was not changed', () => {
    expect(taskFormValuesToUpdateInput(baseValues, { includeTags: false })).toEqual({
      title: 'Updated title',
      description: 'Updated description',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: null,
    });
  });

  it('includes sanitized tags when the edit form tag field was changed', () => {
    expect(
      taskFormValuesToUpdateInput(
        {
          ...baseValues,
          tags: ['api', 'API', '  frontend  ', 'x'.repeat(65)],
        },
        { includeTags: true },
      ),
    ).toEqual({
      title: 'Updated title',
      description: 'Updated description',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: null,
      tags: ['api', 'frontend'],
    });
  });
});
