'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpDown,
  Check,
  CheckCircle2,
  ClipboardList,
  Filter,
  ListTodo,
  Loader2,
  PenSquare,
  PlusCircle,
  RefreshCcw,
  Sparkles,
  Timer,
} from 'lucide-react';
import type { TaskPriority, TaskStatus } from '@taskforge/shared';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasksQuery, type TaskListItem } from '@/lib/tasks-hooks';
import { cn } from '@/lib/utils';

import type { DashboardUser } from './types';

const statusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

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

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

const priorityLabels: Record<TaskPriority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const priorityWeights: Record<TaskPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const statusBadgeTone: Record<TaskStatus, string> = {
  TODO: 'border-amber-300/70 bg-amber-400/10 text-amber-700 dark:border-amber-200/40 dark:text-amber-100',
  IN_PROGRESS: 'border-sky-300/70 bg-sky-400/10 text-sky-700 dark:border-sky-200/40 dark:text-sky-100',
  DONE: 'border-emerald-300/70 bg-emerald-400/10 text-emerald-700 dark:border-emerald-200/40 dark:text-emerald-100',
};

const priorityBadgeTone: Record<TaskPriority, string> = {
  HIGH: 'border-destructive/50 bg-destructive/10 text-destructive',
  MEDIUM: 'border-primary/40 bg-primary/10 text-primary',
  LOW: 'border-muted-foreground/30 bg-muted/80 text-muted-foreground',
};

const statusFilters: Array<{ value: 'ALL' | TaskStatus; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

const sortOptions = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
] as const;

type SortOption = (typeof sortOptions)[number]['value'];

function getInitials(user: DashboardUser) {
  return (
    user.name
      ?.split(' ')
      .map((segment) => segment.charAt(0).toUpperCase())
      .join('') ?? (user.email ? user.email.charAt(0).toUpperCase() : 'TF')
  );
}

function formatDueDate(value: string | null | undefined) {
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

function parseDate(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortTasks(tasks: TaskListItem[], sortBy: SortOption): TaskListItem[] {
  const copy = [...tasks];

  switch (sortBy) {
    case 'priority':
      copy.sort((a, b) => priorityWeights[a.priority] - priorityWeights[b.priority]);
      break;
    case 'dueDate':
      copy.sort((a, b) => {
        const aTime = parseDate(a.dueDate);
        const bTime = parseDate(b.dueDate);

        if (!aTime && !bTime) {
          return 0;
        }

        if (!aTime) {
          return 1;
        }

        if (!bTime) {
          return -1;
        }

        return aTime - bTime;
      });
      break;
    case 'recent':
    default:
      copy.sort((a, b) => {
        const aTime = parseDate(a.updatedAt ?? a.createdAt);
        const bTime = parseDate(b.updatedAt ?? b.createdAt);
        return bTime - aTime;
      });
      break;
  }

  return copy;
}

export function DashboardContent({ user }: { user: DashboardUser }) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const tasksQuery = useTasksQuery({ pageSize: 50 });

  const sortedTasks = useMemo(() => sortTasks(tasksQuery.tasks, sortBy), [tasksQuery.tasks, sortBy]);

  const visibleColumns = useMemo(
    () => {
      const targetStatuses = statusFilter === 'ALL' ? statusOrder : [statusFilter];

      return targetStatuses.map((status) => ({
        status,
        meta: statusMeta[status],
        tasks: sortedTasks.filter((task) => task.status === status),
      }));
    },
    [sortedTasks, statusFilter],
  );

  const visibleTaskCount = useMemo(
    () => visibleColumns.reduce((total, column) => total + column.tasks.length, 0),
    [visibleColumns],
  );

  const totalTasks = tasksQuery.data?.total ?? tasksQuery.tasks.length;
  const completedTasks = useMemo(() => tasksQuery.tasks.filter((task) => task.status === 'DONE').length, [tasksQuery.tasks]);
  const activeTasks = useMemo(
    () => tasksQuery.tasks.filter((task) => task.status === 'IN_PROGRESS').length,
    [tasksQuery.tasks],
  );
  const todoTasks = useMemo(() => tasksQuery.tasks.filter((task) => task.status === 'TODO').length, [tasksQuery.tasks]);

  const firstName = user.name?.split(' ')[0] ?? 'there';

  const isEmpty = !tasksQuery.isLoading && !tasksQuery.isError && totalTasks === 0;

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
            {tasksQuery.isLoading
              ? 'We are syncing your workspace tasks—hang tight for a moment.'
              : totalTasks > 0
                ? `Here is a quick snapshot of your work: ${activeTasks} in progress, ${todoTasks} queued up, and ${completedTasks} already done.`
                : 'Create your first task to capture the work that matters. Everything stays in sync once data starts flowing.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" data-task-dialog="create" className="gap-2">
              <PlusCircle className="h-4 w-4" /> New task
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => tasksQuery.refetch()}
              disabled={tasksQuery.isFetching}
            >
              <RefreshCcw className={cn('h-4 w-4', tasksQuery.isFetching && 'animate-spin')} />
              {tasksQuery.isFetching ? 'Refreshing' : 'Refresh'}
            </Button>
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
                  {tasksQuery.isLoading ? <Skeleton className="h-4 w-10" /> : <span className="font-medium text-foreground">{activeTasks}</span>}
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2 text-foreground">
                    <ListTodo className="h-4 w-4 text-primary" /> Up next
                  </span>
                  {tasksQuery.isLoading ? <Skeleton className="h-4 w-10" /> : <span className="font-medium text-foreground">{todoTasks}</span>}
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Completed
                  </span>
                  {tasksQuery.isLoading ? <Skeleton className="h-4 w-10" /> : <span className="font-medium text-foreground">{completedTasks}</span>}
                </div>
              </div>
              {isEmpty ? (
                <p className="text-xs text-muted-foreground">
                  No tasks yet—your next idea will appear here as soon as you create it.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Filter className="h-3.5 w-3.5" /> Status filter
            </span>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((option) => {
                const isActive = option.value === statusFilter;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={isActive ? 'default' : 'secondary'}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" /> {sortOptions.find((option) => option.value === sortBy)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Sort tasks</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => setSortBy(option.value)}
                    className="flex items-center gap-2"
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {tasksQuery.isFetching && !tasksQuery.isLoading ? (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing latest changes…
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">
            Showing {visibleTaskCount} of {totalTasks} tasks
            {statusFilter !== 'ALL' ? ` in ${statusLabels[statusFilter]} status` : ''}.
          </p>
        </div>

        {tasksQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load tasks</AlertTitle>
            <AlertDescription>
              {tasksQuery.error.message}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-3"
                onClick={() => tasksQuery.refetch()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {tasksQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {statusOrder.map((status) => (
              <div
                key={status}
                className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-5 shadow-sm backdrop-blur"
              >
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
                <div className="space-y-3">
                  {[0, 1].map((index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-border/60 bg-background/60 p-4"
                    >
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 px-10 py-16 text-center shadow-sm"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardList className="h-8 w-8" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-foreground">No tasks yet</h3>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Your workspace is ready. Start by creating a task to see it appear in the live kanban preview.
            </p>
            <Button type="button" data-task-dialog="create" className="mt-6 gap-2">
              <PlusCircle className="h-4 w-4" /> Create your first task
            </Button>
          </motion.div>
        ) : null}

        {!tasksQuery.isLoading && !isEmpty ? (
          <section className="grid gap-4 md:grid-cols-3">
            {visibleColumns.map((column, index) => (
              <motion.article
                key={column.status}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.4 }}
                className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/50 p-5 shadow-sm backdrop-blur"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-foreground/90">{column.meta.title}</h3>
                    <Badge variant="muted" className="uppercase tracking-wide">
                      {column.tasks.length}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{column.meta.description}</p>
                </div>
                <div className="space-y-3">
                  {column.tasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
                      No tasks in this status yet.
                    </div>
                  ) : null}
                  {column.tasks.map((task) => (
                    <article
                      key={task.id}
                      className="space-y-3 rounded-lg border border-border/60 bg-background/60 px-4 py-3 shadow-sm transition-colors hover:border-border"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn('uppercase tracking-wide', statusBadgeTone[task.status])}
                        >
                          {statusLabels[task.status]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn('capitalize', priorityBadgeTone[task.priority])}
                        >
                          {priorityLabels[task.priority]}
                        </Badge>
                        {task._optimistic ? (
                          <Badge variant="warning" className="uppercase tracking-wide">
                            Syncing
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          {task.description ? (
                            <p className="text-xs text-muted-foreground">{task.description}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">Due {formatDueDate(task.dueDate)}</p>
                        </div>
                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="gap-2 px-2 text-xs"
                            data-task-dialog="edit"
                            data-task-id={task.id}
                            aria-label={`Edit task ${task.title}`}
                          >
                            <PenSquare className="h-3.5 w-3.5" /> Edit
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </motion.article>
            ))}
          </section>
        ) : null}
      </section>

      <footer className="text-xs text-muted-foreground">
        Tracking {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} across your workspace.
      </footer>
    </div>
  );
}
