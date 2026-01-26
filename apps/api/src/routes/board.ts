import { Router } from 'express';

import { getPrismaClient } from '../prisma';
import { createTaskRepository, type TaskRepository } from '../repositories/task-repository';
import { BoardMoveSchema } from '../schemas/board';

function resolveIfNoneMatch(req: { headers: Record<string, string | string[] | undefined> }) {
  const header = req.headers['if-none-match'];
  if (Array.isArray(header)) {
    return header.join(', ');
  }
  return header;
}

function setBoardCacheHeaders(res: { setHeader: (key: string, value: string) => void }, updatedAt: string) {
  const etag = `W/"${updatedAt}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', updatedAt);
  return etag;
}

export function createBoardRouter(taskRepository?: TaskRepository) {
  const repository = taskRepository ?? createTaskRepository(getPrismaClient());
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const board = await repository.getTaskBoard(user.id);
      const etag = setBoardCacheHeaders(res, board.updatedAt);
      if (resolveIfNoneMatch(req) === etag) {
        return res.status(304).end();
      }

      res.json(board);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/move', async (req, res, next) => {
    const parsed = BoardMoveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const board = await repository.moveTaskOnBoard(user.id, parsed.data);
      if (!board) {
        return res.status(404).json({ error: 'Not found' });
      }

      setBoardCacheHeaders(res, board.updatedAt);
      res.json(board);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
