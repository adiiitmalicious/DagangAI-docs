import { ERROR_CODES } from '@dagangai/shared';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pool } from './db/pool.js';
import { sendError, sendSuccess } from './lib/response.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { adminRouter } from './routes/admin.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { businessRouter } from './routes/business.routes.js';
import { contentsRouter } from './routes/contents.routes.js';
import { designTemplatesRouter } from './routes/design-templates.routes.js';
import { designsRouter } from './routes/designs.routes.js';
import { meRouter } from './routes/me.routes.js';
import { plannerRouter } from './routes/planner.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { getStorageAdapter } from './storage/adapter.js';

export function createApp() {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  app.use(
    cors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Rate limiter umum: 120 req/menit (API-spec §14.5)
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      sendError(
        req,
        res,
        429,
        ERROR_CODES.RATE_LIMITED,
        'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu sebentar.'
      );
    },
  });

  const v1 = Router();
  v1.use(generalLimiter);

  v1.get('/health', async (req, res) => {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    sendSuccess(req, res, {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      service: 'dagangai-api',
      version: '1.0.0',
      database: dbStatus,
    });
  });

  // Endpoint media lokal dev tervalidasi signed URL (T-004)
  v1.get('/media', async (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key : '';
    const expires = typeof req.query.expires === 'string' ? req.query.expires : '';
    const sig = typeof req.query.sig === 'string' ? req.query.sig : '';

    const storage = getStorageAdapter();
    if (!key || !expires || !sig || !storage.verifySignedToken?.(key, expires, sig)) {
      sendError(req, res, 401, ERROR_CODES.UNAUTHORIZED, 'Tautan media tidak valid atau kedaluwarsa.');
      return;
    }

    const buffer = await storage.readLocalObject?.(key);
    if (!buffer) {
      sendError(req, res, 404, ERROR_CODES.RESOURCE_NOT_FOUND, 'Berkas media tidak ditemukan.');
      return;
    }

    const ext = key.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  });

  v1.use('/auth', authRouter);
  v1.use('/me', meRouter);
  v1.use('/business', businessRouter);
  v1.use('/products', productsRouter);
  v1.use('/ai', aiRouter);
  v1.use('/contents', contentsRouter);
  v1.use('/design-templates', designTemplatesRouter);
  v1.use('/designs', designsRouter);
  v1.use('/planner', plannerRouter);
  v1.use('/analytics', analyticsRouter);
  v1.use('/admin', adminRouter);

  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
