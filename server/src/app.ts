import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import colorRoutes from './routes/colors.js';
import patternRoutes from './routes/patterns.js';
import meRoutes from './routes/me.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/error.js';
import { imageRouter } from './middleware/upload.js';

let connecting: Promise<typeof mongoose> | null = null;

/** Connects once and reuses the connection, so it also works in serverless functions. */
export function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  connecting ??= mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 10000 }).catch((err) => {
    connecting = null;
    throw err;
  });
  return connecting;
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL?.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.use(async (_req, _res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/uploads', imageRouter);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/colors', colorRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

export default app;
