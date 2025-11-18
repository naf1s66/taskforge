import type { TaskPriority, TaskStatus } from '@taskforge/shared';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const TASK_STATUS_OPTIONS: Array<{ value?: TaskStatus; label: string }> = [
  { value: undefined, label: 'All statuses' },
  { value: 'TODO', label: TASK_STATUS_LABELS.TODO },
  { value: 'IN_PROGRESS', label: TASK_STATUS_LABELS.IN_PROGRESS },
  { value: 'DONE', label: TASK_STATUS_LABELS.DONE },
];

export const TASK_PRIORITY_OPTIONS: Array<{ value?: TaskPriority; label: string }> = [
  { value: undefined, label: 'All priorities' },
  { value: 'LOW', label: TASK_PRIORITY_LABELS.LOW },
  { value: 'MEDIUM', label: TASK_PRIORITY_LABELS.MEDIUM },
  { value: 'HIGH', label: TASK_PRIORITY_LABELS.HIGH },
];

export const TASK_STATUS_FORM_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'TODO', label: TASK_STATUS_LABELS.TODO },
  { value: 'IN_PROGRESS', label: TASK_STATUS_LABELS.IN_PROGRESS },
  { value: 'DONE', label: TASK_STATUS_LABELS.DONE },
];

export const TASK_PRIORITY_FORM_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'LOW', label: TASK_PRIORITY_LABELS.LOW },
  { value: 'MEDIUM', label: TASK_PRIORITY_LABELS.MEDIUM },
  { value: 'HIGH', label: TASK_PRIORITY_LABELS.HIGH },
];
