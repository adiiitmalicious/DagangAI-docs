import { ERROR_CODES } from '@dagangai/shared';
import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { AppError } from '../lib/errors.js';
import { MAX_IMAGE_SIZE_BYTES } from '../storage/validation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
});

export function singleImageUpload(fieldName = 'file') {
  const middleware = upload.single(fieldName);
  return (req: Request, res: Response, next: NextFunction): void => {
    middleware(req, res, (err: unknown) => {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(
            new AppError(
              413,
              ERROR_CODES.FILE_TOO_LARGE,
              'Ukuran berkas melebihi batas maksimal 5 MB.'
            )
          );
          return;
        }
        next(AppError.validation('Gagal memproses berkas unggahan.'));
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  };
}
