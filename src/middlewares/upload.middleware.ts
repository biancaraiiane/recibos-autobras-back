import multer from 'multer';
import { AppError } from '../shared/errors/AppError';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 10;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new AppError(`Tipo não permitido: ${file.mimetype}. Use JPEG, PNG ou WebP.`, 415));
    }
    cb(null, true);
  },
});
