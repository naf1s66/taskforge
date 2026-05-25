import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TaskBoardResponse } from '@/lib/tasks-client';
import type { TaskListItem } from '@/lib/tasks-hooks';

import { DashboardContent } from './dashboard-content';

const routerReplace = vi.fn();
const toast = vi.fn();
const moveTaskMutateAsync = vi.fn();
const updateEmailPreferenceMutate = vi.fn();
const searchParams = new URLSearchParams();
let emailPreferenceQueryState = {
  data: {
    dailyDigestEnabled: false,
    dailyDigestTimezone: 'UTC',
  },
  isLoading: false,
  isError: false,
};
let updateEmailPreferenceMutationState = {
  isPending: false,
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ replace: routerReplace }),
  useSearchParams: () => searchParams,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    article: ({ children }: { children?: ReactNode }) => <article>{children}</article>,
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('@/components/ui/toast', () => ({
  ToastAction: ({
    children,
    altText: _altText,
    ...props
  }: {
    children?: ReactNode;
    altText?: string;
    onClick?: () => void;
  }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('@/components/tasks/task-tag-selector', () => ({
  TaskTagSelector: ({ ariaLabel }: { ariaLabel?: string }) => (
    <div aria-label={ariaLabel ?? 'Filter board by tag'} />
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children?: ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
}));

function createDragEvent(activeId: string, overId?: string | null) {
  return {
    active: { id: activeId },
    over: overId ? { id: overId } : null,
  };
}

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...sensors) => sensors),
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
  DndContext: ({
    children,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  }: {
    children?: ReactNode;
    onDragStart?: (event: ReturnType<typeof createDragEvent>) => void;
    onDragOver?: (event: ReturnType<typeof createDragEvent>) => void;
    onDragEnd?: (event: ReturnType<typeof createDragEvent>) => void;
    onDragCancel?: () => void;
  }) => (
    <div>
      {children}
      <button type="button" onClick={() => onDragStart?.(createDragEvent('todo-a'))}>
        test drag start todo a
      </button>
      <button type="button" onClick={() => onDragOver?.(createDragEvent('todo-a', 'todo-c'))}>
        test drag over todo c
      </button>
      <button type="button" onClick={() => onDragEnd?.(createDragEvent('todo-a', 'todo-c'))}>
        test drag end todo c
      </button>
      <button type="button" onClick={() => onDragOver?.(createDragEvent('todo-a', 'column-IN_PROGRESS'))}>
        test drag over in progress
      </button>
      <button type="button" onClick={() => onDragEnd?.(createDragEvent('todo-a', 'column-IN_PROGRESS'))}>
        test drag end in progress
      </button>
      <button type="button" onClick={() => onDragCancel?.()}>
        test drag cancel
      </button>
    </div>
  ),
  DragOverlay: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (items: string[], from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  },
  SortableContext: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: { toString: () => undefined },
    Translate: { toString: () => undefined },
  },
}));

const tasks: TaskListItem[] = [
  {
    id: 'todo-a',
    title: 'Todo A',
    description: 'First todo',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: '2026-05-16T00:00:00.000Z',
    tags: ['api'],
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z',
  },
  {
    id: 'todo-b',
    title: 'Todo B',
    description: 'Second todo',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '2026-05-17T00:00:00.000Z',
    tags: ['web'],
    createdAt: '2026-05-11T00:00:00.000Z',
    updatedAt: '2026-05-11T00:00:00.000Z',
  },
  {
    id: 'todo-c',
    title: 'Todo C',
    description: 'Third todo',
    status: 'TODO',
    priority: 'LOW',
    dueDate: '2026-05-18T00:00:00.000Z',
    tags: ['qa'],
    createdAt: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T00:00:00.000Z',
  },
  {
    id: 'doing-a',
    title: 'Doing A',
    description: 'Already started',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2026-05-19T00:00:00.000Z',
    tags: ['api'],
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
  },
];

const board: TaskBoardResponse = {
  columns: [
    {
      status: 'TODO',
      title: 'To Do',
      order: 1,
      tasks: tasks
        .filter((task) => task.status === 'TODO')
        .map((task, position) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          position,
          dueDate: task.dueDate,
          tags: task.tags,
          updatedAt: task.updatedAt,
        })),
      total: 3,
      overdueCount: 0,
      tags: [],
    },
    {
      status: 'IN_PROGRESS',
      title: 'In Progress',
      order: 2,
      tasks: [
        {
          id: 'doing-a',
          title: 'Doing A',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          position: 0,
          dueDate: '2026-05-19T00:00:00.000Z',
          tags: ['api'],
          updatedAt: '2026-05-13T00:00:00.000Z',
        },
      ],
      total: 1,
      overdueCount: 0,
      tags: [],
    },
    {
      status: 'DONE',
      title: 'Done',
      order: 3,
      tasks: [],
      total: 0,
      overdueCount: 0,
      tags: [],
    },
  ],
  summary: {
    totalsByStatus: {
      TODO: 3,
      IN_PROGRESS: 1,
      DONE: 0,
    },
    overdueByStatus: {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    },
    totalTasks: 4,
    totalOverdue: 0,
  },
  updatedAt: '2026-05-13T00:00:00.000Z',
  generatedAt: '2026-05-13T00:00:00.000Z',
};

const filteredInProgressBoard: TaskBoardResponse = {
  ...board,
  columns: board.columns.map((column) =>
    column.status === 'IN_PROGRESS'
      ? column
      : {
          ...column,
          tasks: [],
          total: 0,
          overdueCount: 0,
          tags: [],
        },
  ),
  summary: {
    totalsByStatus: {
      TODO: 0,
      IN_PROGRESS: 1,
      DONE: 0,
    },
    overdueByStatus: {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    },
    totalTasks: 1,
    totalOverdue: 0,
  },
};

vi.mock('@/lib/tasks-hooks', () => ({
  useTasksQuery: (filters?: { status?: TaskListItem['status'] }) => {
    const visibleTasks = filters?.status
      ? tasks.filter((task) => task.status === filters.status)
      : tasks;

    return {
      data: {
        items: visibleTasks,
        page: 1,
        pageSize: 50,
        total: visibleTasks.length,
      },
      tasks: visibleTasks,
      isLoading: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      refetch: vi.fn(),
      queryKey: ['tasks', 'user-1', 'list', filters ?? {}],
      error: null,
      rawError: null,
    };
  },
  useTaskBoardQuery: (filters?: { status?: TaskListItem['status'] }) => {
    const data =
      filters?.status === 'IN_PROGRESS' ? filteredInProgressBoard : board;

    return {
      data,
      isLoading: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      refetch: vi.fn(),
      queryKey: ['tasks', 'user-1', 'board', filters ?? {}],
      error: null,
      rawError: null,
    };
  },
  useTagsQuery: () => ({
    data: { items: [] },
    tags: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    isSuccess: true,
    status: 'success',
    fetchStatus: 'idle',
    refetch: vi.fn(),
    queryKey: ['tasks', 'user-1', 'tags'],
    error: null,
    rawError: null,
  }),
  useMoveTaskOnBoard: () => ({
    mutateAsync: moveTaskMutateAsync,
    mutate: vi.fn(),
    reset: vi.fn(),
    status: 'idle',
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    variables: undefined,
    error: null,
    rawError: null,
  }),
}));

vi.mock('@/lib/email-preferences-hooks', () => ({
  useEmailPreferenceQuery: () => emailPreferenceQueryState,
  useUpdateEmailPreferenceMutation: () => ({
    mutate: updateEmailPreferenceMutate,
    ...updateEmailPreferenceMutationState,
  }),
}));

function renderDashboard() {
  return render(
    <DashboardContent
      user={{
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
      }}
    />,
  );
}

async function switchToRecentSort(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Recently updated' }));
}

function expectBefore(first: string, second: string, container: HTMLElement = document.body) {
  const queries = within(container);
  const firstNode = queries.getByText(first);
  const secondNode = queries.getByText(second);
  expect(firstNode.compareDocumentPosition(secondNode)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('DashboardContent board drag behavior', () => {
  beforeEach(() => {
    routerReplace.mockClear();
    toast.mockClear();
    moveTaskMutateAsync.mockReset();
    moveTaskMutateAsync.mockResolvedValue(board);
    updateEmailPreferenceMutate.mockReset();
    emailPreferenceQueryState = {
      data: {
        dailyDigestEnabled: false,
        dailyDigestTimezone: 'UTC',
      },
      isLoading: false,
      isError: false,
    };
    updateEmailPreferenceMutationState = {
      isPending: false,
    };
    window.localStorage.clear();
  });

  it('submits manual same-lane reorders with the visible target index', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'test drag start todo a' }));
    await user.click(screen.getByRole('button', { name: 'test drag over todo c' }));
    await user.click(screen.getByRole('button', { name: 'test drag end todo c' }));

    await waitFor(() => expect(moveTaskMutateAsync).toHaveBeenCalledTimes(1));
    expect(moveTaskMutateAsync).toHaveBeenCalledWith({
      taskId: 'todo-a',
      targetStatus: 'TODO',
      targetIndex: 2,
    });
  });

  it('keeps workspace totals sourced from the unfiltered board while filters are active', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'In Progress' }));

    await waitFor(() => expect(screen.queryByText('Todo A')).not.toBeInTheDocument());
    expect(screen.getByText('Doing A')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'Tracking 4 tasks across your workspace.',
    );
  });

  it('does not submit same-lane moves while a derived sort is active', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await switchToRecentSort(user);
    await user.click(screen.getByRole('button', { name: 'test drag start todo a' }));
    await user.click(screen.getByRole('button', { name: 'test drag over todo c' }));
    await user.click(screen.getByRole('button', { name: 'test drag end todo c' }));

    expect(moveTaskMutateAsync).not.toHaveBeenCalled();
  });

  it('allows sorted cross-lane status moves with a deterministic end-of-lane target index', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await switchToRecentSort(user);
    await user.click(screen.getByRole('button', { name: 'test drag start todo a' }));
    await user.click(screen.getByRole('button', { name: 'test drag over in progress' }));
    await user.click(screen.getByRole('button', { name: 'test drag end in progress' }));

    await waitFor(() => expect(moveTaskMutateAsync).toHaveBeenCalledTimes(1));
    expect(moveTaskMutateAsync).toHaveBeenCalledWith({
      taskId: 'todo-a',
      targetStatus: 'IN_PROGRESS',
      targetIndex: 1,
    });
  });

  it('rolls back optimistic manual reorders when the board move mutation fails', async () => {
    const user = userEvent.setup();
    moveTaskMutateAsync.mockRejectedValue(new Error('move failed'));
    renderDashboard();

    const todoLane = screen.getByRole('region', { name: 'To do drop zone' });
    expect(within(todoLane).getByText('Todo A')).toBeInTheDocument();
    expectBefore('Todo A', 'Todo B', todoLane);

    await user.click(screen.getByRole('button', { name: 'test drag start todo a' }));
    await user.click(screen.getByRole('button', { name: 'test drag over todo c' }));

    await waitFor(() => expectBefore('Todo C', 'Todo A', todoLane));

    await user.click(screen.getByRole('button', { name: 'test drag end todo c' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'Unable to move task',
    })));
    await waitFor(() => expectBefore('Todo A', 'Todo B', todoLane));
    expectBefore('Todo B', 'Todo C', todoLane);
  });

  it('shows disabled digest state and submits an enable mutation', async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(screen.getByText(/Status:\s*Disabled/)).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Turn daily digest emails on' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    expect(updateEmailPreferenceMutate).toHaveBeenCalledWith(true);
  });

  it('shows enabled digest state and submits a disable mutation', async () => {
    const user = userEvent.setup();
    emailPreferenceQueryState = {
      data: {
        dailyDigestEnabled: true,
        dailyDigestTimezone: 'UTC',
      },
      isLoading: false,
      isError: false,
    };

    renderDashboard();

    expect(screen.getByText(/Status:\s*Enabled/)).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Turn daily digest emails off' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);

    expect(updateEmailPreferenceMutate).toHaveBeenCalledWith(false);
  });
});
