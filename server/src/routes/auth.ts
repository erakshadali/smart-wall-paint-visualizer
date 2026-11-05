import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = Router();

function sign(user: { id: string; role: string }, expiresIn: '7d' | '1d' = '7d') {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn });
}

// Each demo click creates a throwaway account, so keep it from being used to flood the database.
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  message: { message: 'Too many demo sessions from this network. Please try again later or create an account.' },
});

// Slow down password guessing and mass sign-ups (failed logins only count, so real users are not locked out).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { message: 'Too many failed attempts. Please wait 15 minutes and try again.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: { message: 'Too many sign-ups from this network. Please try again later.' },
});

/**
 * "Try the demo": creates a temporary, non-admin account with a random password nobody knows,
 * so visitors never share data and no credentials exist anywhere in the client or repo.
 */
router.post('/demo', demoLimiter, async (_req, res) => {
  const id = randomBytes(6).toString('hex');
  const name = 'Demo visitor';
  const email = `demo-${id}@demo.invalid`;
  const user = await User.create({
    name,
    email,
    role: 'user',
    isDemo: true,
    passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
  });
  res.status(201).json({ token: sign(user, '1d'), user: { id: user.id, name, email, role: user.role } });
});

router.post('/register', registerLimiter, async (req, res) => {
  const { name, email, password } = req.body ?? {};
  // Only plain strings: an object such as {"$ne": null} must never reach a database query.
  if ([name, email, password].some((v) => typeof v !== 'string')) return res.status(400).json({ message: 'Invalid details' });
  if (!name || !email || !password || password.length < 8)
    return res.status(400).json({ message: 'Name, email and a password of 8+ characters are required' });
  if (await User.findOne({ email })) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: { id: user.id, name, email, role: user.role } });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ message: 'Invalid email or password' });
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password ?? '', user.passwordHash)))
    return res.status(401).json({ message: 'Invalid email or password' });
  res.json({ token: sign(user), user: { id: user.id, name: user.name, email, role: user.role } });
});

export default router;
