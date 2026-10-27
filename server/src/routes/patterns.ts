import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { imageUpload, saveImage, removeImage } from '../middleware/upload.js';
import { Pattern } from '../models/Pattern.js';
import { edgeCache } from '../middleware/cache.js';

const router = Router();

router.get('/', edgeCache, async (_req, res) => res.json(await Pattern.find().sort({ name: 1 })));

router.post('/', requireAuth, requireAdmin, imageUpload, async (req, res) => {
  const { name, description, style, scale } = req.body ?? {};
  if (!name || !req.file) return res.status(400).json({ message: 'name and pattern image are required' });
  res.status(201).json(
    await Pattern.create({ name, description, style, scale: Number(scale) || 1, imageUrl: await saveImage(req.file) })
  );
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, description, style, scale } = req.body ?? {};
  const pattern = await Pattern.findByIdAndUpdate(req.params.id, { name, description, style, scale }, { new: true });
  pattern ? res.json(pattern) : res.status(404).json({ message: 'Pattern not found' });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const pattern = await Pattern.findByIdAndDelete(req.params.id);
  if (!pattern) return res.status(404).json({ message: 'Pattern not found' });
  await removeImage(pattern.imageUrl);
  res.status(204).end();
});

export default router;
