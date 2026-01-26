import { Suspense } from 'react';

import { TasksHooksDemo } from '@/components/tasks/hooks-demo';

export const metadata = {
  title: 'Task Hooks Demo',
};

export default function TasksHooksDemoPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-10">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Preparing task data…</p>}>
        <TasksHooksDemo />
      </Suspense>
    </div>
  );
}
