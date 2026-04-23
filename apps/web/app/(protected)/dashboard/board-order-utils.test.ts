import { describe, expect, test } from 'vitest';

import {
  areArraysEqual,
  cloneColumnOrder,
  emptyColumnOrder,
  findTaskStatusInOrder,
  getStatusFromColumnId,
} from './board-order-utils';

describe('Kanban Drag and Drop helpers', () => {
  test('should validate status when parsing column ids', () => {
    expect(getStatusFromColumnId('column-TODO')).toBe('TODO');
    expect(getStatusFromColumnId('column-INVALID')).toBeNull();
    expect(getStatusFromColumnId('todo')).toBeNull();
  });

  test('should find task status in board order', () => {
    const order = {
      TODO: ['a'],
      IN_PROGRESS: ['b'],
      DONE: ['c'],
    };

    expect(findTaskStatusInOrder(order, 'b')).toBe('IN_PROGRESS');
    expect(findTaskStatusInOrder(order, 'x')).toBeNull();
  });

  test('should clone and compare arrays in order-sensitive way', () => {
    const cloned = cloneColumnOrder(emptyColumnOrder);
    cloned.TODO.push('a');

    expect(emptyColumnOrder.TODO).toEqual([]);
    expect(areArraysEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(areArraysEqual(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});
