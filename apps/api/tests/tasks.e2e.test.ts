import type { SuperTest, Test } from "supertest";

import type { TaskRepository } from "../src/repositories/task-repository";

import { createTestAgent } from "./utils/test-app";
import { extractSessionCookie, registerTestUser } from "./utils/auth";
import { createTask, createUser, defaultPassword } from "./utils/factories";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Tasks API", () => {
  let agent: SuperTest<Test>;
  let taskRepository: TaskRepository;

  beforeEach(() => {
    const context = createTestAgent({
      sessionBridgeSecret: "test-bridge-secret",
    });
    agent = context.agent;
    taskRepository = context.taskRepository;
  });

  async function register() {
    const registered = await registerTestUser(agent, {
      email: "tasks-user@example.com",
      password: defaultPassword,
    });

    return {
      accessToken: registered.tokens.accessToken,
      sessionCookie: extractSessionCookie(registered.cookies),
      userId: registered.user.id,
    };
  }

  function withAuth(
    request: Test,
    auth: { accessToken: string; sessionCookie?: string },
  ) {
    let authed = request.set("Authorization", `Bearer ${auth.accessToken}`);
    if (auth.sessionCookie) {
      authed = authed.set("Cookie", auth.sessionCookie);
    }
    return authed;
  }

  describe("list", () => {
    it("returns paginated tasks for the authenticated user with metadata", async () => {
      const auth = await register();

      const first = await createTask({
        userId: auth.userId,
        title: "Calibrate roadmap",
        description: "Sync on upcoming milestones",
        status: "TODO",
        priority: "LOW",
        dueDate: "2024-01-05T09:00:00.000Z",
        tags: ["roadmap", "planning"],
      });
      await sleep(5);
      const second = await createTask({
        userId: auth.userId,
        title: "Publish release notes",
        description: "Docs for the Q1 launch",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: "2024-01-15T17:00:00.000Z",
        tags: ["docs", "release"],
      });
      await sleep(5);
      const third = await createTask({
        userId: auth.userId,
        title: "Run retrospective",
        description: "Team retro for the last sprint",
        status: "DONE",
        priority: "MEDIUM",
        dueDate: "2024-01-20T20:00:00.000Z",
        tags: ["retro", "team"],
      });

      const outsider = await createUser({ email: "outsider@example.com" });
      await createTask({
        userId: outsider.user.id,
        title: "Should stay hidden",
        status: "TODO",
        dueDate: "2024-01-07T12:00:00.000Z",
        tags: ["private"],
      });

      const response = await withAuth(
        agent.get("/api/taskforge/v1/tasks?page=1&pageSize=2"),
        auth,
      ).expect(200);

      expect(response.body).toEqual({
        page: 1,
        pageSize: 2,
        total: 3,
        items: [
          {
            id: third.task.id,
            title: "Run retrospective",
            description: "Team retro for the last sprint",
            status: "DONE",
            priority: "MEDIUM",
            dueDate: "2024-01-20T20:00:00.000Z",
            tags: ["retro", "team"],
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
          {
            id: second.task.id,
            title: "Publish release notes",
            description: "Docs for the Q1 launch",
            status: "IN_PROGRESS",
            priority: "HIGH",
            dueDate: "2024-01-15T17:00:00.000Z",
            tags: ["docs", "release"],
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ],
      });

      expect(new Date(response.body.items[0].createdAt).toISOString()).toBe(
        response.body.items[0].createdAt,
      );
      expect(
        new Date(response.body.items[0].updatedAt).getTime(),
      ).toBeGreaterThan(0);
      expect(new Date(response.body.items[1].createdAt).toISOString()).toBe(
        response.body.items[1].createdAt,
      );
      expect(
        new Date(response.body.items[1].updatedAt).getTime(),
      ).toBeGreaterThan(0);
      expect(
        response.body.items.find(
          (item: { title: string }) => item.title === "Should stay hidden",
        ),
      ).toBeUndefined();

      const secondPage = await withAuth(
        agent.get("/api/taskforge/v1/tasks?page=2&pageSize=2"),
        auth,
      ).expect(200);

      expect(secondPage.body).toEqual({
        page: 2,
        pageSize: 2,
        total: 3,
        items: [
          expect.objectContaining({
            id: first.task.id,
            title: "Calibrate roadmap",
            dueDate: "2024-01-05T09:00:00.000Z",
            tags: ["planning", "roadmap"],
          }),
        ],
      });
    });

    it("requires authentication to list tasks", async () => {
      const response = await agent.get("/api/taskforge/v1/tasks").expect(401);
      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("supports filtering by status, priority, tag, search, and due date range", async () => {
      const auth = await register();

      await createTask({
        userId: auth.userId,
        title: "Plan kickoff",
        description: "Kickoff with stakeholders",
        status: "TODO",
        priority: "LOW",
        dueDate: "2024-01-01T10:00:00.000Z",
        tags: ["planning"],
      });

      const target = await createTask({
        userId: auth.userId,
        title: "Publish release notes",
        description: "Write docs for the Q1 release",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: "2024-01-10T10:00:00.000Z",
        tags: ["docs", "release"],
      });

      await createTask({
        userId: auth.userId,
        title: "File expenses",
        description: "Submit reimbursements",
        status: "DONE",
        priority: "MEDIUM",
        tags: ["finance"],
      });

      const response = await withAuth(
        agent.get(
          "/api/taskforge/v1/tasks?page=1&pageSize=10&status=IN_PROGRESS&priority=HIGH&tag=docs&q=release&dueFrom=2024-01-05T00:00:00.000Z&dueTo=2024-01-15T23:59:59.999Z",
        ),
        auth,
      ).expect(200);

      expect(response.body).toEqual({
        page: 1,
        pageSize: 10,
        total: 1,
        items: [
          {
            id: target.task.id,
            title: "Publish release notes",
            description: "Write docs for the Q1 release",
            status: "IN_PROGRESS",
            priority: "HIGH",
            dueDate: "2024-01-10T10:00:00.000Z",
            tags: ["docs", "release"],
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ],
      });

      expect(
        response.body.items.every(
          (item: {
            status: string;
            priority: string;
            tags: string[];
            title: string;
          }) =>
            item.status === "IN_PROGRESS" &&
            item.priority === "HIGH" &&
            item.tags.includes("docs") &&
            item.title.toLowerCase().includes("release"),
        ),
      ).toBe(true);
    });

    it("rejects invalid due date ranges", async () => {
      const auth = await register();

      const response = await withAuth(
        agent.get(
          "/api/taskforge/v1/tasks?dueFrom=2025-01-10T00:00:00.000Z&dueTo=2025-01-01T00:00:00.000Z",
        ),
        auth,
      ).expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({ error: "Invalid payload" }),
      );
    });

    it("validates pagination parameters", async () => {
      const auth = await register();

      const response = await withAuth(
        agent.get("/api/taskforge/v1/tasks?page=0&pageSize=-1"),
        auth,
      ).expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({ error: "Invalid payload" }),
      );
    });
  });

  describe("create", () => {
    it("creates a task with defaults and returns the persisted record", async () => {
      const auth = await register();

      const createResponse = await withAuth(
        agent.post("/api/taskforge/v1/tasks").send({
          title: "Write API docs",
          description: "Outline request/response examples",
          priority: "HIGH",
          tags: [" docs  ", "api", "work"],
          dueDate: "2024-03-01T09:30:00.000Z",
        }),
        auth,
      ).expect(201);

      expect(createResponse.body).toEqual({
        id: expect.any(String),
        title: "Write API docs",
        description: "Outline request/response examples",
        status: "TODO",
        priority: "HIGH",
        dueDate: "2024-03-01T09:30:00.000Z",
        tags: ["api", "docs", "work"],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      expect(new Date(createResponse.body.createdAt).toISOString()).toBe(
        createResponse.body.createdAt,
      );
      expect(new Date(createResponse.body.updatedAt).getTime()).toBeGreaterThan(
        0,
      );

      const stored = await taskRepository.listTasks(auth.userId, {
        pageSize: 10,
      });
      expect(stored.total).toBe(1);
      expect(stored.items[0]).toMatchObject({
        id: createResponse.body.id,
        title: "Write API docs",
        priority: "HIGH",
        dueDate: "2024-03-01T09:30:00.000Z",
        tags: ["api", "docs", "work"],
      });
    });

    it("rejects invalid payloads with the standard error envelope", async () => {
      const auth = await register();

      const response = await withAuth(
        agent.post("/api/taskforge/v1/tasks").send({ title: "  " }),
        auth,
      ).expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: "Invalid payload",
          details: expect.any(Object),
        }),
      );
    });

    it("requires authentication to create tasks", async () => {
      const response = await agent
        .post("/api/taskforge/v1/tasks")
        .send({ title: "Unauthenticated task" })
        .expect(401);

      expect(response.body).toEqual({ error: "Unauthorized" });
    });
  });

  describe("board", () => {
    it("returns grouped board data, lane ordering, and summary for the authenticated user", async () => {
      const auth = await register();

      const todoA = await createTask({
        userId: auth.userId,
        title: "Todo A",
        status: "TODO",
        tags: ["ops"],
      });
      const todoB = await createTask({
        userId: auth.userId,
        title: "Todo B",
        status: "TODO",
        tags: ["ops", "frontend"],
      });
      const inProgress = await createTask({
        userId: auth.userId,
        title: "In Progress A",
        status: "IN_PROGRESS",
        tags: ["backend"],
      });
      const done = await createTask({
        userId: auth.userId,
        title: "Done A",
        status: "DONE",
        tags: ["frontend"],
      });

      const outsider = await createUser({
        email: "board-outsider@example.com",
      });
      await createTask({
        userId: outsider.user.id,
        title: "Private task",
        status: "TODO",
        tags: ["private"],
      });

      const response = await withAuth(
        agent.get("/api/taskforge/v1/tasks/board"),
        auth,
      ).expect(200);

      expect(
        response.body.columns.map(
          (column: { status: string }) => column.status,
        ),
      ).toEqual(["TODO", "IN_PROGRESS", "DONE"]);
      expect(
        response.body.columns[0].tasks.map((task: { id: string }) => task.id),
      ).toEqual([todoA.task.id, todoB.task.id]);
      expect(
        response.body.columns[1].tasks.map((task: { id: string }) => task.id),
      ).toEqual([inProgress.task.id]);
      expect(
        response.body.columns[2].tasks.map((task: { id: string }) => task.id),
      ).toEqual([done.task.id]);
      expect(response.body.summary).toEqual(
        expect.objectContaining({
          totalTasks: 4,
          totalsByStatus: { TODO: 2, IN_PROGRESS: 1, DONE: 1 },
        }),
      );
    });

    it("requires authentication to fetch the board", async () => {
      const response = await agent
        .get("/api/taskforge/v1/tasks/board")
        .expect(401);
      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("filters board data by repeated tag query params", async () => {
      const auth = await register();

      const matching = await createTask({
        userId: auth.userId,
        title: "Frontend API work",
        status: "TODO",
        tags: ["frontend", "api"],
      });
      await createTask({
        userId: auth.userId,
        title: "Frontend only work",
        status: "IN_PROGRESS",
        tags: ["frontend"],
      });
      await createTask({
        userId: auth.userId,
        title: "API only work",
        status: "DONE",
        tags: ["api"],
      });

      const response = await withAuth(
        agent.get("/api/taskforge/v1/tasks/board?tag=frontend&tag=api"),
        auth,
      ).expect(200);

      expect(response.body.summary).toEqual(
        expect.objectContaining({
          totalTasks: 1,
          totalsByStatus: { TODO: 1, IN_PROGRESS: 0, DONE: 0 },
        }),
      );
      expect(
        response.body.columns.flatMap(
          (column: { tasks: Array<{ id: string }> }) =>
            column.tasks.map((task) => task.id),
        ),
      ).toEqual([matching.task.id]);
    });

    it("requires authentication to move tasks on the board", async () => {
      const created = await createTask({
        title: "Unauthenticated board move",
        status: "TODO",
      });

      const response = await agent
        .patch("/api/taskforge/v1/tasks/board/move")
        .send({
          taskId: created.task.id,
          targetStatus: "IN_PROGRESS",
          targetIndex: 0,
        })
        .expect(401);

      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("supports same-lane reorder and cross-lane move through board move endpoint", async () => {
      const auth = await register();
      const todoA = await createTask({
        userId: auth.userId,
        title: "Todo A",
        status: "TODO",
      });
      const todoB = await createTask({
        userId: auth.userId,
        title: "Todo B",
        status: "TODO",
      });
      const todoC = await createTask({
        userId: auth.userId,
        title: "Todo C",
        status: "TODO",
      });
      const inProgress = await createTask({
        userId: auth.userId,
        title: "Doing A",
        status: "IN_PROGRESS",
      });

      const reordered = await withAuth(
        agent.patch("/api/taskforge/v1/tasks/board/move").send({
          taskId: todoC.task.id,
          targetStatus: "TODO",
          targetIndex: 0,
        }),
        auth,
      ).expect(200);

      expect(
        reordered.body.columns
          .find((column: { status: string }) => column.status === "TODO")
          .tasks.map((task: { id: string }) => task.id),
      ).toEqual([todoC.task.id, todoA.task.id, todoB.task.id]);

      const moved = await withAuth(
        agent.patch("/api/taskforge/v1/tasks/board/move").send({
          taskId: todoA.task.id,
          targetStatus: "IN_PROGRESS",
          targetIndex: 1,
        }),
        auth,
      ).expect(200);

      expect(
        moved.body.columns
          .find((column: { status: string }) => column.status === "TODO")
          .tasks.map((task: { id: string }) => task.id),
      ).toEqual([todoC.task.id, todoB.task.id]);
      expect(
        moved.body.columns
          .find((column: { status: string }) => column.status === "IN_PROGRESS")
          .tasks.map((task: { id: string; status: string }) => ({
            id: task.id,
            status: task.status,
          })),
      ).toEqual([
        { id: inProgress.task.id, status: "IN_PROGRESS" },
        { id: todoA.task.id, status: "IN_PROGRESS" },
      ]);
    });

    it("does not mark unrelated lane tasks as recently updated when reindexing board moves", async () => {
      const auth = await register();
      const todoA = await createTask({
        userId: auth.userId,
        title: "Todo A",
        status: "TODO",
      });
      await sleep(5);
      const todoB = await createTask({
        userId: auth.userId,
        title: "Todo B",
        status: "TODO",
      });
      await sleep(5);
      const inProgress = await createTask({
        userId: auth.userId,
        title: "Doing A",
        status: "IN_PROGRESS",
      });
      await sleep(5);

      const moved = await withAuth(
        agent.patch("/api/taskforge/v1/tasks/board/move").send({
          taskId: todoA.task.id,
          targetStatus: "IN_PROGRESS",
          targetIndex: 1,
        }),
        auth,
      ).expect(200);

      const todoBFromBoard = moved.body.columns
        .find((column: { status: string }) => column.status === "TODO")
        .tasks.find((task: { id: string }) => task.id === todoB.task.id);
      const inProgressFromBoard = moved.body.columns
        .find((column: { status: string }) => column.status === "IN_PROGRESS")
        .tasks.find((task: { id: string }) => task.id === inProgress.task.id);
      const movedTaskFromBoard = moved.body.columns
        .find((column: { status: string }) => column.status === "IN_PROGRESS")
        .tasks.find((task: { id: string }) => task.id === todoA.task.id);

      expect(todoBFromBoard.updatedAt).toBe(todoB.task.updatedAt);
      expect(inProgressFromBoard.updatedAt).toBe(inProgress.task.updatedAt);
      expect(new Date(movedTaskFromBoard.updatedAt).getTime()).toBeGreaterThan(
        new Date(todoA.task.updatedAt).getTime(),
      );
    });

    it("validates targetIndex and returns not found for unknown tasks", async () => {
      const auth = await register();
      const todo = await createTask({
        userId: auth.userId,
        title: "Todo A",
        status: "TODO",
      });

      const invalid = await withAuth(
        agent.patch("/api/taskforge/v1/tasks/board/move").send({
          taskId: todo.task.id,
          targetStatus: "TODO",
          targetIndex: 99,
        }),
        auth,
      ).expect(400);

      expect(invalid.body).toEqual(
        expect.objectContaining({
          error: "Invalid payload",
          details: expect.objectContaining({
            targetIndex: expect.stringContaining("targetIndex must be between"),
          }),
        }),
      );

      const notFound = await withAuth(
        agent.patch("/api/taskforge/v1/tasks/board/move").send({
          taskId: "f30fc08a-f14c-403f-ac46-bccabf17eca6",
          targetStatus: "TODO",
          targetIndex: 0,
        }),
        auth,
      ).expect(404);

      expect(notFound.body).toEqual({ error: "Not found" });
    });

    it("isolates board moves by user ownership", async () => {
      const auth = await register();
      const other = await createUser({ email: "board-isolation@example.com" });
      const foreign = await createTask({
        userId: other.user.id,
        title: "Foreign task",
        status: "TODO",
      });

      const response = await withAuth(
        agent.patch("/api/taskforge/v1/tasks/board/move").send({
          taskId: foreign.task.id,
          targetStatus: "DONE",
          targetIndex: 0,
        }),
        auth,
      ).expect(404);

      expect(response.body).toEqual({ error: "Not found" });
    });
  });

  describe("update", () => {
    it("updates a task and returns the fresh record with propagated tags", async () => {
      const auth = await register();
      const created = await createTask({
        userId: auth.userId,
        title: "Draft proposal",
        description: "Initial outline",
        status: "TODO",
        priority: "LOW",
        dueDate: "2024-04-01T12:00:00.000Z",
        tags: ["initial"],
      });

      await sleep(10);

      const response = await withAuth(
        agent.patch(`/api/taskforge/v1/tasks/${created.task.id}`).send({
          title: "Draft proposal v2",
          description: "Expanded with metrics",
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueDate: "2024-04-05T15:00:00.000Z",
          tags: ["planning", "proposal"],
        }),
        auth,
      ).expect(200);

      expect(response.body).toEqual({
        id: created.task.id,
        title: "Draft proposal v2",
        description: "Expanded with metrics",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: "2024-04-05T15:00:00.000Z",
        tags: ["planning", "proposal"],
        createdAt: created.task.createdAt,
        updatedAt: expect.any(String),
      });

      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(created.task.updatedAt).getTime(),
      );

      const refreshed = await taskRepository.listTasks(auth.userId);
      expect(refreshed.total).toBe(1);
      expect(refreshed.items[0]).toMatchObject({
        id: created.task.id,
        title: "Draft proposal v2",
        description: "Expanded with metrics",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: "2024-04-05T15:00:00.000Z",
        tags: ["planning", "proposal"],
      });
      expect(refreshed.items[0].tags).not.toContain("initial");
    });

    it("returns 400 when updating with an invalid task id", async () => {
      const auth = await register();

      const response = await withAuth(
        agent
          .patch("/api/taskforge/v1/tasks/not-a-uuid")
          .send({ title: "Renamed" }),
        auth,
      ).expect(400);

      expect(response.body).toEqual({ error: "Invalid identifier" });
    });

    it("returns validation errors for malformed updates", async () => {
      const auth = await register();
      const created = await createTask({
        userId: auth.userId,
        title: "Fix lint",
      });

      const response = await withAuth(
        agent
          .patch(`/api/taskforge/v1/tasks/${created.task.id}`)
          .send({ dueDate: "not-a-date" }),
        auth,
      ).expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: "Invalid payload",
          details: expect.any(Object),
        }),
      );
    });

    it("requires authentication to update tasks", async () => {
      const created = await createTask({ title: "Hidden task" });

      const response = await agent
        .patch(`/api/taskforge/v1/tasks/${created.task.id}`)
        .send({ title: "Blocked" })
        .expect(401);

      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when attempting to update another user's task", async () => {
      const auth = await register();
      const someoneElse = await createUser({
        email: "someone-else@example.com",
      });
      const foreignTask = await createTask({
        userId: someoneElse.user.id,
        title: "Secret task",
      });

      const response = await withAuth(
        agent
          .patch(`/api/taskforge/v1/tasks/${foreignTask.task.id}`)
          .send({ title: "Hacked" }),
        auth,
      ).expect(404);

      expect(response.body).toEqual({ error: "Not found" });
    });
  });

  describe("get by id", () => {
    it("returns a single task for the authenticated user", async () => {
      const auth = await register();
      const created = await createTask({
        userId: auth.userId,
        title: "Inspect backlog item",
        description: "Needs the full task payload",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        dueDate: "2024-03-10T10:00:00.000Z",
        tags: ["detail", "view"],
      });

      const response = await withAuth(
        agent.get(`/api/taskforge/v1/tasks/${created.task.id}`),
        auth,
      ).expect(200);

      expect(response.body).toEqual({
        id: created.task.id,
        title: "Inspect backlog item",
        description: "Needs the full task payload",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        dueDate: "2024-03-10T10:00:00.000Z",
        tags: ["detail", "view"],
        createdAt: created.task.createdAt,
        updatedAt: created.task.updatedAt,
      });
    });

    it("returns 404 when retrieving another user's task", async () => {
      const auth = await register();
      const someoneElse = await createUser({
        email: "view-other@example.com",
      });
      const foreignTask = await createTask({
        userId: someoneElse.user.id,
        title: "Private detail",
      });

      const response = await withAuth(
        agent.get(`/api/taskforge/v1/tasks/${foreignTask.task.id}`),
        auth,
      ).expect(404);

      expect(response.body).toEqual({ error: "Not found" });
    });
  });

  describe("delete", () => {
    it("deletes a task and returns a confirmation payload", async () => {
      const auth = await register();
      const created = await createTask({
        userId: auth.userId,
        title: "Archive me",
        tags: ["cleanup"],
      });

      const response = await withAuth(
        agent.delete(`/api/taskforge/v1/tasks/${created.task.id}`),
        auth,
      ).expect(200);

      expect(response.body).toEqual({ id: created.task.id, status: "deleted" });

      const remaining = await taskRepository.listTasks(auth.userId);
      expect(remaining.total).toBe(0);
    });

    it("returns 400 when deleting with an invalid task id", async () => {
      const auth = await register();

      const response = await withAuth(
        agent.delete("/api/taskforge/v1/tasks/not-a-uuid"),
        auth,
      ).expect(400);

      expect(response.body).toEqual({ error: "Invalid identifier" });
    });

    it("requires authentication to delete tasks", async () => {
      const created = await createTask({ title: "Do not remove" });

      const response = await agent
        .delete(`/api/taskforge/v1/tasks/${created.task.id}`)
        .expect(401);

      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when attempting to delete another user's task", async () => {
      const auth = await register();
      const someoneElse = await createUser({
        email: "delete-other@example.com",
      });
      const foreignTask = await createTask({
        userId: someoneElse.user.id,
        title: "Keep out",
      });

      const response = await withAuth(
        agent.delete(`/api/taskforge/v1/tasks/${foreignTask.task.id}`),
        auth,
      ).expect(404);

      expect(response.body).toEqual({ error: "Not found" });
    });
  });
});
