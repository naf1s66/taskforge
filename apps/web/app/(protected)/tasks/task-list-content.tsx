'use client';

import { useCallback } from 'react';

import { TaskListView } from '@/components/tasks/task-list-view';

export function TaskListContent() {
  const handleCreateTask = useCallback(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.info('Open the create task dialog (placeholder)');
    }
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info('Open the edit task dialog (placeholder)', taskId);
    }
  }, []);

  return (
    <TaskListView onCreateTask={handleCreateTask} onEditTask={handleEditTask} />
  );
}

export default TaskListContent;
