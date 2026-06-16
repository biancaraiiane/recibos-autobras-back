import { Request, Response, NextFunction } from 'express';
import { createReceiptSchema, listReceiptsSchema } from './receipts.schema';
import {
  createReceipt,
  generatePDF,
  getReceiptById,
  listReceipts,
  cancelReceipt,
} from './receipts.service';

export async function handleCreateReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createReceiptSchema.parse(req.body);
    const recibo = await createReceipt(data, req.user!.sub);
    res.status(201).json({ status: 'success', data: recibo });
  } catch (err) {
    next(err);
  }
}

export async function handleListReceipts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listReceiptsSchema.parse(req.query);
    const result = await listReceipts(query, req.user!.sub);
    res.json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
}

export async function handleGetReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    const recibo = await getReceiptById(String(req.params['id']));
    res.json({ status: 'success', data: recibo });
  } catch (err) {
    next(err);
  }
}

export async function handleGetPDF(req: Request, res: Response, next: NextFunction) {
  try {
    const recibo = await getReceiptById(String(req.params['id']));
    if (!recibo.pdf_url) {
      res.status(404).json({
        status: 'error',
        message: 'PDF ainda não gerado. Use POST /receipts/:id/generate-pdf',
      });
      return;
    }
    res.redirect(recibo.pdf_url);
  } catch (err) {
    next(err);
  }
}

export async function handleGeneratePDF(req: Request, res: Response, next: NextFunction) {
  try {
    const pdfUrl = await generatePDF(String(req.params['id']), req.user!.sub);
    res.json({ status: 'success', data: { pdf_url: pdfUrl } });
  } catch (err) {
    next(err);
  }
}

export async function handleCancelReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    await cancelReceipt(String(req.params['id']));
    res.json({ status: 'success', message: 'Recibo cancelado com sucesso' });
  } catch (err) {
    next(err);
  }
}
