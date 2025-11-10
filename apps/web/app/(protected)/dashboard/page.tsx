import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/server-auth';
import { getApiBaseUrl, SESSION_COOKIE_NAME } from '@/lib/env';

import { DashboardContent } from './dashboard-content';
import type { DashboardTask, DashboardUser } from './types';

import type { TaskPriority, TaskStatus } from '@taskforge/shared';

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === 'TODO' || value === 'IN_PROGRESS' || value === 'DONE';
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH';
}

function parseTask(item: unknown): DashboardTask | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  const title = typeof record.title === 'string' ? record.title : null;

  if (!id || !title) {
    return null;
  }

  const description = typeof record.description === 'string' ? record.description : null;
  const status = isTaskStatus(record.status) ? record.status : 'TODO';
  const priority = isTaskPriority(record.priority) ? record.priority : 'MEDIUM';
  const dueDate = typeof record.dueDate === 'string' ? record.dueDate : null;

  return {
    id,
    title,
    description,
    status,
    priority,
    dueDate,
  } satisfies DashboardTask;
}

async function getDashboardTasks(): Promise<DashboardTask[]> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return [];
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/taskforge/v1/tasks`, {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json().catch(() => null)) as { items?: unknown[] } | null;
    if (!payload?.items?.length) {
      return [];
    }

    return payload.items.map(parseTask).filter(Boolean) as DashboardTask[];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [user, tasks] = await Promise.all([getCurrentUser(), getDashboardTasks()]);

  if (!user) {
    redirect('/login');
  }

  const dashboardUser: DashboardUser = {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  };

  return <DashboardContent user={dashboardUser} tasks={tasks} />;
}
