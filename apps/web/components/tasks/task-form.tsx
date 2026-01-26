'use client';

import { useMemo } from 'react';
import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TaskDueDatePicker } from '@/components/tasks/task-due-date-picker';
import { TaskTagSelector } from '@/components/tasks/task-tag-selector';
import { TASK_PRIORITY_FORM_OPTIONS, TASK_PRIORITY_LABELS, TASK_STATUS_FORM_OPTIONS, TASK_STATUS_LABELS } from '@/lib/task-copy';
import type { TaskRecordDTO } from '@/lib/tasks-client';
import { sanitizeTags } from '@/lib/task-tags';

export const taskFormSchema = z.object({
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

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const TASK_FORM_DEFAULT_VALUES: TaskFormValues = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: undefined,
  tags: [],
};

export function taskRecordToFormValues(task?: TaskRecordDTO | null): TaskFormValues {
  if (!task) {
    return TASK_FORM_DEFAULT_VALUES;
  }

  return {
    title: task.title ?? '',
    description: task.description ?? '',
    status: task.status ?? 'TODO',
    priority: task.priority ?? 'MEDIUM',
    dueDate: task.dueDate ?? undefined,
    tags: sanitizeTags(task.tags ?? []),
  } satisfies TaskFormValues;
}

export function applyTaskIssuesToForm(
  form: UseFormReturn<TaskFormValues>,
  issues: z.ZodIssue[],
): void {
  const mapped = new Map<string, string>();
  for (const issue of issues) {
    const path = issue.path.at(0);
    if (typeof path === 'string' && !mapped.has(path)) {
      mapped.set(path, issue.message);
    }
  }

  mapped.forEach((message, field) => {
    if (field in TASK_FORM_DEFAULT_VALUES) {
      form.setError(field as keyof TaskFormValues, { message });
    }
  });
}

interface TaskFormFieldsProps {
  form: UseFormReturn<TaskFormValues>;
  availableTags?: string[];
}

export function TaskFormFields({ form, availableTags = [] }: TaskFormFieldsProps) {
  const sanitizedTags = useMemo(() => sanitizeTags(availableTags), [availableTags]);

  return (
    <>
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
                availableTags={sanitizedTags}
                placeholder="Add tags"
                emptyHint="Tags are optional. Use them to group related work."
              />
            </FormControl>
            <FormDescription>Optional. Tags help with filtering and reporting.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
