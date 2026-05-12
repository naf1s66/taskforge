import { Router } from 'express';
import { z } from 'zod';

import { getPrismaClient } from '../prisma';

const CreateTagSchema = z.object({
  label: z.string().trim().min(1).max(64),
});

function normalizeTagLabel(label: string): string {
  return label.trim().toLocaleLowerCase();
}

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
          select: { TaskTag: true },
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

// TODO: add DELETE /:id and PATCH /:id when tag management UI is implemented.
