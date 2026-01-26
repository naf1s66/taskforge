'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TaskPriority, TaskStatus } from '@taskforge/shared';
import { CalendarDays, Filter, Inbox, Plus, RefreshCcw, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { DateRange } from 'react-day-picker';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { TaskCreateDialog } from '@/components/tasks/task-create-dialog';
import { TaskTagSelector } from '@/components/tasks/task-tag-selector';
import { trackEvent } from '@/lib/analytics';
import {
  useCreateTask,
  useDeleteTask,
  useTasksQuery,
  useUpdateTask,
  type TaskListItem,
} from '@/lib/tasks-hooks';
import type { TaskRecordDTO } from '@/lib/tasks-client';
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
} from '@/lib/task-copy';
import { sanitizeTags } from '@/lib/task-tags';

const FILTER_STORAGE_KEY = 'taskforge.tasksDemo.filters';

interface TaskFilterState {
  status?: TaskStatus;
  priority?: TaskPriority;
  tags: string[];
  search: string;
  dueFrom?: string;
  dueTo?: string;
  dueFromDay?: string;
  dueToDay?: string;
}

const DEFAULT_FILTER_STATE: TaskFilterState = {
  status: undefined,
  priority: undefined,
  tags: [],
  search: '',
  dueFrom: undefined,
  dueTo: undefined,
  dueFromDay: undefined,
  dueToDay: undefined,
};

function isCanonicalBoundary(value: string | null | undefined): value is string {
  return Boolean(normalizeDateInstant(value));
}

function deriveDateKeyFromCanonicalBoundary(value: string | null | undefined): string | undefined {
  const normalized = normalizeDateInstant(value);
  if (!normalized) {
    return undefined;
  }

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  const parsed = new Date(timestamp);
  return formatDateKey(new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function createDefaultFilters(): TaskFilterState {
  return { ...DEFAULT_FILTER_STATE, tags: [] };
}

function isTaskStatus(value: string | null): value is TaskStatus {
  return value === 'TODO' || value === 'IN_PROGRESS' || value === 'DONE';
}

function isTaskPriority(value: string | null): value is TaskPriority {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH';
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return undefined;
  }

  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1;
  const day = Number.parseInt(dayStr, 10);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31
  ) {
    return undefined;
  }

  const canonical = new Date(Date.UTC(year, month, day));
  if (
    Number.isNaN(canonical.getTime()) ||
    canonical.getUTCFullYear() !== year ||
    canonical.getUTCMonth() !== month ||
    canonical.getUTCDate() !== day
  ) {
    return undefined;
  }

  return trimmed;
}

function toDateFromKey(key?: string): Date | undefined {
  if (!key) {
    return undefined;
  }

  const normalized = normalizeDateKey(key);
  if (!normalized) {
    return undefined;
  }

  const [yearStr, monthStr, dayStr] = normalized.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1;
  const day = Number.parseInt(dayStr, 10);

  return new Date(year, month, day);
}

function toUserTimezoneBoundaryIsoFromDate(date: Date, boundary: 'start' | 'end'): string {
  const local = new Date(date);
  if (boundary === 'start') {
    local.setHours(0, 0, 0, 0);
  } else {
    local.setHours(23, 59, 59, 999);
  }

  return local.toISOString();
}

function toUserTimezoneBoundaryIsoFromKey(key?: string, boundary?: 'start' | 'end'): string | undefined {
  if (!key || !boundary) {
    return undefined;
  }

  const date = toDateFromKey(key);
  if (!date) {
    return undefined;
  }

  return toUserTimezoneBoundaryIsoFromDate(date, boundary);
}

function normalizeDateInstant(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

function parseFiltersFromSearchParams(
  params: ReadonlyURLSearchParams | URLSearchParams | null,
): Partial<TaskFilterState> | null {
  if (!params) {
    return null;
  }

  const status = params.get('status');
  const priority = params.get('priority');
  const dueFromParam = params.get('dueFrom');
  const dueToParam = params.get('dueTo');
  const dueFromDay = normalizeDateKey(params.get('dueFromDay')) ?? deriveDateKeyFromCanonicalBoundary(dueFromParam);
  const dueToDay = normalizeDateKey(params.get('dueToDay')) ?? deriveDateKeyFromCanonicalBoundary(dueToParam);
  const dueFrom = dueFromDay
    ? toUserTimezoneBoundaryIsoFromKey(dueFromDay, 'start')
    : normalizeDateInstant(dueFromParam);
  const dueTo = dueToDay
    ? toUserTimezoneBoundaryIsoFromKey(dueToDay, 'end')
    : normalizeDateInstant(dueToParam);
  const search = params.get('q');
  const tags = params.getAll('tag');

  const next: Partial<TaskFilterState> = {};

  if (isTaskStatus(status)) {
    next.status = status;
  }

  if (isTaskPriority(priority)) {
    next.priority = priority;
  }

  if (dueFromDay) {
    next.dueFromDay = dueFromDay;
  }

  if (dueToDay) {
    next.dueToDay = dueToDay;
  }

  if (dueFrom) {
    next.dueFrom = dueFrom;
  }

  if (dueTo) {
    next.dueTo = dueTo;
  }

  if (search?.trim()) {
    next.search = search.trim();
  }

  if (tags.length > 0) {
    next.tags = sanitizeTags(tags);
  }

  return Object.keys(next).length > 0 ? next : null;
}

function readFiltersFromStorage(): Partial<TaskFilterState> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<TaskFilterState> | null;
    if (!parsed) {
      return null;
    }

    const next: Partial<TaskFilterState> = {};

    if (isTaskStatus(typeof parsed.status === 'string' ? parsed.status : null)) {
      next.status = parsed.status;
    }

    if (isTaskPriority(typeof parsed.priority === 'string' ? parsed.priority : null)) {
      next.priority = parsed.priority;
    }

    if (Array.isArray(parsed.tags)) {
      next.tags = sanitizeTags(parsed.tags);
    }

    if (typeof parsed.search === 'string' && parsed.search.trim()) {
      next.search = parsed.search.trim();
    }

    const dueFromDay =
      normalizeDateKey(typeof parsed.dueFromDay === 'string' ? parsed.dueFromDay : null) ??
      deriveDateKeyFromCanonicalBoundary(typeof parsed.dueFrom === 'string' ? parsed.dueFrom : null);
    if (dueFromDay) {
      next.dueFromDay = dueFromDay;
    }

    const dueToDay =
      normalizeDateKey(typeof parsed.dueToDay === 'string' ? parsed.dueToDay : null) ??
      deriveDateKeyFromCanonicalBoundary(typeof parsed.dueTo === 'string' ? parsed.dueTo : null);
    if (dueToDay) {
      next.dueToDay = dueToDay;
    }

    const dueFrom = dueFromDay
      ? toUserTimezoneBoundaryIsoFromKey(dueFromDay, 'start')
      : normalizeDateInstant(typeof parsed.dueFrom === 'string' ? parsed.dueFrom : null);
    if (dueFrom) {
      next.dueFrom = dueFrom;
    }

    const dueTo = dueToDay
      ? toUserTimezoneBoundaryIsoFromKey(dueToDay, 'end')
      : normalizeDateInstant(typeof parsed.dueTo === 'string' ? parsed.dueTo : null);
    if (dueTo) {
      next.dueTo = dueTo;
    }

    return next;
  } catch {
    return null;
  }
}

function writeFiltersToStorage(filters: TaskFilterState) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        status: filters.status,
        priority: filters.priority,
        tags: filters.tags,
        search: filters.search,
        dueFrom: filters.dueFrom,
        dueTo: filters.dueTo,
        dueFromDay: filters.dueFromDay,
        dueToDay: filters.dueToDay,
      }),
    );
  } catch {
    // ignore storage errors (e.g., Safari private mode)
  }
}

function areFiltersEqual(a: TaskFilterState, b: TaskFilterState): boolean {
  if (a.status !== b.status) {
    return false;
  }
  if (a.priority !== b.priority) {
    return false;
  }
  if (a.search !== b.search) {
    return false;
  }
  if (a.dueFrom !== b.dueFrom) {
    return false;
  }
  if (a.dueTo !== b.dueTo) {
    return false;
  }
  if (a.dueFromDay !== b.dueFromDay) {
    return false;
  }
  if (a.dueToDay !== b.dueToDay) {
    return false;
  }
  if (a.tags.length !== b.tags.length) {
    return false;
  }
  for (let index = 0; index < a.tags.length; index += 1) {
    if (a.tags[index] !== b.tags[index]) {
      return false;
    }
  }
  return true;
}

function toTaskQueryFilters(filters: TaskFilterState) {
  return {
    status: filters.status,
    priority: filters.priority,
    tag: filters.tags.length > 0 ? filters.tags : undefined,
    q: filters.search.trim() ? filters.search.trim() : undefined,
    dueFrom: filters.dueFrom,
    dueTo: filters.dueTo,
  } as const;
}

function hasActiveFilters(filters: TaskFilterState): boolean {
  return (
    Boolean(filters.status) ||
    Boolean(filters.priority) ||
    filters.tags.length > 0 ||
    Boolean(filters.search.trim()) ||
    Boolean(filters.dueFrom) ||
    Boolean(filters.dueTo)
  );
}

function toLocalDayFromStoredIso(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeDateInstant(value);
  if (!normalized) {
    return undefined;
  }

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  const parsed = new Date(timestamp);
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

function toDateRange(filters: TaskFilterState): DateRange | undefined {
  if (!filters.dueFrom && !filters.dueTo) {
    return undefined;
  }

  const fromDate = toDateFromKey(filters.dueFromDay) ?? toLocalDayFromStoredIso(filters.dueFrom);
  const toDate = toDateFromKey(filters.dueToDay) ?? toLocalDayFromStoredIso(filters.dueTo);

  if (!fromDate && !toDate) {
    return undefined;
  }

  if (!toDate && fromDate) {
    return { from: fromDate, to: fromDate };
  }

  if (!fromDate && toDate) {
    return { from: toDate, to: toDate };
  }

  return { from: fromDate ?? undefined, to: toDate ?? undefined };
}

function startOfDayIso(date: Date): string {
  const local = new Date(date);
  local.setHours(0, 0, 0, 0);
  return local.toISOString();
}

function endOfDayIso(date: Date): string {
  const local = new Date(date);
  local.setHours(23, 59, 59, 999);
  return local.toISOString();
}

function formatDateRange(range?: DateRange): string {
  if (!range?.from && !range?.to) {
    return 'Select range';
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (range.from && range.to) {
    const sameDay = range.from.toDateString() === range.to.toDateString();
    return sameDay
      ? formatter.format(range.from)
      : `${formatter.format(range.from)} – ${formatter.format(range.to)}`;
  }

  if (range.from) {
    return formatter.format(range.from);
  }

  if (range.to) {
    return formatter.format(range.to);
  }

  return 'Select range';
}

interface DueRangePickerProps {
  value: TaskFilterState;
  onChange: (range: DateRange | undefined) => void;
}

function DueRangePicker({ value, onChange }: DueRangePickerProps) {
  const range = toDateRange(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between" type="button">
          <span className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4" aria-hidden />
            {range ? formatDateRange(range) : 'Filter by due date'}
          </span>
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          defaultMonth={range?.from ?? range?.to ?? undefined}
          numberOfMonths={2}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function formatDate(value?: string): string {
  if (!value) {
    return 'No due date';
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function TasksHooksDemo() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);

  const initialUrlFilters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams]);
  const hasUrlFiltersRef = useRef(initialUrlFilters !== null);
  const [shouldLoadUnfilteredTasks, setShouldLoadUnfilteredTasks] = useState(
    hasUrlFiltersRef.current,
  );
  const [hasHydratedFilters, setHasHydratedFilters] = useState(hasUrlFiltersRef.current);

  const initialFilters = useMemo(
    () => ({ ...createDefaultFilters(), ...(initialUrlFilters ?? {}) }),
    [initialUrlFilters],
  );

  const [filters, setFilters] = useState<TaskFilterState>(initialFilters);
  const lastQueryRef = useRef(searchParams?.toString() ?? '');
  const lastReportedFilters = useRef<TaskFilterState>(filters);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || hasHydratedFilters) {
      return;
    }

    const fromStorage = readFiltersFromStorage();
    if (fromStorage) {
      const nextFilters = { ...createDefaultFilters(), ...fromStorage };
      if (hasActiveFilters(nextFilters)) {
        hasUrlFiltersRef.current = true;
        setShouldLoadUnfilteredTasks(true);
      }

      setFilters((previous) => (areFiltersEqual(previous, nextFilters) ? previous : nextFilters));
    }

    setHasHydratedFilters(true);
  }, [isMounted, hasHydratedFilters]);

  useEffect(() => {
    const currentQuery = searchParams?.toString() ?? '';
    if (currentQuery === lastQueryRef.current) {
      return;
    }

    lastQueryRef.current = currentQuery;
    const fromUrl = parseFiltersFromSearchParams(searchParams);
    const nextFilters = fromUrl ? { ...createDefaultFilters(), ...fromUrl } : createDefaultFilters();
    setFilters((previous) => (areFiltersEqual(previous, nextFilters) ? previous : nextFilters));
  }, [searchParams]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    writeFiltersToStorage(filters);

    const current = new URLSearchParams(searchParams?.toString());
    const keysToClear = ['status', 'priority', 'q', 'dueFrom', 'dueTo', 'dueFromDay', 'dueToDay', 'tag'];
    for (const key of keysToClear) {
      current.delete(key);
    }

    if (filters.status) {
      current.set('status', filters.status);
    }

    if (filters.priority) {
      current.set('priority', filters.priority);
    }

    if (filters.search.trim()) {
      current.set('q', filters.search.trim());
    }

    if (filters.dueFrom) {
      current.set('dueFrom', filters.dueFrom);
    }

    if (filters.dueTo) {
      current.set('dueTo', filters.dueTo);
    }

    if (filters.dueFromDay) {
      current.set('dueFromDay', filters.dueFromDay);
    }

    if (filters.dueToDay) {
      current.set('dueToDay', filters.dueToDay);
    }

    for (const tag of filters.tags) {
      current.append('tag', tag);
    }

    const nextQuery = current.toString();
    const currentQuery = searchParams?.toString() ?? '';
    if (nextQuery === currentQuery) {
      return;
    }

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const nextUrlWithHash = hash ? `${nextUrl}${hash}` : nextUrl;
    lastQueryRef.current = nextQuery;
    router.replace(nextUrlWithHash, { scroll: false });
  }, [filters, pathname, router, searchParams, isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    if (areFiltersEqual(lastReportedFilters.current, filters)) {
      return;
    }

    lastReportedFilters.current = filters;
    trackEvent('tasks.filters.changed', {
      status: filters.status ?? null,
      priority: filters.priority ?? null,
      tags: filters.tags,
      search: filters.search.trim() || null,
      dueFrom: filters.dueFrom ?? null,
      dueTo: filters.dueTo ?? null,
    });
  }, [filters, isMounted]);

  const queryFilters = useMemo(() => toTaskQueryFilters(filters), [filters]);

  const tasksQuery = useTasksQuery(queryFilters, {
    placeholderData: (previous) => previous,
    enabled: hasHydratedFilters,
  });
  const isFiltered = hasActiveFilters(filters);

  const unfilteredTasksQuery = useTasksQuery(undefined, {
    placeholderData: (previous) => previous,
    enabled: hasHydratedFilters && shouldLoadUnfilteredTasks && isFiltered,
  });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const hasMutationError = createTask.error ?? updateTask.error ?? deleteTask.error;
  const [availableTags, setAvailableTags] = useState<string[]>(() => sanitizeTags(filters.tags));

  const mergeAvailableTags = useCallback((items: TaskListItem[] | undefined) => {
    if (!items || items.length === 0) {
      return;
    }

    const collected: string[] = [];
    for (const task of items) {
      collected.push(...task.tags);
    }

    if (collected.length === 0) {
      return;
    }

    setAvailableTags((previous) => {
      const next = sanitizeTags([...previous, ...collected]);
      if (next.length === previous.length && next.every((tag, index) => tag === previous[index])) {
        return previous;
      }
      return next;
    });
  }, []);

  const handleDialogTaskCreated = useCallback(
    (task: TaskRecordDTO) => {
      mergeAvailableTags([{ ...task } as TaskListItem]);
    },
    [mergeAvailableTags],
  );

  useEffect(() => {
    mergeAvailableTags(tasksQuery.data?.items);
  }, [mergeAvailableTags, tasksQuery.data?.items]);

  useEffect(() => {
    mergeAvailableTags(unfilteredTasksQuery.data?.items);
  }, [mergeAvailableTags, unfilteredTasksQuery.data?.items]);

  useEffect(() => {
    if (shouldLoadUnfilteredTasks) {
      return;
    }

    if (hasActiveFilters(filters)) {
      setShouldLoadUnfilteredTasks(true);
    }
  }, [filters, shouldLoadUnfilteredTasks]);

  function handleResetFilters() {
    setFilters(createDefaultFilters());
    trackEvent('tasks.filters.cleared');
  }

  function handleDueRangeChange(range: DateRange | undefined) {
    if (!range || (!range.from && !range.to)) {
      setFilters((previous) => ({
        ...previous,
        dueFrom: undefined,
        dueTo: undefined,
        dueFromDay: undefined,
        dueToDay: undefined,
      }));
      return;
    }

    setFilters((previous) => ({
      ...previous,
      dueFrom: range.from ? startOfDayIso(range.from) : undefined,
      dueTo: range.to ? endOfDayIso(range.to) : range.from ? endOfDayIso(range.from) : undefined,
      dueFromDay: range.from ? formatDateKey(range.from) : undefined,
      dueToDay: range.to ? formatDateKey(range.to) : range.from ? formatDateKey(range.from) : undefined,
    }));
  }

  const isEmpty =
    hasHydratedFilters && !tasksQuery.isLoading && !tasksQuery.isError && tasksQuery.tasks.length === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Hooks Demo</CardTitle>
          <CardDescription>
            Interact with the React Query hooks to verify caching, filters, and optimistic updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-status-filter">Status</Label>
              <Select
                value={filters.status ?? 'all'}
                onValueChange={(value) =>
                  setFilters((previous) => ({
                    ...previous,
                    status: value === 'all' ? undefined : (value as TaskStatus),
                  }))
                }
              >
                <SelectTrigger id="task-status-filter" aria-label="Filter tasks by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.label} value={option.value ?? 'all'}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority-filter">Priority</Label>
              <Select
                value={filters.priority ?? 'all'}
                onValueChange={(value) =>
                  setFilters((previous) => ({
                    ...previous,
                    priority: value === 'all' ? undefined : (value as TaskPriority),
                  }))
                }
              >
                <SelectTrigger id="task-priority-filter" aria-label="Filter tasks by priority">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.label} value={option.value ?? 'all'}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="task-search"
                  value={filters.search}
                  placeholder="Search by title or description"
                  className="pl-9"
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      search: event.target.value,
                    }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">Search updates as you type.</p>
            </div>
            <div className="space-y-2">
              <Label>Due range</Label>
              <DueRangePicker value={filters} onChange={handleDueRangeChange} />
              <p className="text-xs text-muted-foreground">Select a single day or a range to filter due dates.</p>
            </div>
            <div className="md:col-span-2">
              <Label>Tags</Label>
              <TaskTagSelector
                value={filters.tags}
                onChange={(next) => setFilters((previous) => ({ ...previous, tags: next }))}
                availableTags={availableTags}
                placeholder="Filter by tag"
                emptyHint="Select one or more tags to narrow the list."
                ariaLabel="Filter tasks by tag"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => tasksQuery.refetch()} disabled={tasksQuery.isFetching}>
              <RefreshCcw className="h-4 w-4" aria-hidden />
              Refresh
            </Button>
            <Button onClick={handleResetFilters} variant="secondary" disabled={!isFiltered}>
              Clear filters
            </Button>
            <Button
              onClick={() =>
                createTask.mutate({
                  title: `Demo task ${new Date().toLocaleTimeString()}`,
                  description: 'Created from the hooks showcase.',
                  status: 'TODO',
                  priority: 'MEDIUM',
                })
              }
              disabled={createTask.isPending}
            >
              Add demo task
            </Button>
            <TaskCreateDialog
              availableTags={availableTags}
              onCreated={handleDialogTaskCreated}
              trigger={
                <Button type="button">
                  <Plus className="mr-2 h-4 w-4" aria-hidden /> New task
                </Button>
              }
            />
          </div>
          {tasksQuery.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load tasks</AlertTitle>
              <AlertDescription>{tasksQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}
          {hasMutationError ? (
            <Alert variant="destructive">
              <AlertTitle>Task mutation failed</AlertTitle>
              <AlertDescription>{hasMutationError.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Showing {tasksQuery.tasks.length} of {tasksQuery.data?.total ?? 0} tasks. Use the controls above to filter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {tasksQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          ) : null}

          {isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-10 text-center">
              {isFiltered ? <Filter className="h-10 w-10 text-muted-foreground" aria-hidden /> : <Inbox className="h-10 w-10 text-muted-foreground" aria-hidden />}
              <div className="space-y-1">
                <p className="text-base font-semibold">
                  {isFiltered ? 'No tasks match these filters' : 'You have not created any tasks yet'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isFiltered
                    ? 'Try adjusting or clearing the filters to see more results.'
                    : 'Create a task to populate your workspace. It will appear here immediately.'}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {isFiltered ? (
                  <Button variant="secondary" onClick={handleResetFilters}>
                    Clear filters
                  </Button>
                ) : null}
                <Button
                  onClick={() =>
                    createTask.mutate({
                      title: `Demo task ${new Date().toLocaleTimeString()}`,
                      description: 'Created from the hooks showcase.',
                      status: 'TODO',
                      priority: 'MEDIUM',
                    })
                  }
                  disabled={createTask.isPending}
                >
                  Add your first task
                </Button>
              </div>
            </div>
          ) : null}

          <ul className="space-y-3">
            {tasksQuery.tasks.map((task) => (
              <TaskListRow
                key={task.id}
                task={task}
                onToggle={() =>
                  updateTask.mutate({
                    id: task.id,
                    input: { status: task.status === 'DONE' ? 'TODO' : 'DONE' },
                  })
                }
                onDelete={() => deleteTask.mutate({ id: task.id })}
                isUpdating={updateTask.isPending}
                isDeleting={deleteTask.isPending}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

interface TaskListRowProps {
  task: TaskListItem;
  onToggle: () => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

function TaskListRow({ task, onToggle, onDelete, isUpdating, isDeleting }: TaskListRowProps) {
  return (
    <li className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-base font-semibold">
            {task.title}{' '}
            {task._optimistic ? <span className="text-xs uppercase text-amber-400">(pending)</span> : null}
          </p>
          {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Status: {TASK_STATUS_LABELS[task.status]}</span>
            <span>Priority: {TASK_PRIORITY_LABELS[task.priority]}</span>
            <span>Due: {formatDate(task.dueDate)}</span>
          </div>
          {task.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="muted" className="uppercase">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={isUpdating} onClick={onToggle}>
            {task.status === 'DONE' ? 'Reopen' : 'Complete'}
          </Button>
          <Button variant="outline" disabled={isDeleting} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}
