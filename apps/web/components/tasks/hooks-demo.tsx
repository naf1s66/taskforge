'use client';

import { useMemo, useState } from 'react';
import type { TaskStatus } from '@taskforge/shared';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useCreateTask,
  useDeleteTask,
  useTasksQuery,
  useUpdateTask,
} from '@/lib/tasks-hooks';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

const statusFilters: Array<{ value?: TaskStatus; label: string }> = [
  { value: undefined, label: 'All' },
  { value: 'TODO', label: STATUS_LABELS.TODO },
  { value: 'IN_PROGRESS', label: STATUS_LABELS.IN_PROGRESS },
  { value: 'DONE', label: STATUS_LABELS.DONE },
];

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
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const filters = useMemo(
    () => ({
      status: selectedStatus,
      q: searchTerm.trim() || undefined,
    }),
    [selectedStatus, searchTerm],
  );

  const tasksQuery = useTasksQuery(filters);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const hasMutationError = createTask.error ?? updateTask.error ?? deleteTask.error;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Hooks Demo</CardTitle>
          <CardDescription>
            Interact with the React Query hooks to verify caching, filters, and optimistic updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((option) => {
              const isActive = option.value === selectedStatus;
              return (
                <Button
                  key={option.label}
                  variant={isActive ? 'default' : 'secondary'}
                  onClick={() => setSelectedStatus(option.value)}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title or description"
              className="sm:max-w-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => tasksQuery.refetch()} disabled={tasksQuery.isFetching}>
                Refresh
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
            </div>
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
        <CardContent className="space-y-4">
          {tasksQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          ) : null}

          {!tasksQuery.isLoading && tasksQuery.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks match the current filters.</p>
          ) : null}

          <ul className="space-y-3">
            {tasksQuery.tasks.map((task) => (
              <li key={task.id} className="rounded-xl border border-border/60 bg-card/60 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold">
                      {task.title}{' '}
                      {task._optimistic ? <span className="text-xs uppercase text-amber-400">(pending)</span> : null}
                    </p>
                    {task.description ? (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Status: {STATUS_LABELS[task.status]} · Due: {formatDate(task.dueDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={updateTask.isPending}
                      onClick={() =>
                        updateTask.mutate({
                          id: task.id,
                          input: { status: task.status === 'DONE' ? 'TODO' : 'DONE' },
                        })
                      }
                    >
                      {task.status === 'DONE' ? 'Reopen' : 'Complete'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={deleteTask.isPending}
                      onClick={() => deleteTask.mutate({ id: task.id })}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
