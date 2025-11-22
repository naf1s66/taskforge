'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { sanitizeTags } from '@/lib/task-tags';
import { useCreateTask, toTaskOperationError } from '@/lib/tasks-hooks';
import type { TaskRecordDTO } from '@/lib/tasks-client';

import {
  TaskFormFields,
  TASK_FORM_DEFAULT_VALUES,
  taskFormSchema,
  type TaskFormValues,
  applyTaskIssuesToForm,
} from './task-form';

interface TaskCreateDialogProps {
  trigger?: ReactNode | null;
  availableTags?: string[];
  onCreated?: (task: TaskRecordDTO) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TaskCreateDialog({ trigger, availableTags = [], onCreated, open, onOpenChange }: TaskCreateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === 'boolean';
  const dialogOpen = isControlled ? Boolean(open) : internalOpen;
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: TASK_FORM_DEFAULT_VALUES,
  });

  const createTask = useCreateTask({
    onSuccess: (task) => {
      toast({
        title: 'Task created',
        description: `“${task.title}” was added to your workspace.`,
      });
      form.reset(TASK_FORM_DEFAULT_VALUES);
      handleOpenChange(false);
      onCreated?.(task);
    },
    onError: (error) => {
      const friendly = toTaskOperationError(error);
      if (friendly?.issues) {
        applyTaskIssuesToForm(form, friendly.issues);
      }

      toast({
        title: 'Unable to create task',
        description: friendly?.message ?? 'Something went wrong while creating the task.',
        variant: 'destructive',
      });
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      form.reset(TASK_FORM_DEFAULT_VALUES);
      createTask.reset();
    }

    onOpenChange?.(nextOpen);
  }

  function handleSubmit(values: TaskFormValues) {
    createTask.mutate({
      title: values.title.trim(),
      description: values.description?.trim() ? values.description.trim() : undefined,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate,
      tags: sanitizeTags(values.tags),
    });
  }

  const dialogTrigger = useMemo(() => {
    if (trigger === undefined) {
      return (
        <Button type="button">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          New task
        </Button>
      );
    }

    return trigger;
  }, [trigger]);

  const hasRequestError = Boolean(createTask.error);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {dialogTrigger ? <DialogTrigger asChild>{dialogTrigger}</DialogTrigger> : null}
      <DialogContent aria-describedby="create-task-description">
        <DialogHeader>
          <DialogTitle>Create a task</DialogTitle>
          <DialogDescription id="create-task-description">
            Provide the task details below. Title, status, priority, and due date must pass validation before submission.
          </DialogDescription>
        </DialogHeader>
        {hasRequestError && createTask.error ? (
          <Alert variant="destructive">
            <AlertDescription>{createTask.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate aria-busy={createTask.isPending}>
            <TaskFormFields form={form} availableTags={availableTags} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={createTask.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating…
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" aria-hidden /> Create task
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
