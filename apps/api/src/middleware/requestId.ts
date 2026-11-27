import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const requestId =
    incoming && incoming.trim().length > 0 ? incoming.trim().slice(0, 64) : `req_${crypto.randomUUID()}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
