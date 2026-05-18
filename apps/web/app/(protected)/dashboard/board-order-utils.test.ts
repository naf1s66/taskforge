import { describe, expect, test } from 'vitest';

import {
  areArraysEqual,
  cloneColumnOrder,
  emptyColumnOrder,
  findTaskStatusInOrder,
  getColumnEndTargetIndex,
  getFullLaneTargetIndex,
  getStatusFromColumnId,
  moveTaskToColumnEnd,
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

  test('should preview sorted-view status moves at the destination lane end', () => {
    const order = {
      TODO: ['a', 'b'],
      IN_PROGRESS: ['c'],
      DONE: [],
    };

    const moved = moveTaskToColumnEnd(order, 'a', 'IN_PROGRESS');

    expect(moved).toEqual({
      TODO: ['b'],
      IN_PROGRESS: ['c', 'a'],
      DONE: [],
    });
    expect(getColumnEndTargetIndex(order, 'a', 'IN_PROGRESS')).toBe(1);
    expect(getColumnEndTargetIndex(moved, 'a', 'IN_PROGRESS')).toBe(1);
    expect(moveTaskToColumnEnd(order, 'a', 'TODO')).toBe(order);
  });

  test('should keep same-lane order stable in sorted views', () => {
    const order = {
      TODO: ['a', 'b', 'c'],
      IN_PROGRESS: [],
      DONE: [],
    };

    expect(moveTaskToColumnEnd(order, 'b', 'TODO')).toBe(order);
    expect(getColumnEndTargetIndex(order, 'b', 'TODO')).toBe(2);
  });

  test('should calculate deterministic target index for cross-lane sorted moves', () => {
    const order = {
      TODO: ['a', 'b'],
      IN_PROGRESS: ['c', 'd'],
      DONE: [],
    };

    expect(getColumnEndTargetIndex(order, 'a', 'IN_PROGRESS')).toBe(2);
    expect(getColumnEndTargetIndex(order, 'd', 'TODO')).toBe(2);
  });

  test('should translate filtered visible reorders to full-lane target indices', () => {
    expect(
      getFullLaneTargetIndex(
        ['hidden-before', 'a', 'hidden-middle', 'c', 'hidden-after'],
        ['c', 'a'],
        'a',
      ),
    ).toBe(3);
    expect(
      getFullLaneTargetIndex(
        ['hidden-before', 'a', 'hidden-middle', 'c', 'hidden-after'],
        ['c', 'a'],
        'c',
      ),
    ).toBe(1);
    expect(getFullLaneTargetIndex(['hidden'], ['a'], 'a')).toBe(1);
  });
});
