import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { Color } from '../models/Color.js';
import { edgeCache } from '../middleware/cache.js';

const router = Router();
const HEX = /^#[0-9a-fA-F]{6}$/;

router.get('/', edgeCache, async (req, res) => {
  const { tag, q } = req.query;
  const filter: Record<string, unknown> = {};
  if (typeof tag === 'string') filter.tags = tag;
  if (typeof q === 'string') {
    filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  res.json(await Color.find(filter).sort({ name: 1 }));
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, hex, brand, finishes, tags } = req.body ?? {};
  if (!name || !HEX.test(hex ?? '')) {
    return res.status(400).json({ message: 'name and a #RRGGBB hex are required' });
  }
  res.status(201).json(await Color.create({ name, hex, brand, finishes, tags }));
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, hex, brand, finishes, tags } = req.body ?? {};
  if (hex && !HEX.test(hex)) return res.status(400).json({ message: 'Invalid hex' });
  const color = await Color.findByIdAndUpdate(req.params.id, { name, hex, brand, finishes, tags }, { new: true });
  color ? res.json(color) : res.status(404).json({ message: 'Colour not found' });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const color = await Color.findByIdAndDelete(req.params.id);
  color ? res.status(204).end() : res.status(404).json({ message: 'Colour not found' });
});

export default router;
