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

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL?.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/uploads', imageRouter);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/colors', colorRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

const port = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`)))
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
