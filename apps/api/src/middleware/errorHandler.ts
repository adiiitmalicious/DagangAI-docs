import { ERROR_CODES } from '@dagangai/shared';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { sendError } from '../lib/response.js';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    req,
    res,
    404,
    ERROR_CODES.RESOURCE_NOT_FOUND,
    'Endpoint atau sumber daya tidak ditemukan.'
  );
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(req, res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join('.') : undefined,
      code: issue.code.toUpperCase(),
      message: issue.message,
    }));
    sendError(
      req,
      res,
      400,
      ERROR_CODES.VALIDATION_ERROR,
      'Data yang dikirim tidak valid. Periksa kembali isian formulir Anda.',
      details
    );
    return;
  }

  console.error(`[API Error] request_id=${req.requestId}`, err);
  sendError(
    req,
    res,
    500,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    'Terjadi kesalahan pada server. Silakan coba lagi beberapa saat lagi.'
  );
}
