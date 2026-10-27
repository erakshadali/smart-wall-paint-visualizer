import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './models/User.js';
import { Project } from './models/Project.js';
import { Session } from './models/Session.js';
import { Image } from './models/Image.js';

/**
 * Removes temporary demo accounts older than DEMO_MAX_AGE_HOURS (default 48) together with their
 * designs, sessions and stored images. Never touches real users or admins.
 * Usage: npm run cleanup:demo            (dry run: only prints what would be removed)
 *        npm run cleanup:demo -- --apply (actually deletes)
 */
const apply = process.argv.includes('--apply');
const maxAgeHours = Number(process.env.DEMO_MAX_AGE_HOURS ?? 48);
const cutoff = new Date(Date.now() - maxAgeHours * 3600 * 1000);

await mongoose.connect(process.env.MONGODB_URI!);

const users = await User.find({ isDemo: true, role: 'user', createdAt: { $lt: cutoff } }, '_id').lean();
const userIds = users.map((u) => u._id);
const projects = await Project.find({ owner: { $in: userIds } }, 'originalImageUrl resultImageUrl').lean();
const imageNames = projects
  .flatMap((p) => [p.originalImageUrl, p.resultImageUrl])
  .filter((u): u is string => !!u)
  .map((u) => u.split('/').pop()!);

console.log(
  `${apply ? 'Deleting' : 'Would delete'}: ${users.length} demo users, ${projects.length} designs, ${imageNames.length} images (older than ${maxAgeHours}h)`
);

if (apply && users.length) {
  await Image.deleteMany({ name: { $in: imageNames } });
  await Session.deleteMany({ user: { $in: userIds } });
  await Project.deleteMany({ owner: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });
  console.log('Done.');
} else if (!apply) {
  console.log('Dry run only. Re-run with: npm run cleanup:demo -- --apply');
}

await mongoose.disconnect();
