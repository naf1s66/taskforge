'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/ui/use-toast';
import { sanitizeTags } from '@/lib/task-tags';
import { useTagsQuery } from '@/lib/tasks-hooks';

import { TaskCreateDialog } from './task-create-dialog';
import { TaskEditDialog } from './task-edit-dialog';

type ActiveDialog = { type: 'create' } | { type: 'edit'; taskId: string } | null;

export function TaskDialogHost() {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const { toast } = useToast();
  const tagsQuery = useTagsQuery();
  const availableTags = sanitizeTags(tagsQuery.tags.map((tag) => tag.label));

  const handleDocumentClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-task-dialog]') : null;
      if (!target) {
        return;
      }

      const dialogType = target.getAttribute('data-task-dialog');
      if (dialogType === 'create') {
        setActiveDialog({ type: 'create' });
        return;
      }

      if (dialogType === 'edit') {
        const taskId = target.getAttribute('data-task-id');
        if (!taskId) {
          toast({
            title: 'Unable to edit task',
            description: 'The selected task does not have an id to edit.',
            variant: 'destructive',
          });
          return;
        }

        setActiveDialog({ type: 'edit', taskId });
      }
    },
    [toast],
  );

  useEffect(() => {
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [handleDocumentClick]);

  const handleCreateOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveDialog((current) => (current?.type === 'create' ? null : current));
    }
  }, []);

  const handleEditOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveDialog((current) => (current?.type === 'edit' ? null : current));
    }
  }, []);

  const handleEditTaskIdChange = useCallback((nextTaskId: string) => {
    setActiveDialog((current) => (current?.type === 'edit' ? { type: 'edit', taskId: nextTaskId } : current));
  }, []);

  const activeTaskId = activeDialog?.type === 'edit' ? activeDialog.taskId : null;

  return (
    <>
      <TaskCreateDialog
        open={activeDialog?.type === 'create'}
        onOpenChange={handleCreateOpenChange}
        trigger={null}
        availableTags={availableTags}
      />
      <TaskEditDialog
        taskId={activeTaskId}
        open={activeDialog?.type === 'edit'}
        onOpenChange={handleEditOpenChange}
        onTaskIdChange={handleEditTaskIdChange}
        availableTags={availableTags}
      />
    </>
  );
}
