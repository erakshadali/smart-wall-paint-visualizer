import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Feedback } from '../models/Feedback.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  res.json(
    await User.findById(req.user!.id).select('-passwordHash').populate('favouriteColors favouritePatterns')
  );
});

// Toggle a favourite colour or pattern.
router.post('/favourites/:kind/:id', async (req: AuthRequest, res) => {
  const field =
    req.params.kind === 'colors' ? 'favouriteColors' : req.params.kind === 'patterns' ? 'favouritePatterns' : null;
  if (!field) return res.status(400).json({ message: 'kind must be colors or patterns' });
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const list = user[field] as unknown as string[];
  const i = list.findIndex((x) => String(x) === req.params.id);
  if (i >= 0) list.splice(i, 1);
  else list.push(req.params.id as string);
  await user.save();
  res.json({ [field]: user[field] });
});

// KPI inputs: session duration and satisfaction feedback.
router.post('/session', async (req: AuthRequest, res) => {
  const seconds = Number(req.body?.seconds);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400) {
    return res.status(400).json({ message: 'Invalid seconds' });
  }
  await Session.create({ user: req.user!.id, seconds });
  res.status(201).end();
});

router.post('/feedback', async (req: AuthRequest, res) => {
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'rating must be 1-5' });
  }
  await Feedback.create({ user: req.user!.id, rating, comment: String(req.body?.comment ?? '').slice(0, 500) });
  res.status(201).end();
});

export default router;
