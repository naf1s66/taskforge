'use client';

import { useCallback, useMemo, useState } from 'react';

import { TaskListView } from '@/components/tasks/task-list-view';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type DialogState =
  | { type: 'create' }
  | {
      type: 'edit';
      taskId: string;
    }
  | null;

export function TaskListContent() {
  const [dialogState, setDialogState] = useState<DialogState>(null);

  const handleCreateTask = useCallback(() => {
    setDialogState({ type: 'create' });
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    setDialogState({ type: 'edit', taskId });
  }, []);

  const dismissDialog = useCallback(() => {
    setDialogState(null);
  }, []);

  const dialogCopy = useMemo(() => {
    if (!dialogState) {
      return null;
    }

    if (dialogState.type === 'create') {
      return {
        title: 'Create task dialog coming soon',
        description:
          'We are still putting the finishing touches on task creation. In the meantime, you can reach out to your admin to add new work items.',
      };
    }

    return {
      title: 'Edit task dialog coming soon',
      description: `Editing details for task ${dialogState.taskId} will be available shortly. For urgent updates, contact your project lead.`,
    };
  }, [dialogState]);

  return (
    <div className="space-y-6">
      <TaskListView onCreateTask={handleCreateTask} onEditTask={handleEditTask} />
      {dialogCopy ? (
        <Alert>
          <AlertTitle>{dialogCopy.title}</AlertTitle>
          <AlertDescription>{dialogCopy.description}</AlertDescription>
          <div className="mt-4">
            <Button type="button" onClick={dismissDialog} variant="secondary">
              Close
            </Button>
          </div>
        </Alert>
      ) : null}
    </div>
  );
}

export default TaskListContent;
