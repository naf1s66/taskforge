import type { TaskStatus } from '@taskforge/shared';

export const statusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export const columnIdPrefix = 'column-';

export function getColumnId(status: TaskStatus): string {
  return `${columnIdPrefix}${status}`;
}

export type ColumnOrderState = Record<TaskStatus, string[]>;

export const emptyColumnOrder: ColumnOrderState = {
  TODO: [],
  IN_PROGRESS: [],
  DONE: [],
};

export function cloneColumnOrder(order: ColumnOrderState): ColumnOrderState {
  return {
    TODO: [...order.TODO],
    IN_PROGRESS: [...order.IN_PROGRESS],
    DONE: [...order.DONE],
  };
}

export function areArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
}

function isTaskStatus(value: string): value is TaskStatus {
  return value === 'TODO' || value === 'IN_PROGRESS' || value === 'DONE';
}

export function getStatusFromColumnId(id: string): TaskStatus | null {
  if (!id.startsWith(columnIdPrefix)) {
    return null;
  }

  const status = id.slice(columnIdPrefix.length);
  return isTaskStatus(status) ? status : null;
}

export function findTaskStatusInOrder(order: ColumnOrderState, taskId: string): TaskStatus | null {
  for (const status of statusOrder) {
    if (order[status].includes(taskId)) {
      return status;
    }
  }

  return null;
}

export function moveTaskToColumnEnd(
  order: ColumnOrderState,
  taskId: string,
  targetStatus: TaskStatus,
): ColumnOrderState {
  const sourceStatus = findTaskStatusInOrder(order, taskId);
  if (!sourceStatus || sourceStatus === targetStatus) {
    return order;
  }

  const next = cloneColumnOrder(order);
  next[sourceStatus] = next[sourceStatus].filter((id) => id !== taskId);
  next[targetStatus] = [...next[targetStatus].filter((id) => id !== taskId), taskId];
  return next;
}

export function getColumnEndTargetIndex(
  order: ColumnOrderState,
  taskId: string,
  targetStatus: TaskStatus,
): number {
  return order[targetStatus].filter((id) => id !== taskId).length;
}
