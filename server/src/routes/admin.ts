import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Session } from '../models/Session.js';
import { Feedback } from '../models/Feedback.js';
import { Setting } from '../models/Setting.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// KPIs from the brief: images uploaded, designs saved, avg session time, satisfaction.
router.get('/stats', async (_req, res) => {
  const [users, imagesUploaded, designsSaved, sessions, feedback] = await Promise.all([
    User.countDocuments(),
    Project.countDocuments(),
    Project.countDocuments({ 'walls.0': { $exists: true } }),
    Session.aggregate([{ $group: { _id: null, avg: { $avg: '$seconds' } } }]),
    Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
  ]);
  res.json({
    users,
    imagesUploaded,
    designsSaved,
    avgSessionSeconds: Math.round(sessions[0]?.avg ?? 0),
    avgSatisfaction: Number((feedback[0]?.avg ?? 0).toFixed(2)),
    feedbackCount: feedback[0]?.count ?? 0,
  });
});

router.get('/users', async (_req, res) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
  const counts = await Project.aggregate([{ $group: { _id: '$owner', n: { $sum: 1 } } }]);
  const byOwner = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json(users.map((u) => ({ ...u, projectCount: byOwner.get(String(u._id)) ?? 0 })));
});

router.get('/projects', async (_req, res) => {
  res.json(await Project.find().sort({ updatedAt: -1 }).limit(200).populate('owner', 'name email'));
});

router.get('/settings', async (_req, res) => res.json(await Setting.find()));
router.put('/settings/:key', async (req, res) => {
  res.json(
    await Setting.findOneAndUpdate({ key: req.params.key }, { value: req.body?.value }, { upsert: true, new: true })
  );
});

export default router;
