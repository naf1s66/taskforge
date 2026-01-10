'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PenSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { sanitizeTags } from '@/lib/task-tags';
import { useTaskFromCache, useTaskReplacementId, useUpdateTask, toTaskOperationError } from '@/lib/tasks-hooks';

import {
  TaskFormFields,
  TASK_FORM_DEFAULT_VALUES,
  taskFormSchema,
  taskRecordToFormValues,
  type TaskFormValues,
  applyTaskIssuesToForm,
} from './task-form';

interface TaskEditDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onTaskIdChange?: (taskId: string) => void;
  availableTags?: string[];
}

export function TaskEditDialog({ taskId, open, onOpenChange, onTaskIdChange, availableTags = [] }: TaskEditDialogProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: TASK_FORM_DEFAULT_VALUES,
  });
  const task = useTaskFromCache(open ? taskId ?? undefined : undefined);
  const [optimisticSnapshot, setOptimisticSnapshot] = useState<typeof task>(null);
  const replacementId = useTaskReplacementId(optimisticSnapshot);
  const missingNotifiedRef = useRef<string | null>(null);
  const { toast } = useToast();

  const updateTask = useUpdateTask({
    onSuccess: (result) => {
      toast({
        title: 'Task updated',
        description: `“${result.title}” was saved successfully.`,
      });
      handleDialogOpenChange(false);
    },
    onError: (error) => {
      const friendly = toTaskOperationError(error);
      if (friendly?.issues) {
        applyTaskIssuesToForm(form, friendly.issues);
      }

      if (friendly?.status === 404) {
        toast({
          title: 'Task no longer exists',
          description: 'This task was deleted or is no longer available.',
          variant: 'destructive',
        });
        handleDialogOpenChange(false);
        return;
      }

      toast({
        title: 'Unable to update task',
        description: friendly?.message ?? 'Something went wrong while saving the task.',
        variant: 'destructive',
      });
    },
  });

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        form.reset(TASK_FORM_DEFAULT_VALUES);
        updateTask.reset();
      }

      onOpenChange?.(nextOpen);
    },
    [form, onOpenChange, updateTask],
  );

  useEffect(() => {
    if (!open) {
      missingNotifiedRef.current = null;
      return;
    }

    const isOptimisticId = Boolean(taskId?.startsWith('optimistic-'));
    if (isOptimisticId) {
      return;
    }

    if (taskId && !task && missingNotifiedRef.current !== taskId) {
      missingNotifiedRef.current = taskId;
      toast({
        title: 'Task unavailable',
        description: 'The selected task could not be loaded. It may have been deleted elsewhere.',
        variant: 'destructive',
      });
      handleDialogOpenChange(false);
    }
  }, [open, taskId, task, toast, handleDialogOpenChange]);

  useEffect(() => {
    if (!task) {
      return;
    }

    form.reset(taskRecordToFormValues(task), { keepDirty: true, keepDirtyValues: true });
  }, [task, form]);

  useEffect(() => {
    if (task?._optimistic) {
      setOptimisticSnapshot(task);
    }
  }, [task]);

  useEffect(() => {
    if (!replacementId || !taskId?.startsWith('optimistic-')) {
      return;
    }

    onTaskIdChange?.(replacementId);
  }, [replacementId, taskId, onTaskIdChange]);

  const hasRequestError = Boolean(updateTask.error);
  const isOptimistic = Boolean(task?._optimistic);

  function handleSubmit(values: TaskFormValues) {
    if (!taskId || isOptimistic) {
      return;
    }

    updateTask.mutate({
      id: taskId,
      input: {
        title: values.title.trim(),
        description: values.description?.trim() ? values.description.trim() : undefined,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate,
        tags: sanitizeTags(values.tags),
      },
    });
  }
  const lastUpdatedLabel = useMemo(() => {
    if (!task) {
      return null;
    }

    const timestamp = task.updatedAt ?? task.createdAt;
    if (!timestamp) {
      return null;
    }

    try {
      const formatted = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(timestamp));
      return formatted;
    } catch {
      return null;
    }
  }, [task]);

  const dialogDescription = task
    ? `Edit the details for “${task.title}”. Title, description, status, priority, due date, and tags can be updated.`
    : 'Edit the selected task.';

  return (
    <Dialog open={open && Boolean(taskId)} onOpenChange={handleDialogOpenChange}>
      <DialogContent aria-describedby="edit-task-description">
        <DialogHeader>
          <DialogTitle>{task ? `Edit ${task.title}` : 'Edit task'}</DialogTitle>
          <DialogDescription id="edit-task-description">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        {lastUpdatedLabel ? (
          <p className="text-xs text-muted-foreground">Last updated {lastUpdatedLabel}</p>
        ) : null}
        {hasRequestError && updateTask.error ? (
          <Alert variant="destructive">
            <AlertDescription>{updateTask.error.message}</AlertDescription>
          </Alert>
        ) : null}
        {isOptimistic ? (
          <Alert>
            <AlertDescription>
              This task is still syncing from a recent create action. Please wait for it to finish before saving edits.
            </AlertDescription>
          </Alert>
        ) : null}
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate aria-busy={updateTask.isPending}>
            <TaskFormFields form={form} availableTags={availableTags} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={updateTask.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTask.isPending || !task || isOptimistic}>
                {updateTask.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…
                  </>
                ) : (
                  <>
                    <PenSquare className="mr-2 h-4 w-4" aria-hidden /> Save changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
