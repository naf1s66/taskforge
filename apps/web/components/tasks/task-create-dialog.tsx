'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TaskDueDatePicker } from '@/components/tasks/task-due-date-picker';
import { TaskTagSelector } from '@/components/tasks/task-tag-selector';
import { useToast } from '@/components/ui/use-toast';
import { sanitizeTags } from '@/lib/task-tags';
import { TASK_PRIORITY_FORM_OPTIONS, TASK_STATUS_FORM_OPTIONS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/lib/task-copy';
import { useCreateTask, toTaskOperationError } from '@/lib/tasks-hooks';
import type { TaskRecordDTO } from '@/lib/tasks-client';

const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters long'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or fewer')
    .transform((value) => value.trim())
    .optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
});

type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

const DEFAULT_VALUES: CreateTaskFormValues = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: undefined,
  tags: [],
};

interface TaskCreateDialogProps {
  trigger?: ReactNode;
  availableTags?: string[];
  onCreated?: (task: TaskRecordDTO) => void;
}

export function TaskCreateDialog({ trigger, availableTags = [], onCreated }: TaskCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const createTask = useCreateTask({
    onSuccess: (task) => {
      toast({
        title: 'Task created',
        description: `“${task.title}” was added to your workspace.`,
      });
      form.reset(DEFAULT_VALUES);
      setOpen(false);
      onCreated?.(task);
    },
    onError: (error) => {
      const friendly = toTaskOperationError(error);
      if (friendly?.issues) {
        applyIssuesToForm(friendly.issues);
      }

      toast({
        title: 'Unable to create task',
        description: friendly?.message ?? 'Something went wrong while creating the task.',
        variant: 'destructive',
      });
    },
  });

  function applyIssuesToForm(issues: z.ZodIssue[]) {
    const mapped = new Map<string, string>();
    for (const issue of issues) {
      const path = issue.path.at(0);
      if (typeof path === 'string' && !mapped.has(path)) {
        mapped.set(path, issue.message);
      }
    }

    mapped.forEach((message, field) => {
      if (field in DEFAULT_VALUES) {
        form.setError(field as keyof CreateTaskFormValues, { message });
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      form.reset(DEFAULT_VALUES);
      createTask.reset();
    }
  }

  function handleSubmit(values: CreateTaskFormValues) {
    createTask.mutate({
      title: values.title.trim(),
      description: values.description?.trim() ? values.description.trim() : undefined,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate,
      tags: sanitizeTags(values.tags),
    });
  }

  const dialogTrigger = useMemo(
    () =>
      trigger ?? (
        <Button type="button">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          New task
        </Button>
      ),
    [trigger],
  );

  const hasRequestError = Boolean(createTask.error);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
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
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Plan launch campaign" autoComplete="off" {...field} />
                  </FormControl>
                  <FormDescription>Required. Use a clear, action-oriented title.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Outline the context, goals, or acceptance criteria" {...field} />
                  </FormControl>
                  <FormDescription>Optional. Keep it under 2000 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-label="Select task status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_STATUS_FORM_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>Default is {TASK_STATUS_LABELS.TODO}.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-label="Select task priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_PRIORITY_FORM_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>Default is {TASK_PRIORITY_LABELS.MEDIUM}.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <TaskDueDatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>Optional. Leave blank to keep the task unscheduled.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TaskTagSelector
                      value={field.value}
                      onChange={field.onChange}
                      availableTags={availableTags}
                      placeholder="Add tags"
                      emptyHint="Tags are optional. Use them to group related work."
                    />
                  </FormControl>
                  <FormDescription>Optional. Tags help with filtering and reporting.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
