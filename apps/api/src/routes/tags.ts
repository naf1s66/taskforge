import { Router } from 'express';

export const router = Router();
let tags = new Set<string>(['work','personal']);

router.get('/', (_req, res) => {
  res.json({ items: Array.from(tags) });
});

router.post('/', (req, res) => {
  const label = String(req.body?.label || '').trim();
  if (!label) return res.status(400).json({ error: 'label required' });
  tags.add(label);
  res.status(201).json({ label });
});
