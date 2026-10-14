import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User.js';

// Usage: ADMIN_NEW_PASSWORD=... npm run reset-admin
const password = process.env.ADMIN_NEW_PASSWORD;
if (!password || password.length < 12) {
  console.error('Set ADMIN_NEW_PASSWORD (12+ characters).');
  process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI!);
const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const res = await User.updateOne({ email, role: 'admin' }, { passwordHash: await bcrypt.hash(password, 10) });
console.log(res.matchedCount ? `Password updated for ${email}` : `No admin found for ${email}`);
await mongoose.disconnect();
