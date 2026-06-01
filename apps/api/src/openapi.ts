import type { OpenAPIV3 } from 'openapi-types';

import { TAG_LABEL_MAX_LENGTH } from '@taskforge/shared';

import {
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_QUERY_MAX_LENGTH,
  TASK_TAGS_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
} from './schemas/task';

const errorResponse: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    details: {
      description: 'Optional structured validation details',
      type: 'object',
      additionalProperties: true,
      nullable: true,
    },
  },
  required: ['error'],
  example: {
    error: 'Invalid payload',
    details: {
      fieldErrors: {
        email: ['Invalid email address'],
      },
      formErrors: [],
    },
  },
};

const authCredentials: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
  },
  required: ['email', 'password'],
  example: {
    email: 'user@example.com',
    password: 'StrongPassword123',
  },
};

const authRefreshRequest: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string', minLength: 1 },
  },
  required: ['refreshToken'],
  additionalProperties: false,
  example: {
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token',
  },
};

const sessionBridgeRequest: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    userId: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
  },
  required: ['userId'],
  additionalProperties: false,
  example: {
    userId: '26f26639-05ad-40b6-8248-379644dcdf18',
    email: 'user@example.com',
  },
};

const authUser: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'email', 'createdAt'],
  example: {
    id: '26f26639-05ad-40b6-8248-379644dcdf18',
    email: 'user@example.com',
    createdAt: '2024-06-01T12:00:00.000Z',
  },
};

const authTokens: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    tokenType: { type: 'string', enum: ['Bearer'] },
    accessToken: { type: 'string', description: 'Short-lived JWT used for API requests.' },
    refreshToken: { type: 'string', description: 'Long-lived JWT used to request new access tokens.' },
    accessTokenExpiresAt: { type: 'string', format: 'date-time' },
    refreshTokenExpiresAt: { type: 'string', format: 'date-time' },
  },
  required: ['tokenType', 'accessToken', 'refreshToken', 'accessTokenExpiresAt', 'refreshTokenExpiresAt'],
  example: {
    tokenType: 'Bearer',
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token',
    accessTokenExpiresAt: '2024-06-01T13:00:00.000Z',
    refreshTokenExpiresAt: '2024-06-08T12:00:00.000Z',
  },
};

const emailPreference: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    dailyDigestEnabled: {
      type: 'boolean',
      description: 'Whether the authenticated user receives daily digest emails.',
    },
    dailyDigestTimezone: {
      type: 'string',
      description: 'IANA timezone used to resolve digest date windows.',
      example: 'UTC',
    },
  },
  required: ['dailyDigestEnabled', 'dailyDigestTimezone'],
  example: {
    dailyDigestEnabled: false,
    dailyDigestTimezone: 'UTC',
  },
};

const emailPreferenceUpdateInput: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    dailyDigestEnabled: {
      type: 'boolean',
      description: 'Enable or disable daily digest emails for the authenticated user.',
    },
  },
  required: ['dailyDigestEnabled'],
  additionalProperties: false,
  example: {
    dailyDigestEnabled: true,
  },
};

const emailPreferenceResponse: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    emailPreference: { $ref: '#/components/schemas/EmailPreference' },
  },
  required: ['emailPreference'],
  example: {
    emailPreference: emailPreference.example as Record<string, unknown>,
  },
};

const authSuccessExample = {
  user: authUser.example as Record<string, unknown>,
  tokens: authTokens.example as Record<string, unknown>,
};

const unauthorizedExample = { value: { error: 'Unauthorized' } } satisfies OpenAPIV3.ExampleObject;

const invalidCredentialsExample = { value: { error: 'Invalid credentials' } } satisfies OpenAPIV3.ExampleObject;

const invalidRefreshTokenExample = { value: { error: 'Invalid refresh token' } } satisfies OpenAPIV3.ExampleObject;

const conflictExample = { value: { error: 'User already exists' } } satisfies OpenAPIV3.ExampleObject;

const invalidPayloadExample = {
  value: errorResponse.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const invalidIdentifierExample = {
  value: { error: 'Invalid identifier' },
} satisfies OpenAPIV3.ExampleObject;

const notFoundExample = { value: { error: 'Not found' } } satisfies OpenAPIV3.ExampleObject;

const logoutSuccessExample = { value: { success: true } } satisfies OpenAPIV3.ExampleObject;

const authMeSuccessExample = {
  value: { user: authUser.example as Record<string, unknown> },
} satisfies OpenAPIV3.ExampleObject;

const accountMeSuccessExample = {
  value: {
    user: authUser.example as Record<string, unknown>,
    emailPreference: emailPreference.example as Record<string, unknown>,
  },
} satisfies OpenAPIV3.ExampleObject;

const authMeAnonymousExample = { value: { user: null } } satisfies OpenAPIV3.ExampleObject;

const emailPreferenceUpdateExample = {
  value: emailPreferenceUpdateInput.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const emailPreferenceResponseExample = {
  value: emailPreferenceResponse.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const authCredentialsExample = {
  value: authCredentials.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const authRefreshRequestExample = {
  value: authRefreshRequest.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const sessionBridgeRequestExample = {
  value: sessionBridgeRequest.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const authSuccessResponseExample = {
  value: authSuccessExample,
} satisfies OpenAPIV3.ExampleObject;

const taskRecord: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    dueDate: { type: 'string', format: 'date-time', nullable: true },
    tags: { type: 'array', items: { type: 'string' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'title', 'status', 'priority', 'tags', 'createdAt', 'updatedAt'],
  example: {
    id: '9e22c508-1383-4609-9bbd-2e09b7a2d108',
    title: 'Draft project brief',
    description: 'Summarize goals and milestones for the release',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2024-07-10T16:00:00.000Z',
    tags: ['planning', 'product'],
    createdAt: '2024-06-01T12:00:00.000Z',
    updatedAt: '2024-06-03T09:30:00.000Z',
  },
};

const taskBoardItem: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    position: { type: 'integer', minimum: 0 },
    dueDate: { type: 'string', format: 'date-time', nullable: true },
    tags: { type: 'array', items: { type: 'string' } },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'title', 'status', 'priority', 'position', 'tags', 'updatedAt'],
  example: {
    id: '9e22c508-1383-4609-9bbd-2e09b7a2d108',
    title: 'Draft project brief',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    position: 0,
    dueDate: '2024-07-10T16:00:00.000Z',
    tags: ['planning', 'product'],
    updatedAt: '2024-06-03T09:30:00.000Z',
  },
};

const tagSummary: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
      minLength: 1,
      maxLength: TAG_LABEL_MAX_LENGTH,
      description: 'Canonical lowercase tag label. Length limit applies after normalization.',
    },
    count: { type: 'integer', minimum: 0 },
  },
  required: ['label', 'count'],
  example: {
    label: 'planning',
    count: 3,
  },
};

const tagRecord: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    label: {
      type: 'string',
      minLength: 1,
      maxLength: TAG_LABEL_MAX_LENGTH,
      description: 'Canonical lowercase tag label. Length limit applies after normalization.',
    },
  },
  required: ['id', 'label'],
  example: {
    id: '8d367c45-8d3c-4e96-a59e-4254920fb828',
    label: 'planning',
  },
};

const tagCreateInput: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
      minLength: 1,
      maxLength: TAG_LABEL_MAX_LENGTH,
      description: 'Tag label to create. Length limit applies after lowercase normalization.',
    },
  },
  required: ['label'],
  additionalProperties: false,
  example: {
    label: 'Planning',
  },
};

const tagListResponse: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { $ref: '#/components/schemas/TagSummary' },
    },
  },
  required: ['items'],
  example: {
    items: [tagSummary.example],
  },
};

const boardColumn: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    title: { type: 'string' },
    order: { type: 'integer', minimum: 1 },
    tasks: {
      type: 'array',
      items: { $ref: '#/components/schemas/TaskBoardItem' },
    },
    total: { type: 'integer', minimum: 0 },
    overdueCount: { type: 'integer', minimum: 0 },
    tags: {
      type: 'array',
      items: { $ref: '#/components/schemas/TagSummary' },
    },
  },
  required: ['status', 'title', 'order', 'tasks', 'total', 'overdueCount', 'tags'],
  example: {
    status: 'IN_PROGRESS',
    title: 'In Progress',
    order: 2,
    tasks: [taskBoardItem.example],
    total: 1,
    overdueCount: 0,
    tags: [tagSummary.example],
  },
};

const boardSummary: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    totalsByStatus: {
      type: 'object',
      properties: {
        TODO: { type: 'integer', minimum: 0 },
        IN_PROGRESS: { type: 'integer', minimum: 0 },
        DONE: { type: 'integer', minimum: 0 },
      },
      required: ['TODO', 'IN_PROGRESS', 'DONE'],
    },
    overdueByStatus: {
      type: 'object',
      properties: {
        TODO: { type: 'integer', minimum: 0 },
        IN_PROGRESS: { type: 'integer', minimum: 0 },
        DONE: { type: 'integer', minimum: 0 },
      },
      required: ['TODO', 'IN_PROGRESS', 'DONE'],
    },
    totalTasks: { type: 'integer', minimum: 0 },
    totalOverdue: { type: 'integer', minimum: 0 },
  },
  required: ['totalsByStatus', 'overdueByStatus', 'totalTasks', 'totalOverdue'],
  example: {
    totalsByStatus: {
      TODO: 3,
      IN_PROGRESS: 2,
      DONE: 5,
    },
    overdueByStatus: {
      TODO: 1,
      IN_PROGRESS: 0,
      DONE: 0,
    },
    totalTasks: 10,
    totalOverdue: 1,
  },
};

const boardResponse: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    columns: {
      type: 'array',
      items: { $ref: '#/components/schemas/BoardColumn' },
    },
    summary: { $ref: '#/components/schemas/BoardSummary' },
    updatedAt: { type: 'string', format: 'date-time' },
    generatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['columns', 'summary', 'updatedAt', 'generatedAt'],
  example: {
    columns: [boardColumn.example as Record<string, unknown>],
    summary: boardSummary.example as Record<string, unknown>,
    updatedAt: '2024-06-03T09:30:00.000Z',
    generatedAt: '2024-06-03T09:30:00.000Z',
  },
};

const boardMoveRequest: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    taskId: { type: 'string', format: 'uuid' },
    targetStatus: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    targetIndex: {
      type: 'integer',
      minimum: 0,
      description: 'Zero-based destination index in the target lane. The repository validates this against the lane length.',
    },
  },
  required: ['taskId', 'targetStatus', 'targetIndex'],
  additionalProperties: false,
  example: {
    taskId: '9e22c508-1383-4609-9bbd-2e09b7a2d108',
    targetStatus: 'DONE',
    targetIndex: 0,
  },
};

const taskCreateInput: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, maxLength: TASK_TITLE_MAX_LENGTH },
    description: { type: 'string', minLength: 1, maxLength: TASK_DESCRIPTION_MAX_LENGTH },
    status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    dueDate: { type: 'string', format: 'date-time' },
    tags: {
      type: 'array',
      maxItems: TASK_TAGS_MAX_LENGTH,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: TAG_LABEL_MAX_LENGTH,
        description: 'Tag label. Length limit applies after lowercase normalization.',
      },
    },
  },
  required: ['title'],
  additionalProperties: false,
  example: {
    title: 'Book product sync',
    description: 'Coordinate roadmap review with stakeholders',
    status: 'TODO',
    priority: 'HIGH',
    tags: ['planning'],
    dueDate: '2024-07-05T15:00:00.000Z',
  },
};

const taskUpdateInput: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, maxLength: TASK_TITLE_MAX_LENGTH },
    description: { type: 'string', minLength: 1, maxLength: TASK_DESCRIPTION_MAX_LENGTH },
    status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    dueDate: { type: 'string', format: 'date-time' },
    tags: {
      type: 'array',
      maxItems: TASK_TAGS_MAX_LENGTH,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: TAG_LABEL_MAX_LENGTH,
        description: 'Tag label. Length limit applies after lowercase normalization.',
      },
    },
  },
  additionalProperties: false,
  example: {
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    dueDate: '2024-07-12T20:00:00.000Z',
    tags: ['planning', 'proposal'],
  },
};

const taskListResponse: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { $ref: '#/components/schemas/TaskRecord' },
    },
    page: { type: 'integer', minimum: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100 },
    total: { type: 'integer', minimum: 0 },
  },
  required: ['items', 'page', 'pageSize', 'total'],
  example: {
    items: [
      taskRecord.example,
      {
        id: '14377d29-0a0f-4b26-8b6d-60406ad3f7c1',
        title: 'Follow up with design partners',
        description: 'Confirm handoff expectations and surface risks early.',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: '2024-07-18T15:00:00.000Z',
        tags: ['customer', 'outreach'],
        createdAt: '2024-06-02T14:22:00.000Z',
        updatedAt: '2024-06-04T11:10:00.000Z',
      },
    ],
    page: 1,
    pageSize: 20,
    total: 2,
  },
};

const taskCreatedExample = {
  value: taskRecord.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const taskUpdatedRecordExample = {
  value: {
    ...(taskRecord.example as Record<string, unknown>),
    status: 'DONE',
    priority: 'MEDIUM',
    tags: ['planning', 'product', 'retro'],
    dueDate: '2024-07-12T20:00:00.000Z',
    updatedAt: '2024-06-05T18:15:00.000Z',
  },
} satisfies OpenAPIV3.ExampleObject;

const taskListExample = {
  value: taskListResponse.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const taskListInvalidFiltersExample = {
  value: {
    error: 'Invalid payload',
    details: {
      fieldErrors: {
        dueFrom: ['dueFrom must be earlier than or equal to dueTo'],
      },
      formErrors: [],
    },
  },
} satisfies OpenAPIV3.ExampleObject;

const taskDeletedResponse: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['deleted'] },
  },
  required: ['id', 'status'],
  example: {
    id: '9e22c508-1383-4609-9bbd-2e09b7a2d108',
    status: 'deleted',
  },
};

const dailyDigestTaskSummary: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    dueDate: { type: 'string', format: 'date-time', nullable: true },
    updatedAt: { type: 'string', format: 'date-time' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'title', 'status', 'priority', 'updatedAt', 'tags'],
  example: {
    id: '4dce5dc0-0f19-4b9c-9c28-31a237a2b617',
    title: 'Review launch checklist',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: '2026-05-21T12:00:00.000Z',
    updatedAt: '2026-05-20T10:30:00.000Z',
    tags: ['launch'],
  },
};

const dailyDigestGroup: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      enum: ['overdue', 'dueToday', 'dueSoon', 'recentlyUpdated', 'blockedByStatus'],
    },
    label: { type: 'string' },
    total: { type: 'integer', minimum: 0 },
    tasks: {
      type: 'array',
      items: { $ref: '#/components/schemas/DailyDigestTaskSummary' },
    },
  },
  required: ['key', 'label', 'total', 'tasks'],
  example: {
    key: 'dueToday',
    label: 'Due today',
    total: 1,
    tasks: [dailyDigestTaskSummary.example as Record<string, unknown>],
  },
};

const dailyDigestPreviewResponse: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    generatedAt: { type: 'string', format: 'date-time' },
    timezone: { type: 'string', example: 'America/New_York' },
    window: {
      type: 'object',
      properties: {
        startOfTodayUtc: { type: 'string', format: 'date-time' },
        startOfTomorrowUtc: { type: 'string', format: 'date-time' },
        dueSoonUntilUtc: { type: 'string', format: 'date-time' },
        recentlyUpdatedSinceUtc: { type: 'string', format: 'date-time' },
      },
      required: ['startOfTodayUtc', 'startOfTomorrowUtc', 'dueSoonUntilUtc', 'recentlyUpdatedSinceUtc'],
    },
    totalTasksConsidered: { type: 'integer', minimum: 0 },
    groups: {
      type: 'array',
      items: { $ref: '#/components/schemas/DailyDigestGroup' },
    },
  },
  required: ['generatedAt', 'timezone', 'window', 'totalTasksConsidered', 'groups'],
  example: {
    generatedAt: '2026-05-20T12:00:00.000Z',
    timezone: 'America/New_York',
    window: {
      startOfTodayUtc: '2026-05-20T04:00:00.000Z',
      startOfTomorrowUtc: '2026-05-21T04:00:00.000Z',
      dueSoonUntilUtc: '2026-05-28T04:00:00.000Z',
      recentlyUpdatedSinceUtc: '2026-05-18T12:00:00.000Z',
    },
    totalTasksConsidered: 1,
    groups: [dailyDigestGroup.example as Record<string, unknown>],
  },
};

const dailyDigestSendRequest: OpenAPIV3.SchemaObject = {
  type: 'object',
  additionalProperties: false,
  properties: {
    digestDate: {
      type: 'string',
      format: 'date',
      description: 'Optional local digest calendar date. Defaults to today in the user digest timezone.',
    },
    digestHourUtc: {
      type: 'integer',
      minimum: 0,
      maximum: 23,
      description: 'Optional UTC hour filter. Users configured for a different hour are skipped.',
    },
    dryRun: {
      description: 'When true, renders and reports the digest without sending email or recording delivery success.',
      oneOf: [
        { type: 'boolean' },
        { type: 'string', enum: ['true', 'false', '1', '0'] },
      ],
      default: false,
    },
  },
  example: {
    digestDate: '2026-05-21',
    digestHourUtc: 13,
    dryRun: true,
  },
};

const dailyDigestJobRunRequest: OpenAPIV3.SchemaObject = {
  type: 'object',
  additionalProperties: false,
  properties: {
    digestDate: {
      type: 'string',
      format: 'date',
      description: 'Optional local digest calendar date. When omitted, the job derives local dates per user.',
    },
    digestHourUtc: {
      type: 'integer',
      minimum: 0,
      maximum: 23,
      description: 'Optional UTC hour filter. Users configured for a different hour are skipped.',
    },
    dryRun: {
      description: 'When true, reports the digest run without sending email or recording delivery success.',
      oneOf: [
        { type: 'boolean' },
        { type: 'string', enum: ['true', 'false', '1', '0'] },
      ],
      default: false,
    },
    sendLimit: {
      type: 'integer',
      minimum: 0,
      maximum: 500,
      description: 'Optional per-run send cap. Defaults to the configured job send limit.',
    },
  },
  example: {
    digestDate: '2026-05-21',
    digestHourUtc: 13,
    dryRun: true,
    sendLimit: 5,
  },
};

const dailyDigestRunResponse: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    digestDate: {
      type: 'string',
      format: 'date',
      nullable: true,
      description: 'Explicit requested digest date, or null when a scheduled run derives local dates per user.',
    },
    digestDates: {
      type: 'array',
      items: { type: 'string', format: 'date' },
      description: 'Local digest dates touched by the run.',
    },
    attempted: { type: 'integer', minimum: 0 },
    sent: { type: 'integer', minimum: 0 },
    skipped: { type: 'integer', minimum: 0 },
    failed: { type: 'integer', minimum: 0 },
    budgetSkipped: { type: 'integer', minimum: 0 },
    providerQuotaSkipped: { type: 'integer', minimum: 0 },
    duplicateSkipped: { type: 'integer', minimum: 0 },
    preferenceSkipped: { type: 'integer', minimum: 0 },
    noContentSkipped: { type: 'integer', minimum: 0 },
  },
  required: [
    'digestDate',
    'digestDates',
    'attempted',
    'sent',
    'skipped',
    'failed',
    'budgetSkipped',
    'providerQuotaSkipped',
    'duplicateSkipped',
    'preferenceSkipped',
    'noContentSkipped',
  ],
  example: {
    digestDate: '2026-05-21',
    digestDates: ['2026-05-21'],
    attempted: 1,
    sent: 1,
    skipped: 0,
    failed: 0,
    budgetSkipped: 0,
    providerQuotaSkipped: 0,
    duplicateSkipped: 0,
    preferenceSkipped: 0,
    noContentSkipped: 0,
  },
};

const taskUpdateExample = {
  value: taskUpdateInput.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const taskDeletedExample = {
  value: taskDeletedResponse.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const tagCreateExample = {
  value: tagCreateInput.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const tagCreatedExample = {
  value: tagRecord.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const tagListResponseExample = {
  value: tagListResponse.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const dailyDigestPreviewExample = {
  value: dailyDigestPreviewResponse.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const dailyDigestSendRequestExample = {
  value: dailyDigestSendRequest.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const dailyDigestJobRunRequestExample = {
  value: dailyDigestJobRunRequest.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const dailyDigestRunExample = {
  value: dailyDigestRunResponse.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const dailyDigestDisabledExample = {
  value: { error: 'Daily digest is disabled for this user.' },
} satisfies OpenAPIV3.ExampleObject;

const digestDeliveryUnavailableExample = {
  value: { error: 'Digest email delivery is not configured.' },
} satisfies OpenAPIV3.ExampleObject;

const rateLimitedExample = {
  value: { error: 'Too many requests, please try again later.' },
} satisfies OpenAPIV3.ExampleObject;

const authRateLimitedExample = {
  value: { error: 'Too many authentication attempts. Please try again later.' },
} satisfies OpenAPIV3.ExampleObject;

const authRateLimitResponse: OpenAPIV3.ResponseObject = {
  description: 'Authentication rate limit exceeded',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
      examples: { rateLimited: authRateLimitedExample },
    },
  },
};

const rateLimitResponse: OpenAPIV3.ResponseObject = {
  description: 'Rate limit exceeded',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
      examples: { rateLimited: rateLimitedExample },
    },
  },
};

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'TaskForge API',
    version: '1.0.0',
    description:
      'Authentication-enabled API for TaskForge. Use the `/auth/login` or `/auth/register` endpoints to obtain a JWT before calling protected routes.',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'tf_session',
        description:
          'HttpOnly session cookie issued by the auth routes. The cookie carries the same JWT used for bearer authentication.',
      },
      sessionBridgeSecret: {
        type: 'apiKey',
        in: 'header',
        name: 'x-session-bridge-secret',
        description:
          'Shared server-side secret used by the web app to exchange a NextAuth session for API JWTs.',
      },
      jobSecretHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-job-secret',
        description: 'Shared secret required by protected background job routes.',
      },
      jobSecretBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'shared-secret',
        description:
          'Alternative protected job authentication using `Authorization: Bearer <DIGEST_JOB_SECRET>`.',
      },
    },
    schemas: {
      AuthCredentials: authCredentials,
      AuthRefreshRequest: authRefreshRequest,
      SessionBridgeRequest: sessionBridgeRequest,
      AuthTokens: authTokens,
      AuthSuccessResponse: {
        type: 'object',
        properties: {
          tokens: { $ref: '#/components/schemas/AuthTokens' },
          user: authUser,
        },
        required: ['tokens', 'user'],
        example: authSuccessExample,
      },
      AuthMeResponse: {
        type: 'object',
        properties: {
          user: {
            allOf: [authUser],
            nullable: true,
            description: 'Authenticated user when available; `null` if unauthenticated.',
          },
          emailPreference: {
            allOf: [{ $ref: '#/components/schemas/EmailPreference' }],
            description: 'Email preferences for the authenticated user. Present on `/api/taskforge/v1/me`.',
          },
        },
        required: ['user'],
        example: authMeSuccessExample.value,
      },
      AuthLogoutResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
        },
        required: ['success'],
        example: logoutSuccessExample.value,
      },
      ErrorResponse: errorResponse,
      TaskRecord: taskRecord,
      TaskBoardItem: taskBoardItem,
      TagSummary: tagSummary,
      TagRecord: tagRecord,
      TagCreateInput: tagCreateInput,
      TagListResponse: tagListResponse,
      BoardColumn: boardColumn,
      BoardSummary: boardSummary,
      BoardResponse: boardResponse,
      BoardMoveRequest: boardMoveRequest,
      TaskCreateInput: taskCreateInput,
      TaskUpdateInput: taskUpdateInput,
      TaskListResponse: taskListResponse,
      TaskDeleteResponse: taskDeletedResponse,
      EmailPreference: emailPreference,
      EmailPreferenceUpdateInput: emailPreferenceUpdateInput,
      EmailPreferenceResponse: emailPreferenceResponse,
      DailyDigestTaskSummary: dailyDigestTaskSummary,
      DailyDigestGroup: dailyDigestGroup,
      DailyDigestPreviewResponse: dailyDigestPreviewResponse,
      DailyDigestSendRequest: dailyDigestSendRequest,
      DailyDigestJobRunRequest: dailyDigestJobRunRequest,
      DailyDigestRunResponse: dailyDigestRunResponse,
    },
  },
  paths: {
    '/api/taskforge/v1/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                  },
                  required: ['ok'],
                },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new credential-based user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthCredentials' },
              examples: {
                default: authCredentialsExample,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' },
                examples: {
                  success: authSuccessResponseExample,
                },
              },
            },
          },
          '400': {
            description: 'Invalid payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidPayload: invalidPayloadExample,
                },
              },
            },
          },
          '409': {
            description: 'Email already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  conflict: conflictExample,
                },
              },
            },
          },
          '429': authRateLimitResponse,
        },
      },
    },
    '/api/taskforge/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate an existing user and receive a JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthCredentials' },
              examples: {
                default: authCredentialsExample,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' },
                examples: {
                  success: authSuccessResponseExample,
                },
              },
            },
          },
          '400': {
            description: 'Invalid payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidPayload: invalidPayloadExample,
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidCredentials: invalidCredentialsExample,
                },
              },
            },
          },
          '429': authRateLimitResponse,
        },
      },
    },
    '/api/taskforge/v1/auth/session-bridge': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange a web session for API JWTs',
        description:
          'Server-to-server endpoint used by the web app after OAuth sign-in. Requires `x-session-bridge-secret` and returns the same auth token envelope as credential login.',
        security: [{ sessionBridgeSecret: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SessionBridgeRequest' },
              examples: {
                default: sessionBridgeRequestExample,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Session exchanged successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' },
                examples: {
                  success: authSuccessResponseExample,
                },
              },
            },
          },
          '400': {
            description: 'Invalid payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidPayload: invalidPayloadExample,
                },
              },
            },
          },
          '401': {
            description: 'Missing or incorrect session bridge secret',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  notFound: { value: { error: 'User not found' } },
                },
              },
            },
          },
          '409': {
            description: 'User email mismatch',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  conflict: { value: { error: 'User email mismatch' } },
                },
              },
            },
          },
          '429': authRateLimitResponse,
        },
      },
    },
    '/api/taskforge/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh API JWTs',
        description: 'Exchanges a valid refresh token for a new auth token pair.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthRefreshRequest' },
              examples: {
                default: authRefreshRequestExample,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token pair refreshed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' },
                examples: {
                  success: authSuccessResponseExample,
                },
              },
            },
          },
          '400': {
            description: 'Invalid payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidPayload: invalidPayloadExample,
                },
              },
            },
          },
          '401': {
            description: 'Invalid refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidRefreshToken: invalidRefreshTokenExample,
                },
              },
            },
          },
          '429': authRateLimitResponse,
        },
      },
    },
    '/api/taskforge/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Invalidate the current JWT token',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logged out',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthLogoutResponse' },
                examples: {
                  success: logoutSuccessExample,
                },
              },
            },
          },
          '401': {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Retrieve the authenticated user',
        description:
          'Requires a valid JWT provided via the `Authorization: Bearer <token>` header or the `tf_session` HttpOnly cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthMeResponse' },
                examples: {
                  authenticated: authMeSuccessExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/me': {
      get: {
        tags: ['Auth'],
        summary: 'Retrieve the authenticated user and account preferences',
        description:
          'Requires a valid JWT provided via the `Authorization: Bearer <token>` header or the `tf_session` HttpOnly cookie. Includes daily digest email preferences for signed-in users.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
          '200': {
            description: 'Current user and email preferences',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthMeResponse' },
                examples: {
                  authenticated: accountMeSuccessExample,
                  unauthenticated: authMeAnonymousExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/me/email-preferences': {
      patch: {
        tags: ['Auth'],
        summary: 'Update email preferences for the authenticated user',
        description:
          'Enables or disables daily digest emails for the signed-in user. Requires a valid JWT provided via the `Authorization: Bearer <token>` header or the `tf_session` HttpOnly cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmailPreferenceUpdateInput' },
              examples: {
                default: emailPreferenceUpdateExample,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email preferences updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmailPreferenceResponse' },
                examples: {
                  default: emailPreferenceResponseExample,
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalid: invalidPayloadExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
        },
      },
    },

    '/api/taskforge/v1/email/digest/preview': {
      get: {
        tags: ['Email'],
        summary: 'Preview digest payload for the authenticated user',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        parameters: [
          {
            name: 'timezone',
            in: 'query',
            schema: { type: 'string', maxLength: 100 },
            description: 'Optional IANA timezone override for previewing date windows.',
          },
          {
            name: 'dueSoonDays',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 30 },
          },
          {
            name: 'recentlyUpdatedDays',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 30 },
          },
          {
            name: 'maxTasksPerGroup',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50 },
          },
        ],
        responses: {
          '200': {
            description: 'Digest preview payload returned.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyDigestPreviewResponse' },
                examples: { default: dailyDigestPreviewExample },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters or digest timezone preference',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { invalidPayload: invalidPayloadExample },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, examples: { unauthorized: unauthorizedExample } } },
          },
          '429': {
            description: 'Digest endpoint rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { rateLimited: rateLimitedExample },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/email/digest/send': {
      post: {
        tags: ['Email'],
        summary: 'Send or dry-run digest delivery for the authenticated user',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DailyDigestSendRequest' },
              examples: { default: dailyDigestSendRequestExample },
            },
          },
        },
        responses: {
          '200': {
            description: 'Digest run completed.',
            headers: {
              'x-taskforge-idempotency-key': {
                description: 'Logical delivery idempotency key used to deduplicate the authenticated user and digest date.',
                schema: { type: 'string', example: 'digest:2026-05-21:4cbb6f43-6c94-4f76-a36a-8f9f45770b8f' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyDigestRunResponse' },
                examples: { default: dailyDigestRunExample },
              },
            },
          },
          '400': {
            description: 'Invalid payload or digest timezone preference',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { invalidPayload: invalidPayloadExample },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, examples: { unauthorized: unauthorizedExample } } },
          },
          '409': {
            description: 'Digest preference disabled',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { disabled: dailyDigestDisabledExample },
              },
            },
          },
          '429': {
            description: 'Digest endpoint rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { rateLimited: rateLimitedExample },
              },
            },
          },
          '503': {
            description: 'Digest delivery is not configured for real sends',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { unavailable: digestDeliveryUnavailableExample },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/jobs/digest': {
      get: {
        tags: ['Jobs'],
        summary: 'Run the protected daily digest job',
        description:
          'Protected scheduler endpoint. Requires `DIGEST_JOB_SECRET` via `Authorization: Bearer <secret>` or `x-job-secret`; missing or incorrect secrets are throttled separately from valid scheduler invocations.',
        security: [{ jobSecretBearer: [] }, { jobSecretHeader: [] }],
        parameters: [
          {
            name: 'digestDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Optional local digest calendar date.',
          },
          {
            name: 'digestHourUtc',
            in: 'query',
            schema: { type: 'integer', minimum: 0, maximum: 23 },
            description: 'Optional UTC hour filter.',
          },
          {
            name: 'dryRun',
            in: 'query',
            schema: { type: 'string', enum: ['true', 'false', '1', '0'] },
            description: 'When true or 1, reports the run without sending email.',
          },
          {
            name: 'sendLimit',
            in: 'query',
            schema: { type: 'integer', minimum: 0, maximum: 500 },
            description: 'Optional per-run send cap.',
          },
        ],
        responses: {
          '200': {
            description: 'Digest job run completed.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyDigestRunResponse' },
                examples: { default: dailyDigestRunExample },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { invalidPayload: invalidPayloadExample },
              },
            },
          },
          '401': {
            description: 'Missing or incorrect job secret',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { unauthorized: unauthorizedExample },
              },
            },
          },
          '429': rateLimitResponse,
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Run the protected daily digest job',
        description:
          'Protected scheduler endpoint. Requires `DIGEST_JOB_SECRET` via `Authorization: Bearer <secret>` or `x-job-secret`; missing or incorrect secrets are throttled separately from valid scheduler invocations.',
        security: [{ jobSecretBearer: [] }, { jobSecretHeader: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DailyDigestJobRunRequest' },
              examples: { default: dailyDigestJobRunRequestExample },
            },
          },
        },
        responses: {
          '200': {
            description: 'Digest job run completed.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyDigestRunResponse' },
                examples: { default: dailyDigestRunExample },
              },
            },
          },
          '400': {
            description: 'Invalid payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { invalidPayload: invalidPayloadExample },
              },
            },
          },
          '401': {
            description: 'Missing or incorrect job secret',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: { unauthorized: unauthorizedExample },
              },
            },
          },
          '429': rateLimitResponse,
        },
      },
    },
    '/api/taskforge/v1/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks for the authenticated user',
        description:
          'Returns a paginated collection of the signed-in user\'s tasks. Requires a valid JWT via `Authorization` header or the `tf_session` cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number (1-indexed).',
          },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of tasks per page.',
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
            description: 'Filter tasks by workflow status.',
          },
          {
            name: 'priority',
            in: 'query',
            schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            description: 'Filter tasks by priority.',
          },
          {
            name: 'tag',
            in: 'query',
            style: 'form',
            explode: true,
            schema: {
              type: 'array',
              maxItems: TASK_TAGS_MAX_LENGTH,
              items: { type: 'string', minLength: 1, maxLength: TAG_LABEL_MAX_LENGTH },
            },
            description:
              'Filter tasks that include the specified tag(s). Repeat the parameter to require multiple tags.',
          },
          {
            name: 'q',
            in: 'query',
            schema: { type: 'string', minLength: 1, maxLength: TASK_QUERY_MAX_LENGTH },
            description: 'Case-insensitive search over the title and description.',
          },
          {
            name: 'dueFrom',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Only return tasks due on or after this ISO timestamp.',
          },
          {
            name: 'dueTo',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Only return tasks due on or before this ISO timestamp.',
          },
        ],
        responses: {
          '200': {
            description: 'Task collection',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaskListResponse' },
                examples: {
                  default: taskListExample,
                },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidFilters: taskListInvalidFiltersExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        description:
          'Creates a new task owned by the authenticated user. Requires a valid JWT via `Authorization` header or the `tf_session` cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaskCreateInput' },
              examples: {
                default: { value: taskCreateInput.example as Record<string, unknown> },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Task created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaskRecord' },
                examples: {
                  default: taskCreatedExample,
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalid: invalidPayloadExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/tasks/board': {
      get: {
        tags: ['Tasks'],
        summary: 'Retrieve the Kanban board read model',
        description:
          'Returns a board-friendly representation of tasks grouped by status lanes. Repeating `tag` requires tasks to include every selected tag. Requires a valid JWT via `Authorization` header or the `tf_session` cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
            description: 'Filter board tasks by workflow status.',
          },
          {
            name: 'priority',
            in: 'query',
            schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            description: 'Filter board tasks by priority.',
          },
          {
            name: 'tag',
            in: 'query',
            style: 'form',
            explode: true,
            schema: {
              type: 'array',
              maxItems: TASK_TAGS_MAX_LENGTH,
              items: { type: 'string', minLength: 1, maxLength: TAG_LABEL_MAX_LENGTH },
            },
            description: 'Filter board tasks that include the specified tag(s). Repeat the parameter to require multiple tags.',
          },
          {
            name: 'q',
            in: 'query',
            schema: { type: 'string', minLength: 1, maxLength: TASK_QUERY_MAX_LENGTH },
            description: 'Case-insensitive search over the title and description.',
          },
          {
            name: 'dueFrom',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Only return board tasks due on or after this ISO timestamp.',
          },
          {
            name: 'dueTo',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Only return board tasks due on or before this ISO timestamp.',
          },
        ],
        responses: {
          '200': {
            description: 'Task board',
            headers: {
              ETag: {
                description: 'Entity tag representing the latest board update timestamp.',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BoardResponse' },
                examples: {
                  default: { value: boardResponse.example as Record<string, unknown> },
                },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidFilters: taskListInvalidFiltersExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/tasks/board/move': {
      patch: {
        tags: ['Tasks'],
        summary: 'Move a task within the Kanban board',
        description:
          'Updates the status and ordering of a task on the board. Requires a valid JWT via `Authorization` header or the `tf_session` cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BoardMoveRequest' },
              examples: {
                default: { value: boardMoveRequest.example as Record<string, unknown> },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Task board updated',
            headers: {
              ETag: {
                description: 'Entity tag representing the latest board update timestamp.',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BoardResponse' },
                examples: {
                  default: { value: boardResponse.example as Record<string, unknown> },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalid: invalidPayloadExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  notFound: { value: { error: 'Not found' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Retrieve a task',
        description:
          'Returns a single task owned by the authenticated user. Requires a valid JWT via `Authorization` header or the `tf_session` cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Task retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaskRecord' },
                examples: {
                  default: taskCreatedExample,
                },
              },
            },
          },
          '400': {
            description: 'Invalid identifier',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidIdentifier: invalidIdentifierExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
          '404': {
            description: 'Task not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  notFound: notFoundExample,
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task',
        description:
          'Partially updates a task owned by the authenticated user. Requires a valid JWT via `Authorization` header or the `tf_session` cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaskUpdateInput' },
              examples: {
                default: taskUpdateExample,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Task updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaskRecord' },
                examples: {
                  default: taskUpdatedRecordExample,
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidPayload: invalidPayloadExample,
                  invalidIdentifier: invalidIdentifierExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
          '404': {
            description: 'Task not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  notFound: notFoundExample,
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        description:
          'Deletes a task owned by the authenticated user. Requires a valid JWT via `Authorization` header or the `tf_session` cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Task removed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaskDeleteResponse' },
                examples: {
                  default: taskDeletedExample,
                },
              },
            },
          },
          '400': {
            description: 'Invalid identifier',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  invalidIdentifier: invalidIdentifierExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  unauthorized: unauthorizedExample,
                },
              },
            },
          },
          '404': {
            description: 'Task not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  notFound: notFoundExample,
                },
              },
            },
          },
        },
      },
    },
    '/api/taskforge/v1/tags': {
      get: {
        tags: ['Tags'],
        summary: 'List tags',
        description:
          'Retrieves all tag labels created by the authenticated user. Requires a valid JWT via `Authorization` header or the `tf_session` cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
          '200': {
            description: 'Tag collection',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TagListResponse' },
                examples: {
                  default: tagListResponseExample,
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tags'],
        summary: 'Create a tag',
        description:
          'Creates a new tag for the authenticated user. Requires a valid JWT via `Authorization` header or the `tf_session` cookie.',
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TagCreateInput' },
              examples: {
                default: tagCreateExample,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tag created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TagRecord' },
                examples: {
                  default: tagCreatedExample,
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  security: [],
};
