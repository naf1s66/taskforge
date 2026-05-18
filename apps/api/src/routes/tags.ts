import { Router } from 'express';
import { normalizeTagLabel } from '@taskforge/shared';

import { getPrismaClient } from '../prisma';
import { CreateTagSchema } from '../schemas/tag';

export const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const user = res.locals.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const prisma = getPrismaClient();
    const items = await prisma.tag.findMany({
      where: { userId: user.id },
      orderBy: { label: 'asc' },
      select: {
        label: true,
        _count: {
          select: {
            TaskTag: {
              where: {
                task: {
                  userId: user.id,
                },
              },
            },
          },
        },
      },
    });

    return res.json({
      items: items.map(item => ({
        label: item.label,
        count: item._count.TaskTag,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const parsed = CreateTagSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    const user = res.locals.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const prisma = getPrismaClient();
    const label = normalizeTagLabel(parsed.data.label);
    const tag = await prisma.tag.upsert({
      where: {
        userId_label: {
          userId: user.id,
          label,
        },
      },
      update: {},
      create: {
        userId: user.id,
        label,
      },
      select: { id: true, label: true },
    });

    return res.status(201).json(tag);
  } catch (error) {
    next(error);
  }
});

// Future scope: add rename/delete endpoints when dedicated tag administration is designed.
