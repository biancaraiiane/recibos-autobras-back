export interface JwtPayload {
  sub: string;
  email: string;
  nome: string;
  cargo?: string;
}

export interface ItemRecibo {
  descricao_servico: string;
  veiculo?: string;
  vin?: string;
  quantidade: number;
  valor_unitario: number;
  tax_percent: number;
  tax_amount: number;
  valor_total: number;
}

export interface ReciboComItens {
  id: string;
  numero_recibo: number;
  cliente_nome: string;
  usuario_id: string;
  pdf_url: string | null;
  subtotal: number;
  total_tax: number;
  total: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  data_hora_geracao: string;
  criado_em: string;
  itens: ItemRecibo[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
