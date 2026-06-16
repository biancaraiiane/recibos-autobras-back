import { supabase } from '../../config/supabase';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import { generateReceiptPDF } from './pdf/receipt.pdf';
import type { CreateReceiptInput, ListReceiptsQuery } from './receipts.schema';
import type { ReciboComItens } from '../../shared/types';

// ── Cálculo de valores ─────────────────────────────────────────────────────────
function calcularItem(item: {
  quantidade: number;
  valor_unitario: number;
  tax_percent: number;
}) {
  const base = item.quantidade * item.valor_unitario;
  const tax_amount = base * (item.tax_percent / 100);
  const valor_total = base + tax_amount;
  return { tax_amount: Number(tax_amount.toFixed(2)), valor_total: Number(valor_total.toFixed(2)) };
}

// ── Criar recibo ───────────────────────────────────────────────────────────────
export async function createReceipt(data: CreateReceiptInput, userId: string): Promise<ReciboComItens> {
  const itensCalculados = data.itens.map((item) => {
    const { tax_amount, valor_total } = calcularItem(item);
    return { ...item, tax_amount, valor_total };
  });

  const subtotal = itensCalculados.reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0);
  const total_tax = itensCalculados.reduce((acc, i) => acc + i.tax_amount, 0);
  const total = itensCalculados.reduce((acc, i) => acc + i.valor_total, 0);

  const { data: recibo, error: reciboError } = await supabase
    .from('recibos')
    .insert({
      cliente_nome: data.cliente_nome,
      usuario_id: userId,
      subtotal: Number(subtotal.toFixed(2)),
      total_tax: Number(total_tax.toFixed(2)),
      total: Number(total.toFixed(2)),
      issue_date: data.issue_date ?? new Date().toISOString().slice(0, 10),
      due_date: data.due_date ?? null,
    })
    .select()
    .single();

  if (reciboError || !recibo) {
    throw new AppError(`Erro ao criar recibo: ${reciboError?.message}`, 500);
  }

  const itensInsert = itensCalculados.map((item) => ({ ...item, recibo_id: recibo.id }));
  const { data: itens, error: itensError } = await supabase
    .from('itens_recibo')
    .insert(itensInsert)
    .select();

  if (itensError || !itens) {
    throw new AppError('Erro ao salvar itens do recibo', 500);
  }

  return { ...recibo, itens };
}

// ── Gerar / Regenerar PDF ──────────────────────────────────────────────────────
export async function generatePDF(reciboId: string, userId: string): Promise<string> {
  const recibo = await getReceiptById(reciboId);

  const pdfBuffer = await generateReceiptPDF(recibo);

  const storagePath = `${userId}/${reciboId}.pdf`;

  const { error: storageError } = await supabase.storage
    .from(env.STORAGE_BUCKET_PDFS)
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (storageError) {
    throw new AppError(`Erro ao salvar PDF: ${storageError.message}`, 500);
  }

  const { data: urlData } = supabase.storage
    .from(env.STORAGE_BUCKET_PDFS)
    .getPublicUrl(storagePath);

  await supabase
    .from('recibos')
    .update({ pdf_url: urlData.publicUrl })
    .eq('id', reciboId);

  return urlData.publicUrl;
}

// ── Buscar recibo por ID ───────────────────────────────────────────────────────
export async function getReceiptById(reciboId: string): Promise<ReciboComItens> {
  const { data: recibo, error } = await supabase
    .from('recibos')
    .select('*, itens_recibo(*)')
    .eq('id', reciboId)
    .single();

  if (error || !recibo) {
    throw new AppError('Recibo não encontrado', 404);
  }

  return {
    ...recibo,
    itens: recibo.itens_recibo ?? [],
  };
}

// ── Listar recibos com paginação ───────────────────────────────────────────────
export async function listReceipts(query: ListReceiptsQuery, _requesterId: string) {
  const { page, limit, cliente_nome, numero_recibo, usuario_id, data_inicio, data_fim } = query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = supabase
    .from('recibos')
    .select(
      'id, numero_recibo, cliente_nome, usuario_id, pdf_url, subtotal, total_tax, total, status, issue_date, due_date, data_hora_geracao, criado_em, usuarios(nome, email)',
      { count: 'exact' },
    )
    .order('criado_em', { ascending: false })
    .range(from, to);

  if (cliente_nome) q = q.ilike('cliente_nome', `%${cliente_nome}%`);
  if (numero_recibo) q = q.eq('numero_recibo', numero_recibo);
  if (usuario_id) q = q.eq('usuario_id', usuario_id);
  if (data_inicio) q = q.gte('criado_em', data_inicio);
  if (data_fim) q = q.lte('criado_em', data_fim + 'T23:59:59');

  const { data, error, count } = await q;

  if (error) throw new AppError('Erro ao listar recibos', 500);

  return {
    data: data ?? [],
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  };
}

// ── Cancelar recibo ────────────────────────────────────────────────────────────
export async function cancelReceipt(reciboId: string): Promise<void> {
  const { data: recibo, error } = await supabase
    .from('recibos')
    .select('id, status')
    .eq('id', reciboId)
    .single();

  if (error || !recibo) throw new AppError('Recibo não encontrado', 404);
  if (recibo.status === 'CANCELADO') throw new AppError('Recibo já cancelado', 400);

  await supabase
    .from('recibos')
    .update({ status: 'CANCELADO' })
    .eq('id', reciboId);
}
