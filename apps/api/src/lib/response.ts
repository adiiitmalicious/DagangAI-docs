import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ErrorDetail,
  PaginationMeta,
} from '@dagangai/shared';
import type { Request, Response } from 'express';

export function sendSuccess<T>(
  req: Request,
  res: Response,
  data: T,
  statusCode = 200,
  pagination?: PaginationMeta
): Response {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      request_id: req.requestId,
      timestamp: new Date().toISOString(),
      ...(pagination ? { pagination } : {}),
    },
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  req: Request,
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: ErrorDetail[]
): Response {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
    meta: {
      request_id: req.requestId,
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(payload);
}
