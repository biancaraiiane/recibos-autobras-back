import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AppError } from '../shared/errors/AppError';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 10;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Tipo não permitido: ${file.mimetype}. Use JPEG, PNG ou WebP.`));
    }
    cb(null, true);
  },
});
