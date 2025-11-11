import type { OpenAPIV3 } from 'openapi-types';

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

const authSuccessExample = {
  user: authUser.example as Record<string, unknown>,
  tokens: authTokens.example as Record<string, unknown>,
};

const unauthorizedExample = { value: { error: 'Unauthorized' } } satisfies OpenAPIV3.ExampleObject;

const invalidCredentialsExample = { value: { error: 'Invalid credentials' } } satisfies OpenAPIV3.ExampleObject;

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
  value: { user: authUser.example },
} satisfies OpenAPIV3.ExampleObject;

const authMeAnonymousExample = { value: { user: null } } satisfies OpenAPIV3.ExampleObject;

const authCredentialsExample = {
  value: authCredentials.example as Record<string, unknown>,
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

const taskCreateInput: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    dueDate: { type: 'string', format: 'date-time' },
    tags: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
  },
  required: ['title'],
  example: {
    title: 'Book product sync',
    description: 'Coordinate roadmap review with stakeholders',
    priority: 'HIGH',
    tags: ['planning'],
    dueDate: '2024-07-05T15:00:00.000Z',
  },
};

const taskUpdateInput: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    dueDate: { type: 'string', format: 'date-time' },
    tags: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
  additionalProperties: false,
  example: {
    status: 'IN_PROGRESS',
    priority: 'HIGH',
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
    items: [taskRecord.example, taskRecord.example],
    page: 1,
    pageSize: 20,
    total: 2,
  },
};

const taskCreatedExample = {
  value: taskRecord.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const taskListExample = {
  value: taskListResponse.example as Record<string, unknown>,
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

const taskUpdateExample = {
  value: taskUpdateInput.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

const taskDeletedExample = {
  value: taskDeletedResponse.example as Record<string, unknown>,
} satisfies OpenAPIV3.ExampleObject;

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
    },
    schemas: {
      AuthCredentials: authCredentials,
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
      TaskCreateInput: taskCreateInput,
      TaskUpdateInput: taskUpdateInput,
      TaskListResponse: taskListResponse,
      TaskDeleteResponse: taskDeletedResponse,
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
        security: [{ bearerAuth: [] }],
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
        summary: 'Alias for the authenticated user endpoint',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user or null when not authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthMeResponse' },
                examples: {
                  authenticated: authMeSuccessExample,
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
    '/api/taskforge/v1/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks for the authenticated user',
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
    '/api/taskforge/v1/tasks/{id}': {
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task',
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Tag collection',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: true,
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
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tag created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: true,
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

