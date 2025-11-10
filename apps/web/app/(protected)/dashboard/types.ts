import type { TaskPriority, TaskStatus } from '@taskforge/shared';

export interface DashboardUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface DashboardTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
}
