import { z } from 'zod';

export const itemReciboSchema = z.object({
  descricao_servico: z.string().min(1, 'Descrição obrigatória'),
  veiculo: z.string().optional(),
  vin: z.string().optional(),
  quantidade: z.number().positive().default(1),
  valor_unitario: z.number().nonnegative('Valor unitário deve ser >= 0'),
  tax_percent: z.number().min(0).max(100).default(0),
});

export const createReceiptSchema = z.object({
  cliente_nome: z.string().min(1, 'Nome do cliente obrigatório'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD').optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  itens: z.array(itemReciboSchema).min(1, 'Ao menos um item é obrigatório'),
});

export const listReceiptsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cliente_nome: z.string().optional(),
  numero_recibo: z.coerce.number().int().optional(),
  usuario_id: z.string().uuid().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
});

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
export type ItemReciboInput = z.infer<typeof itemReciboSchema>;
export type ListReceiptsQuery = z.infer<typeof listReceiptsSchema>;
