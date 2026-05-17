"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Check,
  CheckCircle2,
  ClipboardList,
  Filter,
  GripVertical,
  ListTodo,
  Loader2,
  PenSquare,
  PlusCircle,
  RefreshCcw,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TaskPriority, TaskStatus } from "@taskforge/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import {
  useMoveTaskOnBoard,
  useTaskBoardQuery,
  useTagsQuery,
  useTasksQuery,
  type TaskListItem,
} from "@/lib/tasks-hooks";
import { cn } from "@/lib/utils";
import { sanitizeTags } from "@/lib/task-tags";
import { TaskTagSelector } from "@/components/tasks/task-tag-selector";

import type { DashboardUser } from "./types";
import {
  areArraysEqual,
  cloneColumnOrder,
  columnIdPrefix,
  emptyColumnOrder,
  findTaskStatusInOrder,
  getColumnId,
  getColumnEndTargetIndex,
  getFullLaneTargetIndex,
  getStatusFromColumnId,
  moveTaskToColumnEnd,
  type ColumnOrderState,
  statusOrder,
} from "./board-order-utils";

const statusMeta: Record<TaskStatus, { title: string; description: string }> = {
  TODO: {
    title: "To do",
    description: "Ideas and tasks that still need attention.",
  },
  IN_PROGRESS: {
    title: "In progress",
    description: "Focused work currently moving forward.",
  },
  DONE: {
    title: "Done",
    description: "Shipped work ready to celebrate.",
  },
};

const statusEmptyCopy: Record<TaskStatus, string> = {
  TODO: "No tasks to pick up yet.",
  IN_PROGRESS: "Nothing in progress yet.",
  DONE: "Nothing completed yet.",
};

const statusLabels: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const priorityLabels: Record<TaskPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const priorityWeights: Record<TaskPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const statusBadgeTone: Record<TaskStatus, string> = {
  TODO: "border-amber-300/70 bg-amber-400/10 text-amber-700 dark:border-amber-200/40 dark:text-amber-100",
  IN_PROGRESS:
    "border-sky-300/70 bg-sky-400/10 text-sky-700 dark:border-sky-200/40 dark:text-sky-100",
  DONE: "border-emerald-300/70 bg-emerald-400/10 text-emerald-700 dark:border-emerald-200/40 dark:text-emerald-100",
};

const priorityBadgeTone: Record<TaskPriority, string> = {
  HIGH: "border-destructive/50 bg-destructive/10 text-destructive",
  MEDIUM: "border-primary/40 bg-primary/10 text-primary",
  LOW: "border-muted-foreground/30 bg-muted/80 text-muted-foreground",
};

const statusFilters: Array<{ value: "ALL" | TaskStatus; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

const sortOptions = [
  { value: "manual", label: "Board order" },
  { value: "recent", label: "Recently updated" },
  { value: "dueDate", label: "Due date" },
  { value: "priority", label: "Priority" },
] as const;
const BOARD_FILTERS_STORAGE_KEY = "taskforge.dashboard.filters";
type DueWindow = "ALL" | "PAST" | "TODAY" | "NEXT_7_DAYS" | "CUSTOM";
const dueWindows: DueWindow[] = ["ALL", "PAST", "TODAY", "NEXT_7_DAYS"];
const dueWindowLabels: Record<DueWindow, string> = {
  ALL: "Any due date",
  PAST: "Due before now",
  TODAY: "Due today",
  NEXT_7_DAYS: "Due next 7 days",
  CUSTOM: "Custom due range",
};

type SortOption = (typeof sortOptions)[number]["value"];

const isDevMode = process.env.NODE_ENV !== "production";

interface BoardMovePayload {
  taskId: string;
  targetStatus: TaskStatus;
  targetIndex: number;
}

interface BoardMoveRollback {
  taskId: string;
  sourceStatus: TaskStatus;
  sourceIndex: number;
}

interface BoardFilterState {
  statusFilter: "ALL" | TaskStatus;
  priorityFilter: "ALL" | TaskPriority;
  dueWindow: DueWindow;
  customDueRange: { dueFrom?: string; dueTo?: string } | null;
  searchQuery: string;
  tagFilters: string[];
}

function createDefaultBoardFilterState(tagFilters: string[] = []): BoardFilterState {
  return {
    statusFilter: "ALL",
    priorityFilter: "ALL",
    dueWindow: "ALL",
    customDueRange: null,
    searchQuery: "",
    tagFilters,
  };
}

function isTaskStatusFilter(value: string | null): value is TaskStatus {
  return value === "TODO" || value === "IN_PROGRESS" || value === "DONE";
}

function isTaskPriorityFilter(value: string | null): value is TaskPriority {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

function normalizeDueWindow(value: string | null | undefined): DueWindow | null {
  if (value === "OVERDUE") {
    return "PAST";
  }

  return dueWindows.includes(value as DueWindow) ? (value as DueWindow) : null;
}

function parseBoardFiltersFromSearchParams(searchParams: URLSearchParams): BoardFilterState {
  const state = createDefaultBoardFilterState(sanitizeTags(searchParams.getAll("tag")));
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const dueWindow = normalizeDueWindow(searchParams.get("dueWindow"));
  const dueFrom = searchParams.get("dueFrom") ?? undefined;
  const dueTo = searchParams.get("dueTo") ?? undefined;

  if (isTaskStatusFilter(status)) {
    state.statusFilter = status;
  }

  if (isTaskPriorityFilter(priority)) {
    state.priorityFilter = priority;
  }

  if (dueWindow) {
    state.dueWindow = dueWindow;
    state.customDueRange = null;
  } else if (dueFrom || dueTo) {
    state.dueWindow = "CUSTOM";
    state.customDueRange = { dueFrom, dueTo };
  }

  state.searchQuery = searchParams.get("q") ?? "";
  return state;
}

function readBoardFiltersFromStorage(): BoardFilterState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BOARD_FILTERS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<{
      statusFilter: BoardFilterState["statusFilter"];
      priorityFilter: BoardFilterState["priorityFilter"];
      dueWindow: DueWindow | "OVERDUE";
      dueRange: { dueFrom?: string; dueTo?: string };
      searchQuery: string;
      tagFilters: string[];
    }> | null;
    if (!parsed) {
      return null;
    }

    const state = createDefaultBoardFilterState();
    const statusFilter = parsed.statusFilter;
    if (statusFilter === "ALL") {
      state.statusFilter = statusFilter;
    } else {
      const maybeStatus = typeof statusFilter === "string" ? statusFilter : null;
      if (isTaskStatusFilter(maybeStatus)) {
        state.statusFilter = maybeStatus;
      }
    }

    const priorityFilter = parsed.priorityFilter;
    if (priorityFilter === "ALL") {
      state.priorityFilter = priorityFilter;
    } else {
      const maybePriority = typeof priorityFilter === "string" ? priorityFilter : null;
      if (isTaskPriorityFilter(maybePriority)) {
        state.priorityFilter = maybePriority;
      }
    }

    const dueWindow = normalizeDueWindow(parsed.dueWindow);
    if (dueWindow) {
      state.dueWindow = dueWindow;
      state.customDueRange = null;
    } else if (parsed.dueWindow === "CUSTOM" && (parsed.dueRange?.dueFrom || parsed.dueRange?.dueTo)) {
      state.dueWindow = "CUSTOM";
      state.customDueRange = {
        dueFrom: parsed.dueRange.dueFrom,
        dueTo: parsed.dueRange.dueTo,
      };
    }

    state.searchQuery = typeof parsed.searchQuery === "string" ? parsed.searchQuery : "";
    state.tagFilters = Array.isArray(parsed.tagFilters) ? sanitizeTags(parsed.tagFilters) : [];
    return state;
  } catch {
    return null;
  }
}

function writeBoardFiltersToStorage(state: BoardFilterState, dueRange: { dueFrom?: string; dueTo?: string }) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      BOARD_FILTERS_STORAGE_KEY,
      JSON.stringify({
        statusFilter: state.statusFilter,
        priorityFilter: state.priorityFilter,
        dueWindow: state.dueWindow,
        dueRange,
        searchQuery: state.searchQuery,
        tagFilters: state.tagFilters,
      }),
    );
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function clearBoardFiltersFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(BOARD_FILTERS_STORAGE_KEY);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function getDueRangeForWindow(dueWindow: DueWindow): { dueFrom?: string; dueTo?: string } {
  const now = new Date();

  if (dueWindow === "PAST") {
    return { dueTo: now.toISOString() };
  }

  if (dueWindow === "TODAY") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { dueFrom: start.toISOString(), dueTo: end.toISOString() };
  }

  if (dueWindow === "NEXT_7_DAYS") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { dueFrom: now.toISOString(), dueTo: end.toISOString() };
  }

  return {};
}

function getInitials(user: DashboardUser) {
  return (
    user.name
      ?.split(" ")
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("") ?? (user.email ? user.email.charAt(0).toUpperCase() : "TF")
  );
}

function formatDueDate(value: string | null | undefined) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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
    case "manual":
      return copy;
    case "priority":
      copy.sort(
        (a, b) => priorityWeights[a.priority] - priorityWeights[b.priority],
      );
      break;
    case "dueDate":
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
    case "recent":
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

function TaskCard({
  task,
  dragging,
  editable = true,
  dragHandle,
}: {
  task: TaskListItem;
  dragging?: boolean;
  editable?: boolean;
  dragHandle?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "border-border/60 bg-background/60 shadow-sm transition-colors",
        dragging ? "shadow-md ring-2 ring-primary/40" : "hover:border-border",
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "uppercase tracking-wide",
              statusBadgeTone[task.status],
            )}
          >
            {statusLabels[task.status]}
          </Badge>
          <Badge
            variant="outline"
            className={cn("capitalize", priorityBadgeTone[task.priority])}
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
              <p className="text-xs text-muted-foreground">
                {task.description}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Due {formatDueDate(task.dueDate)}
            </p>
            {task.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <Badge
                    key={`${task.id}-${tag}`}
                    variant="outline"
                    title={tag}
                    className="max-w-28 truncate border-violet-300/60 bg-violet-500/10 text-violet-900 dark:border-violet-200/40 dark:text-violet-100"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {dragHandle}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-2 px-2 text-xs"
              disabled={!editable}
              {...(editable
                ? { "data-task-dialog": "edit", "data-task-id": task.id }
                : {})}
              aria-label={
                editable
                  ? `Edit task ${task.title}`
                  : `Task ${task.title} cannot be edited from this view`
              }
            >
              <PenSquare className="h-3.5 w-3.5" />{" "}
              {editable ? "Edit" : "View only"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableTaskCard({
  task,
  columnStatus,
  editable,
  draggable,
}: {
  task: TaskListItem;
  columnStatus: TaskStatus;
  editable: boolean;
  draggable: boolean;
}) {
  const isOptimistic = Boolean(task._optimistic);
  const dragDisabled = isOptimistic || !draggable;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { status: columnStatus },
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(dragDisabled ? "opacity-90" : "")}
    >
      <TaskCard
        task={task}
        dragging={isDragging}
        editable={editable}
        dragHandle={
          <Button
            ref={setActivatorNodeRef}
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 cursor-grab text-muted-foreground active:cursor-grabbing"
            aria-label={
              dragDisabled
                ? `Task ${task.title} cannot be dragged right now`
                : `Drag task ${task.title}`
            }
            disabled={dragDisabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        }
      />
    </article>
  );
}

function DraggableTaskCard({
  task,
  columnStatus,
  editable,
  draggable,
}: {
  task: TaskListItem;
  columnStatus: TaskStatus;
  editable: boolean;
  draggable: boolean;
}) {
  const isOptimistic = Boolean(task._optimistic);
  const dragDisabled = isOptimistic || !draggable;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { status: columnStatus },
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(dragDisabled ? "opacity-90" : "")}
    >
      <TaskCard
        task={task}
        dragging={isDragging}
        editable={editable}
        dragHandle={
          <Button
            ref={setActivatorNodeRef}
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 cursor-grab text-muted-foreground active:cursor-grabbing"
            aria-label={
              dragDisabled
                ? `Task ${task.title} cannot be dragged right now`
                : `Move task ${task.title} to another status`
            }
            disabled={dragDisabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        }
      />
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
  editableTaskIds,
  draggableTaskIds,
  preciseDropPreview,
  statusDropTarget,
}: {
  status: TaskStatus;
  meta: { title: string; description: string };
  tasks: TaskListItem[];
  index: number;
  dragActive: boolean;
  activeId: string | null;
  editableTaskIds: ReadonlySet<string>;
  draggableTaskIds: ReadonlySet<string>;
  preciseDropPreview: boolean;
  statusDropTarget: boolean;
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
        "flex flex-col gap-4 rounded-xl border border-border/70 bg-card/50 p-5 shadow-sm backdrop-blur",
        dragActive ? "ring-1 ring-border/60" : "",
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground/90">
            {meta.title}
          </h3>
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
          "space-y-3 rounded-lg border border-dashed border-border/40 bg-background/40 p-3 transition-colors",
          preciseDropPreview && isOver
            ? "border-primary/60 bg-primary/5 ring-2 ring-primary/30"
            : "",
          !preciseDropPreview && statusDropTarget
            ? "border-primary/80 bg-primary/10 ring-2 ring-primary/45"
            : "",
        )}
      >
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
            {statusEmptyCopy[status]}
          </div>
        ) : null}
        {preciseDropPreview ? (
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                columnStatus={status}
                editable={editableTaskIds.has(task.id)}
                draggable={draggableTaskIds.has(task.id)}
              />
            ))}
          </SortableContext>
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              columnStatus={status}
              editable={editableTaskIds.has(task.id)}
              draggable={draggableTaskIds.has(task.id)}
            />
          ))
        )}
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearchParams = new URLSearchParams(searchParams.toString());
  const initialFilterState = parseBoardFiltersFromSearchParams(initialSearchParams);
  const hasInitialQuery = initialSearchParams.toString().length > 0;
  const [hasHydratedFilters, setHasHydratedFilters] = useState(() => hasInitialQuery);
  const hasLoadedInitialStoredFiltersRef = useRef(hasInitialQuery);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>(() => initialFilterState.statusFilter);
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | TaskPriority>(() => initialFilterState.priorityFilter);
  const [dueWindow, setDueWindow] = useState<DueWindow>(() => initialFilterState.dueWindow);
  const [customDueRange, setCustomDueRange] = useState<{ dueFrom?: string; dueTo?: string } | null>(
    () => initialFilterState.customDueRange,
  );
  const [searchQuery, setSearchQuery] = useState(() => initialFilterState.searchQuery);
  const [tagFilters, setTagFilters] = useState<string[]>(() => initialFilterState.tagFilters);
  const [sortBy, setSortBy] = useState<SortOption>("manual");
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() =>
    cloneColumnOrder(emptyColumnOrder),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inFlightTaskIds, setInFlightTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [overColumnStatus, setOverColumnStatus] = useState<TaskStatus | null>(
    null,
  );
  const isManualSort = sortBy === "manual";
  const columnOrderRef = useRef(columnOrder);
  const boardOrderRef = useRef<ColumnOrderState | null>(null);
  const workspaceBoardOrderRef = useRef<ColumnOrderState | null>(null);
  const canDragTasksRef = useRef(false);
  const dragSnapshotRef = useRef<ColumnOrderState | null>(null);
  const inFlightTaskIdsRef = useRef<Set<string>>(new Set());
  const dueRange = useMemo(
    () => customDueRange ?? getDueRangeForWindow(dueWindow),
    [customDueRange, dueWindow],
  );
  const hasActiveFilters =
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    dueWindow !== "ALL" ||
    Boolean(customDueRange?.dueFrom || customDueRange?.dueTo) ||
    searchQuery.trim().length > 0 ||
    tagFilters.length > 0;

  const tasksQuery = useTasksQuery(
    {
      pageSize: 50,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      priority: priorityFilter === "ALL" ? undefined : priorityFilter,
      tag: tagFilters.length > 0 ? tagFilters : undefined,
      q: searchQuery.trim() || undefined,
      dueFrom: dueRange.dueFrom,
      dueTo: dueRange.dueTo,
    },
    { enabled: hasHydratedFilters },
  );
  const boardQuery = useTaskBoardQuery(
    {
      status: statusFilter === "ALL" ? undefined : statusFilter,
      priority: priorityFilter === "ALL" ? undefined : priorityFilter,
      tag: tagFilters.length > 0 ? tagFilters : undefined,
      q: searchQuery.trim() || undefined,
      dueFrom: dueRange.dueFrom,
      dueTo: dueRange.dueTo,
    },
    { enabled: hasHydratedFilters },
  );
  const workspaceBoardQuery = useTaskBoardQuery(undefined, {
    enabled: hasHydratedFilters,
  });
  const tagsQuery = useTagsQuery();
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
  const workspaceBoardOrder = useMemo(() => {
    if (!workspaceBoardQuery.data) {
      return null;
    }

    const next = cloneColumnOrder(emptyColumnOrder);
    for (const column of workspaceBoardQuery.data.columns) {
      next[column.status] = column.tasks.map((task) => task.id);
    }
    return next;
  }, [workspaceBoardQuery.data]);

  const isBoardReady = Boolean(boardOrder);
  const canDragTasks =
    isBoardReady &&
    !boardQuery.error &&
    (!hasActiveFilters || Boolean(workspaceBoardOrder));

  boardOrderRef.current = boardOrder;
  workspaceBoardOrderRef.current = workspaceBoardOrder;
  canDragTasksRef.current = canDragTasks;

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

      if (changed) {
        columnOrderRef.current = next;
        return next;
      }

      return prev;
    });
  }, [activeId, boardOrder]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskListItem[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    if (boardQuery.data) {
      const detailedTaskMap = new Map(
        tasksQuery.tasks.map((task) => [task.id, task]),
      );
      const seen = new Set<string>();

      for (const column of boardQuery.data.columns) {
        for (const boardTask of column.tasks) {
          const detailed = detailedTaskMap.get(boardTask.id);
          if (detailed) {
            grouped[column.status].push({
              ...detailed,
              title: boardTask.title,
              status: column.status,
              priority: boardTask.priority,
              dueDate: boardTask.dueDate,
              tags: boardTask.tags,
              updatedAt: boardTask.updatedAt,
            });
          } else {
            grouped[column.status].push({
              id: boardTask.id,
              title: boardTask.title,
              description: undefined,
              status: boardTask.status,
              priority: boardTask.priority,
              dueDate: boardTask.dueDate,
              tags: boardTask.tags,
              createdAt: boardTask.updatedAt,
              updatedAt: boardTask.updatedAt,
            });
          }
          seen.add(boardTask.id);
        }
      }

      for (const task of tasksQuery.tasks) {
        if (!seen.has(task.id)) {
          grouped[task.status].push(task);
        }
      }

      return grouped;
    }

    for (const task of tasksQuery.tasks) {
      grouped[task.status].push(task);
    }

    return grouped;
  }, [boardQuery.data, tasksQuery.tasks]);

  useEffect(() => {
    setColumnOrder((prev) => {
      const next: ColumnOrderState = cloneColumnOrder(prev);
      let changed = false;

      for (const status of statusOrder) {
        const visibleIds = tasksByStatus[status].map((task) => task.id);
        const baseOrder =
          boardOrder?.[status] ??
          prev[status].filter((id) => visibleIds.includes(id));
        const additions = visibleIds.filter((id) => !baseOrder.includes(id));
        const nextOrder = [...baseOrder, ...additions];

        if (!areArraysEqual(nextOrder, prev[status])) {
          next[status] = nextOrder;
          changed = true;
        }
      }

      if (changed) {
        columnOrderRef.current = next;
        return next;
      }

      return prev;
    });
  }, [boardOrder, tasksByStatus]);

  const orderedTasksByStatus = useMemo(() => {
    const ordered: Record<TaskStatus, TaskListItem[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const status of statusOrder) {
      if (sortBy !== "manual") {
        ordered[status] = sortTasks(tasksByStatus[status], sortBy);
        continue;
      }

      const order = columnOrder[status];
      const tasks = tasksByStatus[status];
      const taskMap = new Map(tasks.map((task) => [task.id, task]));
      const orderedTasks = order
        .map((id) => taskMap.get(id))
        .filter(Boolean) as TaskListItem[];
      const missing = tasks.filter((task) => !order.includes(task.id));
      ordered[status] = [...orderedTasks, ...missing];
    }

    return ordered;
  }, [columnOrder, sortBy, tasksByStatus]);

  const visibleColumns = useMemo(() => {
    const targetStatuses =
      statusFilter === "ALL" ? statusOrder : [statusFilter];

    return targetStatuses.map((status) => ({
      status,
      meta: statusMeta[status],
      tasks: orderedTasksByStatus[status],
    }));
  }, [orderedTasksByStatus, statusFilter]);

  const visibleTaskCount = useMemo(
    () =>
      visibleColumns.reduce((total, column) => total + column.tasks.length, 0),
    [visibleColumns],
  );

  const workspaceSummary = workspaceBoardQuery.data?.summary;
  const unfilteredFallbackSummary = hasActiveFilters
    ? undefined
    : boardQuery.data?.summary;
  const totalTasks =
    workspaceSummary?.totalTasks ??
    unfilteredFallbackSummary?.totalTasks ??
    (!hasActiveFilters
      ? (tasksQuery.data?.total ?? tasksQuery.tasks.length)
      : 0);
  const completedTasks =
    workspaceSummary?.totalsByStatus.DONE ??
    unfilteredFallbackSummary?.totalsByStatus.DONE ??
    (!hasActiveFilters ? tasksByStatus.DONE.length : 0);
  const activeTasks =
    workspaceSummary?.totalsByStatus.IN_PROGRESS ??
    unfilteredFallbackSummary?.totalsByStatus.IN_PROGRESS ??
    (!hasActiveFilters ? tasksByStatus.IN_PROGRESS.length : 0);
  const todoTasks =
    workspaceSummary?.totalsByStatus.TODO ??
    unfilteredFallbackSummary?.totalsByStatus.TODO ??
    (!hasActiveFilters ? tasksByStatus.TODO.length : 0);
  const isWorkspaceStatsLoading =
    workspaceBoardQuery.isLoading && !workspaceSummary;

  const applyBoardFilterState = useCallback((state: BoardFilterState) => {
    setStatusFilter(state.statusFilter);
    setPriorityFilter(state.priorityFilter);
    setDueWindow(state.dueWindow);
    setCustomDueRange(state.customDueRange);
    setSearchQuery(state.searchQuery);
    setTagFilters((previous) =>
      previous.length === state.tagFilters.length &&
      previous.every((value, index) => value === state.tagFilters[index])
        ? previous
        : state.tagFilters,
    );
  }, []);

  useEffect(() => {
    const rawQuery = searchParams.toString();
    if (!rawQuery) {
      const nextState = hasLoadedInitialStoredFiltersRef.current
        ? createDefaultBoardFilterState()
        : readBoardFiltersFromStorage() ?? createDefaultBoardFilterState();

      hasLoadedInitialStoredFiltersRef.current = true;
      applyBoardFilterState(nextState);
      setHasHydratedFilters(true);
      return;
    }

    hasLoadedInitialStoredFiltersRef.current = true;
    applyBoardFilterState(parseBoardFiltersFromSearchParams(new URLSearchParams(rawQuery)));
    setHasHydratedFilters(true);
  }, [applyBoardFilterState, searchParams]);

  useEffect(() => {
    if (!hasHydratedFilters) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    statusFilter === "ALL" ? params.delete("status") : params.set("status", statusFilter);
    priorityFilter === "ALL" ? params.delete("priority") : params.set("priority", priorityFilter);
    params.delete("dueWindow");
    params.delete("dueFrom");
    params.delete("dueTo");
    if (dueWindow !== "ALL" && dueWindow !== "CUSTOM") {
      params.set("dueWindow", dueWindow);
    }
    if (dueRange.dueFrom) {
      params.set("dueFrom", dueRange.dueFrom);
    }
    if (dueRange.dueTo) {
      params.set("dueTo", dueRange.dueTo);
    }
    searchQuery.trim() ? params.set("q", searchQuery.trim()) : params.delete("q");
    params.delete("tag");
    for (const tag of tagFilters) {
      params.append("tag", tag);
    }
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    writeBoardFiltersToStorage(
      { statusFilter, priorityFilter, dueWindow, customDueRange, searchQuery, tagFilters },
      dueRange,
    );
  }, [
    customDueRange,
    dueRange,
    dueWindow,
    hasHydratedFilters,
    pathname,
    priorityFilter,
    router,
    searchParams,
    searchQuery,
    statusFilter,
    tagFilters,
  ]);

  const handleTagFiltersChange = useCallback(
    (nextTags: string[]) => {
      const nextTagFilters = sanitizeTags(nextTags);
      setTagFilters((previous) =>
        previous.length === nextTagFilters.length &&
        previous.every((value, index) => value === nextTagFilters[index])
          ? previous
          : nextTagFilters,
      );

    },
    [],
  );

  const availableTags = useMemo(() => {
    const collected: string[] = [];
    for (const tag of tagsQuery.tags) {
      collected.push(tag.label);
    }
    for (const tag of tagFilters) {
      collected.push(tag);
    }
    return sanitizeTags(collected);
  }, [tagFilters, tagsQuery.tags]);

  const firstName = user.name?.split(" ")[0] ?? "there";

  const isEmpty =
    !hasActiveFilters &&
    !tasksQuery.isLoading &&
    !isWorkspaceStatsLoading &&
    !tasksQuery.isError &&
    totalTasks === 0;
  const isFilteredEmpty =
    hasActiveFilters &&
    !tasksQuery.isLoading &&
    !tasksQuery.isError &&
    !boardQuery.isLoading &&
    !boardQuery.isError &&
    visibleTaskCount === 0;
  const dragActive = Boolean(activeId);

  const renderedTaskMap = useMemo(() => {
    const map = new Map<string, TaskListItem>();

    for (const status of statusOrder) {
      for (const task of orderedTasksByStatus[status]) {
        map.set(task.id, task);
      }
    }

    return map;
  }, [orderedTasksByStatus]);
  const editableTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const taskId of renderedTaskMap.keys()) {
      if (!inFlightTaskIds.has(taskId)) {
        ids.add(taskId);
      }
    }
    return ids;
  }, [inFlightTaskIds, renderedTaskMap]);
  const draggableTaskIds = useMemo(() => {
    const ids = new Set<string>();
    if (!canDragTasks) {
      return ids;
    }
    for (const taskId of renderedTaskMap.keys()) {
      if (!inFlightTaskIds.has(taskId)) {
        ids.add(taskId);
      }
    }
    return ids;
  }, [canDragTasks, inFlightTaskIds, renderedTaskMap]);
  const activeTask = activeId ? (renderedTaskMap.get(activeId) ?? null) : null;

  const buildPositionAnnouncement = (taskId: string, status: TaskStatus) => {
    const tasks = columnOrderRef.current[status];
    const position = tasks.indexOf(taskId);
    return position === -1
      ? ""
      : `Position ${position + 1} of ${tasks.length}.`;
  };

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const sortableKeyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const statusKeyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(
    pointerSensor,
    isManualSort ? sortableKeyboardSensor : statusKeyboardSensor,
  );

  const trackTaskMutationStart = (taskId: string) => {
    if (inFlightTaskIdsRef.current.has(taskId)) {
      return false;
    }

    inFlightTaskIdsRef.current.add(taskId);
    setInFlightTaskIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });

    if (isDevMode) {
      console.info("[board-move] optimistic mutation started", { taskId });
    }

    return true;
  };

  const trackTaskMutationEnd = (taskId: string) => {
    if (!inFlightTaskIdsRef.current.has(taskId)) {
      return;
    }

    inFlightTaskIdsRef.current.delete(taskId);
    setInFlightTaskIds((prev) => {
      if (!prev.has(taskId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });

    if (isDevMode) {
      console.info("[board-move] mutation settled", { taskId });
    }
  };

  const findStatusForTask = (id: string) => {
    if (id.startsWith(columnIdPrefix)) {
      return getStatusFromColumnId(id);
    }

    return findTaskStatusInOrder(columnOrderRef.current, id);
  };

  const rollbackTaskMove = (rollback: BoardMoveRollback | null) => {
    if (!rollback) {
      return;
    }

    setColumnOrder((prev) => {
      const next = cloneColumnOrder(prev);
      let found = false;

      for (const status of statusOrder) {
        const filtered = next[status].filter((id) => id !== rollback.taskId);
        if (filtered.length !== next[status].length) {
          found = true;
        }
        next[status] = filtered;
      }

      if (!found) {
        return prev;
      }

      const sourceItems = next[rollback.sourceStatus];
      const insertIndex = Math.max(
        0,
        Math.min(rollback.sourceIndex, sourceItems.length),
      );
      sourceItems.splice(insertIndex, 0, rollback.taskId);
      columnOrderRef.current = next;
      return next;
    });
  };

  const submitBoardMove = async (
    movePayload: BoardMovePayload,
    rollback: BoardMoveRollback | null,
  ) => {
    if (!trackTaskMutationStart(movePayload.taskId)) {
      return;
    }

    try {
      await moveTask.mutateAsync(movePayload);
    } catch {
      rollbackTaskMove(rollback);

      toast({
        variant: "destructive",
        title: "Unable to move task",
        description:
          "Your card was moved back because the server rejected the optimistic move. Please try again.",
        action: (
          <ToastAction
            altText="Retry move"
            onClick={() => void submitBoardMove(movePayload, rollback)}
          >
            Retry
          </ToastAction>
        ),
      });
    } finally {
      trackTaskMutationEnd(movePayload.taskId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!canDragTasksRef.current) {
      return;
    }

    const currentId = event.active.id as string;
    if (inFlightTaskIds.has(currentId)) {
      return;
    }

    setActiveId(currentId);
    setOverColumnStatus(null);
    dragSnapshotRef.current = cloneColumnOrder(columnOrderRef.current);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !canDragTasksRef.current) {
      if (!isManualSort) {
        setOverColumnStatus(null);
      }
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeStatus = findStatusForTask(activeId);
    const overStatus = findStatusForTask(overId);

    if (!activeStatus || !overStatus) {
      if (!isManualSort) {
        setOverColumnStatus(null);
      }
      return;
    }

    if (!isManualSort) {
      const initialStatus = dragSnapshotRef.current
        ? findTaskStatusInOrder(dragSnapshotRef.current, activeId)
        : activeStatus;

      if (!initialStatus) {
        return;
      }

      if (initialStatus === overStatus) {
        setOverColumnStatus(null);
        if (dragSnapshotRef.current) {
          const snapshot = dragSnapshotRef.current;
          setColumnOrder((prev) => {
            if (
              statusOrder.every((status) =>
                areArraysEqual(prev[status], snapshot[status]),
              )
            ) {
              return prev;
            }
            columnOrderRef.current = snapshot;
            return snapshot;
          });
        }
        return;
      }

      setOverColumnStatus(overStatus);
      setColumnOrder((prev) => {
        const nextOrder = moveTaskToColumnEnd(prev, activeId, overStatus);
        if (nextOrder === prev) {
          return prev;
        }
        columnOrderRef.current = nextOrder;
        return nextOrder;
      });
      return;
    }

    if (activeStatus === overStatus) {
      setColumnOrder((prev) => {
        const items = prev[overStatus];
        const activeIndex = items.indexOf(activeId);
        const overIndex = overId.startsWith(columnIdPrefix)
          ? items.length - 1
          : items.indexOf(overId);

        if (
          activeIndex === -1 ||
          overIndex === -1 ||
          activeIndex === overIndex
        ) {
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
      const overIndex = isManualSort
        ? overId.startsWith(columnIdPrefix)
          ? overItems.length
          : overItems.indexOf(overId)
        : overItems.length;
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
    setOverColumnStatus(null);

    if (!canDragTasksRef.current) {
      dragSnapshotRef.current = null;
      return;
    }

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
    const initialStatus = initialSnapshot
      ? findTaskStatusInOrder(initialSnapshot, activeTaskId)
      : null;
    const sourceStatus = initialStatus ?? activeStatus;
    const destinationStatus = overStatus;
    const initialIndex = sourceStatus
      ? (initialSnapshot?.[sourceStatus].indexOf(activeTaskId) ?? -1)
      : -1;

    const nextOrder = columnOrderRef.current;
    const fullBoardOrder =
      workspaceBoardOrderRef.current ?? boardOrderRef.current ?? nextOrder;
    const targetIndex = isManualSort
      ? getFullLaneTargetIndex(
          fullBoardOrder[destinationStatus],
          nextOrder[destinationStatus],
          activeTaskId,
        )
      : getColumnEndTargetIndex(
          fullBoardOrder,
          activeTaskId,
          destinationStatus,
        );

    const hasMoved =
      isManualSort
        ? targetIndex !== -1 &&
          (sourceStatus !== destinationStatus ||
            (sourceStatus === destinationStatus && initialIndex !== targetIndex))
        : sourceStatus !== destinationStatus;

    if (hasMoved && targetIndex !== -1) {
      const movePayload = {
        taskId: activeTaskId,
        targetStatus: destinationStatus,
        targetIndex: Math.max(0, targetIndex),
      };

      const rollback =
        initialIndex >= 0
          ? {
              taskId: activeTaskId,
              sourceStatus,
              sourceIndex: initialIndex,
            }
          : null;

      void submitBoardMove(movePayload, rollback);
    }

    dragSnapshotRef.current = null;
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
    setOverColumnStatus(null);
  };

  const refetchBoardAndTasks = () =>
    Promise.all([
      tasksQuery.refetch(),
      boardQuery.refetch(),
      workspaceBoardQuery.refetch(),
    ]);

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
          <h2 className="text-4xl font-semibold leading-tight">
            Welcome back, {firstName}!
          </h2>
          <p className="text-lg text-muted-foreground">
            {tasksQuery.isLoading || isWorkspaceStatsLoading
              ? "We are syncing your workspace tasks—hang tight for a moment."
              : totalTasks > 0
                ? `Here is a quick snapshot of your work: ${activeTasks} in progress, ${todoTasks} queued up, and ${completedTasks} already done.`
                : "Create your first task to capture the work that matters. Everything stays in sync once data starts flowing."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" data-task-dialog="create" className="gap-2">
              <PlusCircle className="h-4 w-4" /> New task
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => void refetchBoardAndTasks()}
              disabled={
                tasksQuery.isFetching ||
                boardQuery.isFetching ||
                workspaceBoardQuery.isFetching
              }
            >
              <RefreshCcw
                className={cn(
                  "h-4 w-4",
                  (tasksQuery.isFetching ||
                    boardQuery.isFetching ||
                    workspaceBoardQuery.isFetching) &&
                    "animate-spin",
                )}
              />
              {tasksQuery.isFetching ||
              boardQuery.isFetching ||
              workspaceBoardQuery.isFetching
                ? "Refreshing"
                : "Refresh"}
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
              <CardDescription>
                Your personal overview stays in sync with the API session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-muted text-sm font-medium uppercase text-muted-foreground">
                  {getInitials(user)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {user.name ?? user.email ?? "TaskForge member"}
                  </span>
                  {user.email && (
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2 text-foreground">
                    <Timer className="h-4 w-4 text-primary" /> Active tasks
                  </span>
                  {tasksQuery.isLoading || isWorkspaceStatsLoading ? (
                    <Skeleton className="h-4 w-10" />
                  ) : (
                    <span className="font-medium text-foreground">
                      {activeTasks}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2 text-foreground">
                    <ListTodo className="h-4 w-4 text-primary" /> Up next
                  </span>
                  {tasksQuery.isLoading || isWorkspaceStatsLoading ? (
                    <Skeleton className="h-4 w-10" />
                  ) : (
                    <span className="font-medium text-foreground">
                      {todoTasks}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Completed
                  </span>
                  {tasksQuery.isLoading || isWorkspaceStatsLoading ? (
                    <Skeleton className="h-4 w-10" />
                  ) : (
                    <span className="font-medium text-foreground">
                      {completedTasks}
                    </span>
                  )}
                </div>
              </div>
              {isEmpty ? (
                <p className="text-xs text-muted-foreground">
                  No tasks yet—your next idea will appear here as soon as you
                  create it.
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
                    variant={isActive ? "default" : "secondary"}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={priorityFilter === "ALL" ? "default" : "secondary"}
                onClick={() => setPriorityFilter("ALL")}
              >
                Any priority
              </Button>
              {(["HIGH", "MEDIUM", "LOW"] as const).map((priority) => (
                <Button
                  key={priority}
                  type="button"
                  size="sm"
                  variant={priorityFilter === priority ? "default" : "secondary"}
                  onClick={() => setPriorityFilter(priority)}
                >
                  {priorityLabels[priority]}
                </Button>
              ))}
            </div>
          </div>
          <div className="w-full max-w-sm">
            <TaskTagSelector
              value={tagFilters}
              onChange={handleTagFiltersChange}
              availableTags={availableTags}
              placeholder="Filter by tags"
              emptyHint="Choose one or more tags to scope the board."
              ariaLabel="Filter board by tag"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="board-task-search">
              Search board tasks
            </label>
            <Input
              id="board-task-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title or description"
              className="h-9 w-64"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  Due: {dueWindowLabels[dueWindow]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {dueWindows.map((dw) => (
                  <DropdownMenuItem
                    key={dw}
                    onSelect={() => {
                      setDueWindow(dw);
                      setCustomDueRange(null);
                    }}
                  >
                    {dueWindowLabels[dw]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />{" "}
                  {sortOptions.find((option) => option.value === sortBy)?.label}
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
                    {sortBy === option.value ? (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {(tasksQuery.isFetching || boardQuery.isFetching) &&
            !tasksQuery.isLoading ? (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing latest
                changes…
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">
            Showing {visibleTaskCount} of {totalTasks} tasks
            {statusFilter !== "ALL"
              ? ` in ${statusLabels[statusFilter]} status`
              : ""}
            {tagFilters.length > 0
              ? ` with tags: ${tagFilters.join(", ")}`
              : ""}
            .
          </p>
          {isFilteredEmpty ? (
            <Alert className="mt-3">
              <AlertTitle>No tasks match these filters</AlertTitle>
              <AlertDescription>
                Try widening your filters or reset to see all tasks.
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setPriorityFilter("ALL");
                    setDueWindow("ALL");
                    setCustomDueRange(null);
                    setSearchQuery("");
                    setTagFilters([]);
                    clearBoardFiltersFromStorage();
                    router.replace(pathname, { scroll: false });
                  }}
                >
                  Reset filters
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {!isManualSort ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Sorted by{" "}
              {sortOptions.find((option) => option.value === sortBy)?.label ??
                "selected order"}
              . Cards are placed automatically after you move them. Switch to
              Board order to reorder cards yourself.
            </p>
          ) : null}
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
                onClick={() => void refetchBoardAndTasks()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {boardQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load board</AlertTitle>
            <AlertDescription>
              {boardQuery.error.message}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-3"
                onClick={() => void refetchBoardAndTasks()}
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
            <h3 className="mt-6 text-xl font-semibold text-foreground">
              No tasks yet
            </h3>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Your workspace is ready. Start by creating a task to see it appear
              in the live kanban preview.
            </p>
            <Button
              type="button"
              data-task-dialog="create"
              className="mt-6 gap-2"
            >
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
                  isManualSort
                    ? "Focus a task drag handle, then press space or enter to pick it up. Use arrow keys to move between columns. Press space or enter again to drop."
                    : "Focus a task drag handle, then press space or enter to pick it up. Use arrow keys to move to another status column. Press space or enter again to move the task.",
              },
              announcements: {
                onDragStart: ({ active }) => {
                  const task = renderedTaskMap.get(active.id as string);
                  const status = findStatusForTask(active.id as string);
                  if (!task || !status) {
                    return "Task picked up.";
                  }
                  return isManualSort
                    ? `Picked up ${task.title}. ${statusLabels[status]} lane. ${buildPositionAnnouncement(
                        task.id,
                        status,
                      )}`
                    : `Picked up ${task.title} from ${statusLabels[status]} lane. Move to another lane to change its status.`;
                },
                onDragOver: ({ active, over }) => {
                  if (!over) {
                    return "Dragging task.";
                  }
                  const status = findStatusForTask(over.id as string);
                  if (!status) {
                    return "Dragging task.";
                  }
                  const task = renderedTaskMap.get(active.id as string);
                  if (isManualSort) {
                    return task
                      ? `Moving ${task.title} over ${statusLabels[status]} lane.`
                      : `Moving over ${statusLabels[status]} lane.`;
                  }
                  return task
                    ? `Moving ${task.title} to ${statusLabels[status]} lane.`
                    : `Moving to ${statusLabels[status]} lane.`;
                },
                onDragEnd: ({ active, over }) => {
                  if (!over) {
                    return "Task dropped.";
                  }
                  const task = renderedTaskMap.get(active.id as string);
                  const status = findStatusForTask(over.id as string);
                  if (!task || !status) {
                    return "Task dropped.";
                  }
                  return isManualSort
                    ? `Dropped ${task.title} in ${statusLabels[status]} lane.`
                    : dragSnapshotRef.current &&
                        findTaskStatusInOrder(
                          dragSnapshotRef.current,
                          active.id as string,
                        ) === status
                      ? `${task.title} remains in ${statusLabels[status]} status.`
                      : `Moved ${task.title} to ${statusLabels[status]} status.`;
                },
                onDragCancel: () => "Task movement cancelled.",
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
                  dragActive={dragActive && canDragTasks}
                  activeId={activeId}
                  editableTaskIds={editableTaskIds}
                  draggableTaskIds={draggableTaskIds}
                  preciseDropPreview={isManualSort}
                  statusDropTarget={overColumnStatus === column.status}
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
        Tracking {totalTasks} {totalTasks === 1 ? "task" : "tasks"} across your
        workspace.
      </footer>
    </div>
  );
}
