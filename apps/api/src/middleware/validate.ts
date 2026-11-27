import type { ErrorDetail } from '@dagangai/shared';
import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

function formatZodIssues(issues: Array<{ path: (string | number)[]; code: string; message: string }>): ErrorDetail[] {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : undefined,
    code: issue.code.toUpperCase(),
    message: issue.message,
  }));
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(
        AppError.validation(
          'Data yang dikirim tidak valid. Periksa kembali isian formulir Anda.',
          formatZodIssues(result.error.issues)
        )
      );
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(
        AppError.validation(
          'Parameter query tidak valid.',
          formatZodIssues(result.error.issues)
        )
      );
      return;
    }
    next();
  };
}
