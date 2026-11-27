import crypto from 'node:crypto';
import type { UserRole } from '@dagangai/shared';
import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
}

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'dev-only-access-secret-change-me-32chars';

export const ACCESS_TOKEN_TTL_SECONDS = 3600; // 1 jam
export const REFRESH_TOKEN_TTL_DAYS = 14;
export const RESET_TOKEN_TTL_MINUTES = 30;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET) as jwt.JwtPayload;
  if (!decoded || typeof decoded.sub !== 'string' || typeof decoded.role !== 'string') {
    throw new Error('Invalid token payload');
  }
  return {
    sub: decoded.sub,
    role: decoded.role as UserRole,
    email: String(decoded.email ?? ''),
  };
}

export function generateOpaqueToken(prefix: 'rt' | 'rst'): string {
  return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
