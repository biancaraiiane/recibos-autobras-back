import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  handleCreateReceipt,
  handleListReceipts,
  handleGetReceipt,
  handleGetPDF,
  handleGeneratePDF,
  handleCancelReceipt,
} from './receipts.controller';

const router = Router();

router.use(authMiddleware);

router.post('/', handleCreateReceipt);
router.get('/', handleListReceipts);
router.get('/:id', handleGetReceipt);
router.get('/:id/pdf', handleGetPDF);
router.post('/:id/generate-pdf', handleGeneratePDF);
router.delete('/:id', handleCancelReceipt);

export default router;
