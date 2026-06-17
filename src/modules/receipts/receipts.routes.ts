import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';
import {
  handleCreateReceipt,
  handleListReceipts,
  handleGetReceipt,
  handleGetPDF,
  handleGeneratePDF,
  handleCancelReceipt,
} from './receipts.controller';
import { handleExtractPrint } from './extract/extract.controller';

const router = Router();

router.use(authMiddleware);

// OCR — extrai dados de um print em memória, sem salvar nada
router.post('/extract-print', upload.single('file'), handleExtractPrint);

router.post('/', handleCreateReceipt);
router.get('/', handleListReceipts);
router.get('/:id', handleGetReceipt);
router.get('/:id/pdf', handleGetPDF);
router.post('/:id/generate-pdf', handleGeneratePDF);
router.delete('/:id', handleCancelReceipt);

export default router;
