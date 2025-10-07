import { Router } from 'express';

export const router = Router();
const tags = new Set<string>(['work', 'personal']);

type TagPayload = {
  label?: string;
};

router.get('/', (_req, res) => {
  res.json({ items: Array.from(tags) });
});

router.post('/', (req, res) => {
  const { label = '' } = (req.body as TagPayload | undefined) ?? {};
  const normalized = label.trim();
  if (!normalized) return res.status(400).json({ error: 'label required' });
  tags.add(normalized);
  res.status(201).json({ label: normalized });
});
