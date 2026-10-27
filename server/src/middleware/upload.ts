import multer from 'multer';
import crypto from 'node:crypto';
import { Router } from 'express';
import { Image } from '../models/Image.js';

const MAX_BYTES = 8 * 1024 * 1024;

// Files are held in memory, verified, then stored in MongoDB under a random name.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(Object.assign(new Error('Only JPG or PNG images are allowed'), { status: 400 }));
    }
    cb(null, true);
  },
}).single('image');

export function detectType(buf: Buffer): 'jpg' | 'png' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length > 8 && buf.subarray(0, 8).equals(pngSig)) return 'png';
  return null;
}

/** Stores raw image bytes and returns the public URL path. */
export async function storeImage(buf: Buffer, name = `${crypto.randomUUID()}`): Promise<string> {
  const type = detectType(buf);
  if (!type) throw Object.assign(new Error('File content is not a valid JPG or PNG image'), { status: 400 });
  const fileName = name.includes('.') ? name : `${name}.${type}`;
  await Image.findOneAndUpdate(
    { name: fileName },
    { name: fileName, contentType: type === 'jpg' ? 'image/jpeg' : 'image/png', data: buf },
    { upsert: true }
  );
  return `/uploads/${fileName}`;
}

/** Checks the real file signature (not just the client-sent MIME type) and stores it. */
export function saveImage(file: Express.Multer.File): Promise<string> {
  return storeImage(file.buffer);
}

export async function removeImage(url?: string | null) {
  if (!url?.startsWith('/uploads/')) return;
  await Image.deleteOne({ name: url.slice('/uploads/'.length) });
}

/** Serves stored images. Names are random and never reused, so they can be cached for a long time. */
export const imageRouter = Router();
imageRouter.get('/:name', async (req, res) => {
  const img = await Image.findOne({ name: req.params.name });
  if (!img) return res.status(404).json({ message: 'Image not found' });
  res.set({ 'Content-Type': img.contentType, 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' });
  res.send(img.data);
});
