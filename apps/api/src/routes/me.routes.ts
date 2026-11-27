import { ERROR_CODES } from '@dagangai/shared';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import {
  calculateBusinessCompleteness,
  type BusinessRow,
} from '../lib/businessCompleteness.js';
import { AppError } from '../lib/errors.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const meRouter = Router();
meRouter.use(authenticate);

const updateMeSchema = z.object({
  full_name: z
    .string({ required_error: 'Nama lengkap wajib diisi.' })
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter.')
    .max(100, 'Nama lengkap maksimal 100 karakter.'),
});

const updatePasswordSchema = z.object({
  current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi.'),
  new_password: z
    .string()
    .min(8, 'Kata sandi baru minimal 8 karakter.')
    .max(72, 'Kata sandi baru maksimal 72 karakter.'),
});

function getNextWibMidnightIso(): string {
  // 00:00 WIB = 17:00 UTC hari berjalan/berikutnya
  const now = new Date();
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibNow = new Date(now.getTime() + wibOffsetMs);
  const nextMidnightWib = Date.UTC(
    wibNow.getUTCFullYear(),
    wibNow.getUTCMonth(),
    wibNow.getUTCDate() + 1,
    0,
    0,
    0
  );
  return new Date(nextMidnightWib - wibOffsetMs).toISOString();
}

meRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.auth!.userId;

    const userRes = await pool.query<{
      id: string;
      full_name: string;
      email: string;
      role: string;
      status: string;
    }>('SELECT id, full_name, email, role, status FROM users WHERE id = $1', [userId]);

    if (userRes.rowCount === 0) {
      throw AppError.unauthorized();
    }
    const user = userRes.rows[0];

    const bizRes = await pool.query<BusinessRow>(
      'SELECT * FROM businesses WHERE owner_user_id = $1',
      [userId]
    );
    const biz = bizRes.rows[0] ?? null;

    const cfgRes = await pool.query<{ daily_credits_limit: number }>(
      'SELECT daily_credits_limit FROM system_ai_configs WHERE id = 1'
    );
    const dailyLimit = cfgRes.rows[0]?.daily_credits_limit ?? 30;

    const quotaRes = await pool.query<{ credits_used: number }>(
      `
      SELECT credits_used
      FROM user_daily_ai_quotas
      WHERE user_id = $1
        AND usage_date_wib = (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE
      `,
      [userId]
    );
    const creditsUsed = quotaRes.rows[0]?.credits_used ?? 0;

    sendSuccess(req, res, {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      has_business: Boolean(biz),
      business_summary: biz
        ? {
            id: biz.id,
            name: biz.name,
            category: biz.category,
            completeness_score: calculateBusinessCompleteness(biz).score,
          }
        : null,
      ai_quota: {
        daily_credits_limit: dailyLimit,
        daily_credits_used: creditsUsed,
        daily_credits_remaining: Math.max(0, dailyLimit - creditsUsed),
        reset_at: getNextWibMidnightIso(),
      },
    });
  } catch (err) {
    next(err);
  }
});

meRouter.patch('/', validateBody(updateMeSchema), async (req, res, next) => {
  try {
    const { full_name } = req.body as z.infer<typeof updateMeSchema>;
    const updated = await pool.query<{
      id: string;
      full_name: string;
      email: string;
      role: string;
      status: string;
    }>(
      `
      UPDATE users
      SET full_name = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, full_name, email, role, status
      `,
      [full_name, req.auth!.userId]
    );
    sendSuccess(req, res, updated.rows[0]);
  } catch (err) {
    next(err);
  }
});

meRouter.patch(
  '/password',
  validateBody(updatePasswordSchema),
  async (req, res, next) => {
    try {
      const { current_password, new_password } = req.body as z.infer<
        typeof updatePasswordSchema
      >;
      const userRes = await pool.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.auth!.userId]
      );
      if (userRes.rowCount === 0) {
        throw AppError.unauthorized();
      }
      const match = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
      if (!match) {
        throw new AppError(
          400,
          ERROR_CODES.INVALID_CURRENT_PASSWORD,
          'Kata sandi saat ini tidak sesuai.'
        );
      }

      const newHash = await bcrypt.hash(new_password, 12);
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, req.auth!.userId]
      );
      sendSuccess(req, res, { password_updated: true });
    } catch (err) {
      next(err);
    }
  }
);
