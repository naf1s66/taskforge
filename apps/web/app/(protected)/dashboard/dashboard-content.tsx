'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ListTodo, Sparkles, Timer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { DashboardTask, DashboardUser } from './types';
import type { TaskPriority, TaskStatus } from '@taskforge/shared';

const statusMeta: Record<TaskStatus, { title: string; description: string }> = {
  TODO: {
    title: 'To do',
    description: 'Ideas and tasks that still need attention.',
  },
  IN_PROGRESS: {
    title: 'In progress',
    description: 'Focused work currently moving forward.',
  },
  DONE: {
    title: 'Done',
    description: 'Shipped work ready to celebrate.',
  },
};

const priorityStyle: Record<TaskPriority, string> = {
  HIGH: 'bg-destructive/15 text-destructive',
  MEDIUM: 'bg-primary/15 text-primary',
  LOW: 'bg-muted text-muted-foreground',
};

const placeholderTasks: DashboardTask[] = [
  {
    id: 'placeholder-1',
    title: 'Draft onboarding checklist',
    description: 'Capture the core flows we want new teammates to complete in their first week.',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'placeholder-2',
    title: 'Refine Kanban experience',
    description: 'Audit the drag and drop interactions and document states we still need to design.',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'placeholder-3',
    title: 'Polish authentication copy',
    description: 'Review the login and bridge screens to ensure tone and guidance feel consistent.',
    status: 'DONE',
    priority: 'LOW',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function formatDueDate(value: string | null) {
  if (!value) {
    return 'No due date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No due date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getInitials(user: DashboardUser) {
  return (
    user.name
      ?.split(' ')
      .map((segment) => segment.charAt(0).toUpperCase())
      .join('') ?? (user.email ? user.email.charAt(0).toUpperCase() : 'TF')
  );
}

export function DashboardContent({ user, tasks }: { user: DashboardUser; tasks: DashboardTask[] }) {
  const usingPlaceholder = tasks.length === 0;
  const tasksToRender = useMemo(() => (tasks.length > 0 ? tasks : placeholderTasks), [tasks]);
  const groupedTasks = useMemo(
    () =>
      (['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((status) => ({
        status,
        meta: statusMeta[status],
        tasks: tasksToRender.filter((task) => task.status === status),
      })),
    [tasksToRender],
  );

  const totalTasks = tasksToRender.length;
  const completedTasks = tasksToRender.filter((task) => task.status === 'DONE').length;
  const activeTasks = tasksToRender.filter((task) => task.status === 'IN_PROGRESS').length;
  const todoTasks = tasksToRender.filter((task) => task.status === 'TODO').length;
  const firstName = user.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-[2fr,1fr] md:items-start">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3 w-3" /> Dashboard
          </span>
          <h2 className="text-4xl font-semibold leading-tight">Welcome back, {firstName}!</h2>
          <p className="text-lg text-muted-foreground">
            {usingPlaceholder
              ? 'Real tasks are on their way—here is a preview of how your workspace will feel once data is flowing.'
              : `Here is a quick snapshot of your work: ${activeTasks} in progress, ${todoTasks} to tackle next, and ${completedTasks} already done.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button>
              Review latest update
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost">Open task composer</Button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="border-border/70 bg-card/60 shadow-lg shadow-black/15">
            <CardHeader>
              <CardTitle>Account snapshot</CardTitle>
              <CardDescription>Your personal overview stays in sync with the API session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-muted text-sm font-medium uppercase text-muted-foreground">
                  {getInitials(user)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{user.name ?? user.email ?? 'TaskForge member'}</span>
                  {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2 text-foreground">
                    <Timer className="h-4 w-4 text-primary" /> Active tasks
                  </span>
                  <span className="font-medium text-foreground">{activeTasks}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2 text-foreground">
                    <ListTodo className="h-4 w-4 text-primary" /> Up next
                  </span>
                  <span className="font-medium text-foreground">{todoTasks}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Completed
                  </span>
                  <span className="font-medium text-foreground">{completedTasks}</span>
                </div>
              </div>
              {usingPlaceholder && (
                <p className="text-xs text-muted-foreground">
                  Sample tasks are displayed until seeded data lands—authentication is already powering this view.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {groupedTasks.map((column, index) => (
          <motion.article
            key={column.status}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, duration: 0.4 }}
            className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/50 p-5 shadow-sm backdrop-blur"
          >
            <div>
              <h3 className="text-lg font-semibold text-foreground/90">{column.meta.title}</h3>
              <p className="text-sm text-muted-foreground">{column.meta.description}</p>
            </div>
            <div className="space-y-3">
              {column.tasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/60 bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  Nothing here yet—new tasks will appear automatically.
                </div>
              )}
              {column.tasks.map((task) => (
                <div key={task.id} className="space-y-3 rounded-lg border border-border/60 bg-background/50 px-4 py-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      {task.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyle[task.priority]}`}>
                      {task.priority.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Due {formatDueDate(task.dueDate)}</p>
                </div>
              ))}
            </div>
          </motion.article>
        ))}
      </section>
      <footer className="text-xs text-muted-foreground">
        Tracking {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} across your workspace.
      </footer>
    </div>
  );
}
