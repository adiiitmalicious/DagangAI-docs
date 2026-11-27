import { ERROR_CODES, type UserRole } from '@dagangai/shared';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  generateOpaqueToken,
  hashToken,
  REFRESH_TOKEN_TTL_DAYS,
  RESET_TOKEN_TTL_MINUTES,
  signAccessToken,
} from '../lib/jwt.js';
import { sendError, sendSuccess } from '../lib/response.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      req,
      res,
      429,
      ERROR_CODES.RATE_LIMITED,
      'Terlalu banyak percobaan autentikasi. Silakan tunggu 1 menit.'
    );
  },
});

const registerSchema = z.object({
  full_name: z
    .string({ required_error: 'Nama lengkap wajib diisi.' })
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter.')
    .max(100, 'Nama lengkap maksimal 100 karakter.'),
  email: z
    .string({ required_error: 'Email wajib diisi.' })
    .trim()
    .email('Format email tidak valid.')
    .max(255),
  password: z
    .string({ required_error: 'Kata sandi wajib diisi.' })
    .min(8, 'Kata sandi minimal 8 karakter.')
    .max(72, 'Kata sandi maksimal 72 karakter.'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Format email tidak valid.'),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, 'Token reset tidak valid.'),
  new_password: z
    .string()
    .min(8, 'Kata sandi baru minimal 8 karakter.')
    .max(72, 'Kata sandi baru maksimal 72 karakter.'),
});

async function issueTokens(
  user: { id: string; role: UserRole; email: string },
  req: { header: (name: string) => string | undefined; ip?: string }
) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });

  const refreshToken = generateOpaqueToken('rt');
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
    VALUES ($1, $2, $3, $4, $5::inet)
    `,
    [
      user.id,
      tokenHash,
      expiresAt,
      req.header('user-agent')?.slice(0, 300) ?? null,
      req.ip ?? null,
    ]
  );

  return {
    access_token: accessToken,
    token_type: 'Bearer' as const,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
  };
}

authRouter.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  async (req, res, next) => {
    try {
      const { full_name, password } = req.body as z.infer<typeof registerSchema>;
      const email = (req.body as z.infer<typeof registerSchema>).email.toLowerCase();

      const existing = await pool.query<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        throw AppError.conflict(
          ERROR_CODES.EMAIL_ALREADY_REGISTERED,
          'Email sudah terdaftar. Silakan masuk atau gunakan fitur lupa kata sandi.'
        );
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const inserted = await pool.query<{
        id: string;
        full_name: string;
        email: string;
        role: UserRole;
        status: string;
        created_at: Date;
      }>(
        `
        INSERT INTO users (full_name, email, password_hash, role, status)
        VALUES ($1, $2, $3, 'business_owner', 'active')
        RETURNING id, full_name, email, role, status, created_at
        `,
        [full_name, email, passwordHash]
      );

      const user = inserted.rows[0];
      const tokens = await issueTokens(user, req);

      sendSuccess(
        req,
        res,
        {
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            status: user.status,
            has_business: false,
            created_at: user.created_at.toISOString(),
          },
          tokens,
        },
        201
      );
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const userRes = await pool.query<{
        id: string;
        full_name: string;
        email: string;
        password_hash: string;
        role: UserRole;
        status: string;
        created_at: Date;
        business_id: string | null;
      }>(
        `
        SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.status, u.created_at,
               b.id AS business_id
        FROM users u
        LEFT JOIN businesses b ON b.owner_user_id = u.id
        WHERE LOWER(u.email) = LOWER($1)
        `,
        [email]
      );

      if (userRes.rowCount === 0) {
        throw new AppError(
          401,
          ERROR_CODES.INVALID_CREDENTIALS,
          'Email atau kata sandi salah.'
        );
      }

      const user = userRes.rows[0];
      const passwordOk = await bcrypt.compare(password, user.password_hash);
      if (!passwordOk) {
        throw new AppError(
          401,
          ERROR_CODES.INVALID_CREDENTIALS,
          'Email atau kata sandi salah.'
        );
      }

      if (user.status === 'suspended') {
        throw new AppError(
          403,
          ERROR_CODES.ACCOUNT_SUSPENDED,
          'Akun Anda sedang ditangguhkan oleh admin.'
        );
      }

      const tokens = await issueTokens(user, req);

      sendSuccess(req, res, {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          status: user.status,
          has_business: Boolean(user.business_id),
          created_at: user.created_at.toISOString(),
        },
        tokens,
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post('/refresh', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const rawToken =
      (typeof req.body?.refresh_token === 'string' && req.body.refresh_token.trim()) ||
      (typeof req.cookies?.refresh_token === 'string' && req.cookies.refresh_token.trim()) ||
      '';

    if (!rawToken) {
      throw new AppError(
        401,
        ERROR_CODES.INVALID_REFRESH_TOKEN,
        'Refresh token tidak ditemukan.'
      );
    }

    const tokenHash = hashToken(rawToken);
    await client.query('BEGIN');

    const tokenRes = await client.query<{
      id: string;
      user_id: string;
      replaced_by_token_id: string | null;
      expires_at: Date;
      revoked_at: Date | null;
      email: string;
      role: UserRole;
      status: string;
    }>(
      `
      SELECT rt.id, rt.user_id, rt.replaced_by_token_id, rt.expires_at, rt.revoked_at,
             u.email, u.role, u.status
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = $1
      FOR UPDATE
      `,
      [tokenHash]
    );

    if (tokenRes.rowCount === 0) {
      await client.query('ROLLBACK');
      throw new AppError(
        401,
        ERROR_CODES.INVALID_REFRESH_TOKEN,
        'Refresh token tidak valid.'
      );
    }

    const row = tokenRes.rows[0];

    // Deteksi token reuse: jika sudah pernah dirotasi, cabut seluruh sesi pengguna
    if (row.replaced_by_token_id !== null || row.revoked_at !== null) {
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [row.user_id]
      );
      await client.query('COMMIT');
      throw new AppError(
        401,
        ERROR_CODES.INVALID_REFRESH_TOKEN,
        'Sesi telah dicabut atau kedaluwarsa. Silakan masuk kembali.'
      );
    }

    if (row.expires_at.getTime() <= Date.now()) {
      await client.query('ROLLBACK');
      throw new AppError(
        401,
        ERROR_CODES.INVALID_REFRESH_TOKEN,
        'Refresh token telah kedaluwarsa. Silakan masuk kembali.'
      );
    }

    if (row.status === 'suspended') {
      await client.query('ROLLBACK');
      throw new AppError(
        403,
        ERROR_CODES.ACCOUNT_SUSPENDED,
        'Akun Anda sedang ditangguhkan oleh admin.'
      );
    }

    const newRefreshToken = generateOpaqueToken('rt');
    const newHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const inserted = await client.query<{ id: string }>(
      `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
      VALUES ($1, $2, $3, $4, $5::inet)
      RETURNING id
      `,
      [
        row.user_id,
        newHash,
        expiresAt,
        req.header('user-agent')?.slice(0, 300) ?? null,
        req.ip ?? null,
      ]
    );

    await client.query(
      'UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by_token_id = $1 WHERE id = $2',
      [inserted.rows[0].id, row.id]
    );

    await client.query('COMMIT');

    const accessToken = signAccessToken({
      sub: row.user_id,
      role: row.role,
      email: row.email,
    });

    sendSuccess(req, res, {
      tokens: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: newRefreshToken,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    const rawToken =
      (typeof req.body?.refresh_token === 'string' && req.body.refresh_token.trim()) ||
      (typeof req.cookies?.refresh_token === 'string' && req.cookies.refresh_token.trim()) ||
      '';

    if (rawToken) {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL',
        [req.auth!.userId, hashToken(rawToken)]
      );
    } else {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [req.auth!.userId]
      );
    }

    sendSuccess(req, res, { logged_out: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body as z.infer<typeof forgotPasswordSchema>;
      const userRes = await pool.query<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );

      if (userRes.rowCount && userRes.rowCount > 0) {
        const rawResetToken = generateOpaqueToken('rst');
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
        await pool.query(
          `
          INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
          `,
          [userRes.rows[0].id, hashToken(rawResetToken), expiresAt]
        );
        if (process.env.NODE_ENV !== 'production') {
          console.info(`[Auth Dev] Password reset token generated for ${email}: ${rawResetToken}`);
        }
      }

      // Respons generik anti-enumerasi
      sendSuccess(req, res, {
        message: 'Jika email terdaftar, tautan reset kata sandi telah dikirim.',
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { token, new_password } = req.body as z.infer<typeof resetPasswordSchema>;
      const tokenHash = hashToken(token);

      await client.query('BEGIN');
      const resetRes = await client.query<{
        id: string;
        user_id: string;
        expires_at: Date;
        used_at: Date | null;
      }>(
        `
        SELECT id, user_id, expires_at, used_at
        FROM password_reset_tokens
        WHERE token_hash = $1
        FOR UPDATE
        `,
        [tokenHash]
      );

      if (
        resetRes.rowCount === 0 ||
        resetRes.rows[0].used_at !== null ||
        resetRes.rows[0].expires_at.getTime() <= Date.now()
      ) {
        await client.query('ROLLBACK');
        throw new AppError(
          400,
          ERROR_CODES.INVALID_OR_EXPIRED_RESET_TOKEN,
          'Token reset kata sandi tidak valid atau sudah kedaluwarsa.'
        );
      }

      const passwordHash = await bcrypt.hash(new_password, 12);
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, resetRes.rows[0].user_id]
      );
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [resetRes.rows[0].id]
      );
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [resetRes.rows[0].user_id]
      );
      await client.query('COMMIT');

      sendSuccess(req, res, { password_reset: true });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);
