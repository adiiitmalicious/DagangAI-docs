import { ERROR_CODES, type ErrorCode, type ErrorDetail } from '@dagangai/shared';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly details?: ErrorDetail[];

  constructor(
    statusCode: number,
    code: ErrorCode | string,
    message: string,
    details?: ErrorDetail[]
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static validation(message: string, details?: ErrorDetail[]): AppError {
    return new AppError(400, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = 'Sesi tidak valid atau telah kedaluwarsa.'): AppError {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Anda tidak memiliki akses ke sumber daya ini.'): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = 'Data tidak ditemukan.'): AppError {
    return new AppError(404, ERROR_CODES.RESOURCE_NOT_FOUND, message);
  }

  static conflict(code: ErrorCode, message: string): AppError {
    return new AppError(409, code, message);
  }
}
