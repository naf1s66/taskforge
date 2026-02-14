'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { useMoveTaskOnBoard, useTaskBoardQuery, useTasksQuery, type TaskListItem } from '@/lib/tasks-hooks';
import { cn } from '@/lib/utils';

import type { DashboardUser } from './types';
import {
  areArraysEqual,
  cloneColumnOrder,
  columnIdPrefix,
  emptyColumnOrder,
  findTaskStatusInOrder,
  getStatusFromColumnId,
  type ColumnOrderState,
  statusOrder,
} from './board-order-utils';

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

const statusEmptyCopy: Record<TaskStatus, string> = {
  TODO: 'No tasks to pick up yet.',
  IN_PROGRESS: 'Nothing in progress yet.',
  DONE: 'Nothing completed yet.',
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
  { value: 'manual', label: 'Board order' },
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
    case 'manual':
      return copy;
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

function TaskCard({ task, dragging }: { task: TaskListItem; dragging?: boolean }) {
  return (
    <Card
      className={cn(
        'border-border/60 bg-background/60 shadow-sm transition-colors',
        dragging ? 'shadow-md ring-2 ring-primary/40' : 'hover:border-border',
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('uppercase tracking-wide', statusBadgeTone[task.status])}>
            {statusLabels[task.status]}
          </Badge>
          <Badge variant="outline" className={cn('capitalize', priorityBadgeTone[task.priority])}>
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
            {task.description ? <p className="text-xs text-muted-foreground">{task.description}</p> : null}
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
      </CardContent>
    </Card>
  );
}

function SortableTaskCard({ task, columnStatus }: { task: TaskListItem; columnStatus: TaskStatus }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: columnStatus },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} dragging={isDragging} />
    </article>
  );
}

function BoardColumn({
  status,
  meta,
  tasks,
  index,
  dragActive,
  activeId,
}: {
  status: TaskStatus;
  meta: { title: string; description: string };
  tasks: TaskListItem[];
  index: number;
  dragActive: boolean;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: getColumnId(status),
    data: { status },
  });

  return (
    <motion.article
      key={status}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-border/70 bg-card/50 p-5 shadow-sm backdrop-blur',
        dragActive ? 'ring-1 ring-border/60' : '',
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground/90">{meta.title}</h3>
          <Badge variant="muted" className="uppercase tracking-wide">
            {tasks.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
      </div>
      <div
        ref={setNodeRef}
        role="region"
        aria-label={`${meta.title} drop zone`}
        className={cn(
          'space-y-3 rounded-lg border border-dashed border-border/40 bg-background/40 p-3 transition-colors',
          isOver ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/30' : '',
        )}
      >
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
            {statusEmptyCopy[status]}
          </div>
        ) : null}
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} columnStatus={status} />
          ))}
        </SortableContext>
        {dragActive && tasks.length === 0 && activeId ? (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-6 text-center text-xs text-primary/80">
            Drop the task here
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
export function DashboardContent({ user }: { user: DashboardUser }) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('manual');
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => cloneColumnOrder(emptyColumnOrder));
  const [activeId, setActiveId] = useState<string | null>(null);
  const columnOrderRef = useRef(columnOrder);
  const dragSnapshotRef = useRef<ColumnOrderState | null>(null);
  const lastMoveRef = useRef<{ taskId: string; targetStatus: TaskStatus; targetIndex: number } | null>(null);

  const tasksQuery = useTasksQuery({ pageSize: 50 });
  const boardQuery = useTaskBoardQuery();
  const moveTask = useMoveTaskOnBoard();
  const { toast } = useToast();

  useEffect(() => {
    columnOrderRef.current = columnOrder;
  }, [columnOrder]);

  const boardOrder = useMemo(() => {
    if (!boardQuery.data) {
      return null;
    }

    const next = cloneColumnOrder(emptyColumnOrder);
    for (const column of boardQuery.data.columns) {
      next[column.status] = column.tasks.map((task) => task.id);
    }
    return next;
  }, [boardQuery.data]);

  useEffect(() => {
    if (!boardOrder || activeId) {
      return;
    }

    setColumnOrder((prev) => {
      const next = cloneColumnOrder(prev);
      let changed = false;

      for (const status of statusOrder) {
        const serverIds = boardOrder[status];
        const extras = prev[status].filter((id) => !serverIds.includes(id));
        const merged = [...serverIds, ...extras];

        if (!areArraysEqual(merged, prev[status])) {
          next[status] = merged;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [activeId, boardOrder]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskListItem[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const task of tasksQuery.tasks) {
      grouped[task.status].push(task);
    }

    return grouped;
  }, [tasksQuery.tasks]);

  useEffect(() => {
    setColumnOrder((prev) => {
      const next: ColumnOrderState = cloneColumnOrder(prev);
      let changed = false;

      for (const status of statusOrder) {
        const ids = tasksByStatus[status].map((task) => task.id);
        const retained = prev[status].filter((id) => ids.includes(id));
        const additions = ids.filter((id) => !retained.includes(id));
        const nextOrder = [...retained, ...additions];

        if (!areArraysEqual(nextOrder, prev[status])) {
          next[status] = nextOrder;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [tasksByStatus]);

  const orderedTasksByStatus = useMemo(() => {
    const ordered: Record<TaskStatus, TaskListItem[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const status of statusOrder) {
      if (sortBy !== 'manual') {
        ordered[status] = sortTasks(tasksByStatus[status], sortBy);
        continue;
      }

      const order = columnOrder[status];
      const tasks = tasksByStatus[status];
      const taskMap = new Map(tasks.map((task) => [task.id, task]));
      const orderedTasks = order.map((id) => taskMap.get(id)).filter(Boolean) as TaskListItem[];
      const missing = tasks.filter((task) => !order.includes(task.id));
      ordered[status] = [...orderedTasks, ...missing];
    }

    return ordered;
  }, [columnOrder, sortBy, tasksByStatus]);

  const visibleColumns = useMemo(
    () => {
      const targetStatuses = statusFilter === 'ALL' ? statusOrder : [statusFilter];

      return targetStatuses.map((status) => ({
        status,
        meta: statusMeta[status],
        tasks: orderedTasksByStatus[status],
      }));
    },
    [orderedTasksByStatus, statusFilter],
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
  const dragActive = Boolean(activeId);

  const taskMap = useMemo(() => new Map(tasksQuery.tasks.map((task) => [task.id, task])), [tasksQuery.tasks]);
  const activeTask = activeId ? taskMap.get(activeId) ?? null : null;

  const buildPositionAnnouncement = (taskId: string, status: TaskStatus) => {
    const tasks = columnOrderRef.current[status];
    const position = tasks.indexOf(taskId);
    return position === -1 ? '' : `Position ${position + 1} of ${tasks.length}.`;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findStatusForTask = (id: string) => {
    if (id.startsWith(columnIdPrefix)) {
      return getStatusFromColumnId(id);
    }

    return findTaskStatusInOrder(columnOrderRef.current, id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (moveTask.isPending) {
      return;
    }

    const currentId = event.active.id as string;
    setActiveId(currentId);
    setSortBy('manual');
    dragSnapshotRef.current = cloneColumnOrder(columnOrderRef.current);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeStatus = findStatusForTask(activeId);
    const overStatus = findStatusForTask(overId);

    if (!activeStatus || !overStatus) {
      return;
    }

    if (activeStatus === overStatus) {
      setColumnOrder((prev) => {
        const items = prev[overStatus];
        const activeIndex = items.indexOf(activeId);
        const overIndex = overId.startsWith(columnIdPrefix) ? items.length - 1 : items.indexOf(overId);

        if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
          return prev;
        }

        const updated = arrayMove(items, activeIndex, overIndex);
        const nextOrder = { ...prev, [overStatus]: updated };
        columnOrderRef.current = nextOrder;
        return nextOrder;
      });
      return;
    }

    setColumnOrder((prev) => {
      const activeItems = prev[activeStatus].filter((id) => id !== activeId);
      const overItems = [...prev[overStatus]];
      const overIndex = overId.startsWith(columnIdPrefix) ? overItems.length : overItems.indexOf(overId);
      const nextIndex = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(nextIndex, 0, activeId);

      const nextOrder = {
        ...prev,
        [activeStatus]: activeItems,
        [overStatus]: overItems,
      };
      columnOrderRef.current = nextOrder;
      return nextOrder;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeTaskId = active.id as string;
    setActiveId(null);

    if (!over) {
      if (dragSnapshotRef.current) {
        setColumnOrder((prev) => {
          const next = dragSnapshotRef.current ?? prev;
          columnOrderRef.current = next;
          return next;
        });
      }
      dragSnapshotRef.current = null;
      return;
    }

    const overId = over.id as string;
    const activeStatus = findStatusForTask(activeTaskId);
    const overStatus = findStatusForTask(overId);

    if (!activeStatus || !overStatus) {
      dragSnapshotRef.current = null;
      return;
    }

    const initialSnapshot = dragSnapshotRef.current;
    const initialStatus = initialSnapshot ? findTaskStatusInOrder(initialSnapshot, activeTaskId) : null;
    const sourceStatus = initialStatus ?? activeStatus;
    const destinationStatus = overStatus;
    const initialIndex = sourceStatus ? initialSnapshot?.[sourceStatus].indexOf(activeTaskId) ?? -1 : -1;

    let nextOrder = columnOrderRef.current;
    let targetIndex = nextOrder[destinationStatus].indexOf(activeTaskId);

    if (sourceStatus === destinationStatus) {
      const activeIndex = nextOrder[destinationStatus].indexOf(activeTaskId);
      const overIndex =
        overId.startsWith(columnIdPrefix) ? activeIndex : nextOrder[destinationStatus].indexOf(overId);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const updated = arrayMove(nextOrder[destinationStatus], activeIndex, overIndex);
        targetIndex = updated.indexOf(activeTaskId);
        setColumnOrder((prev) => {
          const next = { ...prev, [destinationStatus]: updated };
          columnOrderRef.current = next;
          return next;
        });
        nextOrder = { ...nextOrder, [destinationStatus]: updated };
      }
    }

    const hasMoved =
      sourceStatus !== destinationStatus || (sourceStatus === destinationStatus && initialIndex !== targetIndex);

    let clearSnapshotAfterDragEnd = true;

    if (hasMoved && targetIndex !== -1) {
      const movePayload = {
        taskId: activeTaskId,
        targetStatus: destinationStatus,
        targetIndex: Math.max(0, targetIndex),
      };
      lastMoveRef.current = movePayload;

      const rollbackSnapshot = dragSnapshotRef.current ? cloneColumnOrder(dragSnapshotRef.current) : null;
      clearSnapshotAfterDragEnd = false;

      moveTask.mutate(movePayload, {
        onError: () => {
          if (rollbackSnapshot) {
            setColumnOrder(() => {
              columnOrderRef.current = rollbackSnapshot;
              return rollbackSnapshot;
            });
          }

          toast({
            variant: 'destructive',
            title: 'Unable to move task',
            description: 'We could not save that move. Please try again.',
            action: (
              <ToastAction
                altText="Retry move"
                onClick={() => {
                  if (lastMoveRef.current) {
                    moveTask.mutate(lastMoveRef.current);
                  }
                }}
              >
                Retry
              </ToastAction>
            ),
          });
        },
        onSettled: () => {
          dragSnapshotRef.current = null;
        },
      });
    }

    if (clearSnapshotAfterDragEnd) {
      dragSnapshotRef.current = null;
    }
  };

  const handleDragCancel = () => {
    if (dragSnapshotRef.current) {
      setColumnOrder((prev) => {
        const next = dragSnapshotRef.current ?? prev;
        columnOrderRef.current = next;
        return next;
      });
    }
    dragSnapshotRef.current = null;
    setActiveId(null);
  };

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            accessibility={{
              screenReaderInstructions: {
                draggable:
                  'To pick up a task, press space or enter. Use arrow keys to move between columns. Press space or enter again to drop.',
              },
              announcements: {
                onDragStart: ({ active }) => {
                  const task = taskMap.get(active.id as string);
                  const status = findStatusForTask(active.id as string);
                  if (!task || !status) {
                    return 'Task picked up.';
                  }
                  return `Picked up ${task.title}. ${statusLabels[status]} lane. ${buildPositionAnnouncement(
                    task.id,
                    status,
                  )}`;
                },
                onDragOver: ({ active, over }) => {
                  if (!over) {
                    return 'Dragging task.';
                  }
                  const status = findStatusForTask(over.id as string);
                  if (!status) {
                    return 'Dragging task.';
                  }
                  const task = taskMap.get(active.id as string);
                  return task
                    ? `Moving ${task.title} over ${statusLabels[status]} lane.`
                    : `Moving over ${statusLabels[status]} lane.`;
                },
                onDragEnd: ({ active, over }) => {
                  if (!over) {
                    return 'Task dropped.';
                  }
                  const task = taskMap.get(active.id as string);
                  const status = findStatusForTask(over.id as string);
                  if (!task || !status) {
                    return 'Task dropped.';
                  }
                  return `Dropped ${task.title} in ${statusLabels[status]} lane.`;
                },
                onDragCancel: () => 'Task movement cancelled.',
              },
            }}
          >
            <section className="grid gap-4 md:grid-cols-3">
              {visibleColumns.map((column, index) => (
                <BoardColumn
                  key={column.status}
                  status={column.status}
                  meta={column.meta}
                  tasks={column.tasks}
                  index={index}
                  dragActive={dragActive}
                  activeId={activeId}
                />
              ))}
            </section>
            <DragOverlay>
              {activeTask ? (
                <div className="w-[320px] max-w-full">
                  <TaskCard task={activeTask} dragging />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : null}
      </section>

      <footer className="text-xs text-muted-foreground">
        Tracking {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} across your workspace.
      </footer>
    </div>
  );
}

