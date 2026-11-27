import { ERROR_CODES, type UserRole } from '@dagangai/shared';
import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/jwt.js';

export interface AuthContext {
  userId: string;
  role: UserRole;
  email: string;
  businessId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Token autentikasi tidak ditemukan.');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw AppError.unauthorized('Token autentikasi tidak valid.');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized('Sesi tidak valid atau telah kedaluwarsa.');
    }

    const userRes = await pool.query<{
      id: string;
      email: string;
      role: UserRole;
      status: string;
      business_id: string | null;
    }>(
      `
      SELECT u.id, u.email, u.role, u.status, b.id AS business_id
      FROM users u
      LEFT JOIN businesses b ON b.owner_user_id = u.id
      WHERE u.id = $1
      `,
      [payload.sub]
    );

    if (userRes.rowCount === 0) {
      throw AppError.unauthorized('Akun tidak ditemukan.');
    }

    const row = userRes.rows[0];
    if (row.status === 'suspended') {
      throw new AppError(
        403,
        ERROR_CODES.ACCOUNT_SUSPENDED,
        'Akun Anda sedang ditangguhkan oleh admin. Hubungi dukungan untuk informasi lanjut.'
      );
    }

    req.auth = {
      userId: row.id,
      role: row.role,
      email: row.email,
      businessId: row.business_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(AppError.unauthorized());
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      next(AppError.forbidden('Peran akun Anda tidak memiliki akses ke fitur ini.'));
      return;
    }
    next();
  };
}

export function requireBusiness(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(AppError.unauthorized());
    return;
  }
  if (!req.auth.businessId) {
    next(
      new AppError(
        412,
        ERROR_CODES.BUSINESS_PROFILE_REQUIRED,
        'Lengkapi profil bisnis Anda terlebih dahulu sebelum menggunakan fitur ini.'
      )
    );
    return;
  }
  next();
}
