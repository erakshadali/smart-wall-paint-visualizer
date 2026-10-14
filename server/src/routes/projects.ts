import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { imageUpload, saveImage, removeImage } from '../middleware/upload.js';
import { Project } from '../models/Project.js';

const router = Router();
router.use(requireAuth);

export const DISCLAIMER =
  'Colours shown are a preview. Final results may vary due to lighting, screen calibration and wall texture.';

async function ownProject(req: AuthRequest, res: Response) {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!project) res.status(404).json({ message: 'Project not found' });
  return project;
}

router.get('/', async (req: AuthRequest, res) => {
  res.json(await Project.find({ owner: req.user!.id }).sort({ updatedAt: -1 }));
});

// Upload a room photo. The user must confirm the photo is their own original image.
router.post('/', imageUpload, async (req: AuthRequest, res) => {
  if (req.body?.confirmOwnership !== 'true') {
    return res.status(400).json({ message: 'Please confirm the photo is original and owned by you' });
  }
  if (!req.file) return res.status(400).json({ message: 'Image is required' });
  const project = await Project.create({
    owner: req.user!.id,
    title: String(req.body.title ?? 'Untitled design').slice(0, 80),
    originalImageUrl: saveImage(req.file),
  });
  res.status(201).json({ project, disclaimer: DISCLAIMER });
});

router.get('/:id', async (req: AuthRequest, res) => {
  const project = await ownProject(req, res);
  if (project) res.json({ project, disclaimer: DISCLAIMER });
});

// Save wall selections and applied colours (multiple trials = edit and re-save).
router.put('/:id', async (req: AuthRequest, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  const { title, walls } = req.body ?? {};
  if (title !== undefined) project.title = String(title).slice(0, 80);
  if (Array.isArray(walls)) {
    const valid = walls.every((w: any) => {
      const minPoints = w.type === 'brush' ? 2 : 3;
      return (
        Array.isArray(w.points) &&
        w.points.length >= minPoints &&
        w.points.every((p: any) => Number.isFinite(p.x) && Number.isFinite(p.y))
      );
    });
    if (!valid) return res.status(400).json({ message: 'Each wall needs enough valid points (3 for polygon, 2 for brush)' });
    project.set('walls', walls);
  }
  await project.save();
  res.json({ project });
});

// Store the rendered (painted) image so it can be downloaded later.
router.post('/:id/result', imageUpload, async (req: AuthRequest, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  if (!req.file) return res.status(400).json({ message: 'Image is required' });
  removeImage(project.resultImageUrl);
  project.resultImageUrl = saveImage(req.file);
  await project.save();
  res.json({ project });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  removeImage(project.originalImageUrl);
  removeImage(project.resultImageUrl);
  await project.deleteOne();
  res.status(204).end();
});

export default router;
