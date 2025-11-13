'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownNarrowWide,
  ArrowUpDown,
  CalendarDays,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasksQuery, type TaskListItem } from '@/lib/tasks-hooks';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const statusColors: Record<TaskStatus, string> = {
  TODO: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  IN_PROGRESS: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  DONE: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

const priorityColors: Record<TaskPriority, string> = {
  HIGH: 'border-destructive/40 bg-destructive/10 text-destructive',
  MEDIUM: 'border-primary/40 bg-primary/10 text-primary',
  LOW: 'border-muted-foreground/20 bg-muted text-muted-foreground',
};

type SortOption = 'due-asc' | 'due-desc' | 'priority-desc' | 'priority-asc' | 'updated-desc';

type TaskListViewProps = {
  onCreateTask?: () => void;
  onEditTask?: (taskId: string) => void;
};

type GroupedTasks = Array<{
  status: TaskStatus;
  tasks: TaskListItem[];
}>;

function formatDueDate(value?: string | null) {
  if (!value) {
    return 'No due date';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 'No due date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(parsed));
}

function describeSort(option: SortOption): string {
  switch (option) {
    case 'due-asc':
      return 'Due date · Soonest';
    case 'due-desc':
      return 'Due date · Latest';
    case 'priority-desc':
      return 'Priority · Highest';
    case 'priority-asc':
      return 'Priority · Lowest';
    case 'updated-desc':
      return 'Recently updated';
    default:
      return 'Custom';
  }
}

function sortTasks(tasks: TaskListItem[], option: SortOption): TaskListItem[] {
  const next = [...tasks];
  return next.sort((a, b) => {
    if (option === 'due-asc' || option === 'due-desc') {
      const aDue = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
      if (aDue === bDue) {
        return a.title.localeCompare(b.title);
      }
      return option === 'due-asc' ? aDue - bDue : bDue - aDue;
    }

    if (option === 'priority-desc' || option === 'priority-asc') {
      const direction = option === 'priority-desc' ? -1 : 1;
      const aPriority = a.priority as TaskPriority;
      const bPriority = b.priority as TaskPriority;
      const diff = PRIORITY_ORDER[aPriority] - PRIORITY_ORDER[bPriority];
      if (diff === 0) {
        return a.title.localeCompare(b.title);
      }
      return diff * direction;
    }

    const aUpdated = Date.parse(a.updatedAt ?? a.createdAt);
    const bUpdated = Date.parse(b.updatedAt ?? b.createdAt);
    if (aUpdated === bUpdated) {
      return a.title.localeCompare(b.title);
    }
    return bUpdated - aUpdated;
  });
}

function getStatusCounts(groups: GroupedTasks) {
  return groups.reduce<Record<TaskStatus, number>>((acc, group) => {
    acc[group.status] = group.tasks.length;
    return acc;
  }, {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  });
}

export function TaskListView({ onCreateTask, onEditTask }: TaskListViewProps) {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>('ALL');
  const [sort, setSort] = useState<SortOption>('due-asc');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = useMemo(
    () => ({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
      q: searchTerm.trim() || undefined,
    }),
    [statusFilter, priorityFilter, searchTerm],
  );

  const tasksQuery = useTasksQuery(filters);

  const sortedTasks = useMemo(() => sortTasks(tasksQuery.tasks, sort), [tasksQuery.tasks, sort]);

  const groupedTasks = useMemo<GroupedTasks>(() => {
    const groups: GroupedTasks = [
      { status: 'TODO', tasks: [] },
      { status: 'IN_PROGRESS', tasks: [] },
      { status: 'DONE', tasks: [] },
    ];

    for (const task of sortedTasks) {
      const group = groups.find((entry) => entry.status === task.status);
      if (group) {
        group.tasks.push(task);
      }
    }

    return groups;
  }, [sortedTasks]);

  const statusCounts = useMemo(() => getStatusCounts(groupedTasks), [groupedTasks]);

  const totalTasks = tasksQuery.data?.total ?? 0;
  const showingCount = sortedTasks.length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Monitor the work flowing through your workspace, refine priorities, and keep momentum across every project.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => tasksQuery.refetch()}
            disabled={tasksQuery.isFetching}
            aria-label="Refresh tasks"
          >
            {tasksQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          {onCreateTask ? (
            <Button type="button" onClick={onCreateTask} data-testid="task-list-create-button">
              <Plus className="h-4 w-4" /> New task
            </Button>
          ) : null}
        </div>
      </header>

      <Card className="border-border/70 bg-card/60 shadow-lg shadow-black/5">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">My work</CardTitle>
          <CardDescription>
            Showing {showingCount} of {totalTasks} tasks · {describeSort(sort)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search tasks"
                  className="pl-9"
                  aria-label="Search tasks"
                />
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" type="button" className="min-w-[180px] justify-start" aria-label="Sort tasks">
                      <ArrowUpDown className="h-4 w-4" /> {describeSort(sort)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(value as SortOption)}>
                      <DropdownMenuRadioItem value="due-asc">Due date · Soonest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="due-desc">Due date · Latest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="priority-desc">Priority · Highest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="priority-asc">Priority · Lowest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="updated-desc">Recently updated</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex rounded-md border border-border/60 p-1">
                  <Button
                    type="button"
                    size="icon"
                    variant={viewMode === 'board' ? 'default' : 'ghost'}
                    aria-label="Board view"
                    onClick={() => setViewMode('board')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    aria-label="List view"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as Array<TaskStatus | 'ALL'>).map((statusOption) => {
              const isActive = statusFilter === statusOption;
              return (
                <Button
                  key={statusOption}
                  type="button"
                  variant={isActive ? 'default' : 'secondary'}
                  onClick={() => setStatusFilter(statusOption)}
                  aria-pressed={isActive}
                >
                  {statusOption === 'ALL' ? 'All statuses' : STATUS_LABELS[statusOption]}
                  {statusOption !== 'ALL' ? (
                    <Badge variant="muted" className="ml-2">
                      {statusCounts[statusOption] ?? 0}
                    </Badge>
                  ) : null}
                </Button>
              );
            })}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="gap-2">
                  <ArrowDownNarrowWide className="h-4 w-4" />
                  {priorityFilter === 'ALL' ? 'All priorities' : `${PRIORITY_LABELS[priorityFilter]} priority`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setPriorityFilter('ALL')}>All priorities</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPriorityFilter('HIGH')}>High</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPriorityFilter('MEDIUM')}>Medium</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPriorityFilter('LOW')}>Low</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {tasksQuery.error ? (
            <Alert variant="destructive" role="alert">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to load tasks</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <span>{tasksQuery.error.message}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => tasksQuery.refetch()}
                  className="self-start"
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {tasksQuery.isLoading ? <TaskListSkeleton mode={viewMode} /> : null}

          {!tasksQuery.isLoading && !tasksQuery.error && showingCount === 0 ? (
            <EmptyState onCreateTask={onCreateTask} />
          ) : null}

          {!tasksQuery.isLoading && !tasksQuery.error && showingCount > 0 ? (
            viewMode === 'board' ? (
              <TaskBoard groupedTasks={groupedTasks} onEditTask={onEditTask} />
            ) : (
              <TaskList tasks={sortedTasks} onEditTask={onEditTask} />
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ onCreateTask }: { onCreateTask?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <CalendarDays className="h-7 w-7" />
      </motion.div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">No tasks just yet</h2>
        <p className="text-sm text-muted-foreground">
          When tasks are created they will appear here automatically. Use the composer to get started.
        </p>
      </div>
      {onCreateTask ? (
        <Button type="button" onClick={onCreateTask} variant="secondary">
          <Plus className="h-4 w-4" /> Create your first task
        </Button>
      ) : null}
    </div>
  );
}

function TaskBoard({ groupedTasks, onEditTask }: { groupedTasks: GroupedTasks; onEditTask?: (taskId: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groupedTasks.map((column, index) => (
        <motion.section
          key={column.status}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * index, duration: 0.3 }}
          className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/60 p-4 shadow-sm"
          aria-label={`${STATUS_LABELS[column.status]} column`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={statusColors[column.status]}>
                {STATUS_LABELS[column.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">{column.tasks.length} task{column.tasks.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="space-y-3">
            {column.tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-background/40 px-3 py-6 text-center text-xs text-muted-foreground">
                Nothing in this column yet.
              </div>
            ) : null}
            {column.tasks.map((task: TaskListItem) => (
              <TaskCard key={task.id} task={task} onEditTask={onEditTask} />
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}

function TaskList({ tasks, onEditTask }: { tasks: TaskListItem[]; onEditTask?: (taskId: string) => void }) {
  return (
    <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {tasks.map((task: TaskListItem) => (
        <li key={task.id}>
          <TaskRow task={task} onEditTask={onEditTask} />
        </li>
      ))}
    </motion.ul>
  );
}

function TaskCard({ task, onEditTask }: { task: TaskListItem; onEditTask?: (taskId: string) => void }) {
  const priority = task.priority as TaskPriority;
  const status = task.status as TaskStatus;
  return (
    <article className="space-y-3 rounded-lg border border-border/60 bg-card/70 p-4 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {task.title}{' '}
            {task._optimistic ? <span className="text-xs uppercase text-amber-500">(pending)</span> : null}
          </h3>
          {task.description ? <p className="text-xs text-muted-foreground">{task.description}</p> : null}
        </div>
        <Badge variant="outline" className={priorityColors[priority]}>
          {PRIORITY_LABELS[priority]}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{STATUS_LABELS[status]}</span>
        <span aria-hidden="true">•</span>
        <span>Due {formatDueDate(task.dueDate)}</span>
        <span aria-hidden="true">•</span>
        <span>Updated {formatDueDate(task.updatedAt)}</span>
      </div>
      {task.tags?.length ? (
        <div className="flex flex-wrap gap-2">
          {task.tags.map((tag: string) => (
            <Badge key={tag} variant="muted">
              #{tag}
            </Badge>
          ))}
        </div>
      ) : null}
      {onEditTask ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => onEditTask(task.id)}
            data-testid="task-card-edit"
          >
            Edit task
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function TaskRow({ task, onEditTask }: { task: TaskListItem; onEditTask?: (taskId: string) => void }) {
  const priority = task.priority as TaskPriority;
  const status = task.status as TaskStatus;
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/70 p-4 shadow-sm transition-colors hover:border-primary/40 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h3 className="text-base font-medium text-foreground">
          {task.title}{' '}
          {task._optimistic ? <span className="text-xs uppercase text-amber-500">(pending)</span> : null}
        </h3>
        {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className={statusColors[status]}>
            {STATUS_LABELS[status]}
          </Badge>
          <Badge variant="outline" className={priorityColors[priority]}>
            {PRIORITY_LABELS[priority]}
          </Badge>
          <span aria-hidden="true">•</span>
          <span>Due {formatDueDate(task.dueDate)}</span>
          <span aria-hidden="true">•</span>
          <span>Updated {formatDueDate(task.updatedAt)}</span>
        </div>
        {task.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {task.tags.map((tag: string) => (
              <Badge key={tag} variant="muted">
                #{tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      {onEditTask ? (
        <div className="flex items-center gap-2 self-start md:self-center">
          <Button type="button" variant="outline" size="sm" onClick={() => onEditTask(task.id)}>
            Edit task
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function TaskListSkeleton({ mode }: { mode: 'board' | 'list' }) {
  if (mode === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`list-${index}`} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, column) => (
        <div key={`board-${column}`} className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4">
          <Skeleton className="h-6 w-28" />
          {Array.from({ length: 3 }).map((__, card) => (
            <Skeleton key={`card-${column}-${card}`} className="h-24 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
