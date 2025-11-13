import { Suspense } from 'react';

import { TaskListView } from '@/components/tasks/task-list-view';

export const metadata = {
  title: 'Tasks',
};

function TaskListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 rounded-md bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-10">
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskListView />
      </Suspense>
    </div>
  );
}
