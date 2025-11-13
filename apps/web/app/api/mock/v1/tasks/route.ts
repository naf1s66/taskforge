import { NextResponse } from 'next/server';

const MOCK_TASKS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Design onboarding walkthrough',
    description: 'Outline the main checkpoints new teammates should complete during week one.',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['product', 'ux'],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Polish task board micro-interactions',
    description: 'Review draggable affordances and add focus-visible outlines.',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['frontend'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: 'QA regression sweep',
    description: 'Run through key flows before release candidate is cut.',
    status: 'DONE',
    priority: 'LOW',
    dueDate: null,
    tags: ['qa'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function GET() {
  return NextResponse.json({
    items: MOCK_TASKS,
    page: 1,
    pageSize: MOCK_TASKS.length,
    total: MOCK_TASKS.length,
  });
}
