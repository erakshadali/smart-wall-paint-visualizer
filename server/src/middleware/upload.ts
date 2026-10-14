import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const UPLOAD_DIR = path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_BYTES = 8 * 1024 * 1024;

// Files are held in memory, verified, then written under a random name.
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

function detectType(buf: Buffer): 'jpg' | 'png' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length > 8 && buf.subarray(0, 8).equals(pngSig)) return 'png';
  return null;
}

/** Checks the real file signature (not just the client-sent MIME type) and stores it. */
export function saveImage(file: Express.Multer.File): string {
  const type = detectType(file.buffer);
  if (!type) throw Object.assign(new Error('File content is not a valid JPG or PNG image'), { status: 400 });
  const name = `${crypto.randomUUID()}.${type}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
  return `/uploads/${name}`;
}

export function removeImage(url?: string | null) {
  if (!url?.startsWith('/uploads/')) return;
  fs.rmSync(path.join(UPLOAD_DIR, path.basename(url)), { force: true });
}
