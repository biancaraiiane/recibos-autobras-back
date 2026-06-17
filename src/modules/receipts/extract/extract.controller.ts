import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import { extractFromImage } from './extract.service';

export async function handleExtractPrint(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      throw new AppError('Nenhuma imagem enviada. Use o campo "file" em multipart/form-data.', 400);
    }

    const result = await extractFromImage(file.buffer);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
