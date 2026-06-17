import { createWorker } from 'tesseract.js';
import { AppError } from '../../../shared/errors/AppError';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface ExtractedItem {
  descricao_servico: string;
  veiculo: string;
  vin: string;
  quantidade: number;
  valor_unitario: number;
  tax_percent: number;
  tax_amount: number;
  valor_total: number;
}

export interface ExtractResult {
  rawText: string;
  items: ExtractedItem[];
}

// ── Constantes ─────────────────────────────────────────────────────────────────

// Ordem importa: termos mais específicos primeiro para evitar match parcial prematuro
const SERVICE_KEYWORDS = [
  'front windshield',
  'rear windshield',
  'back glass',
  'door glass',
  'quarter glass',
  'vent glass',
  'windshield',
  'chip repair',
  'regulator',
];

// ── Extratores ─────────────────────────────────────────────────────────────────

function extractVin(text: string): string {
  // VIN: exatamente 17 caracteres alfanuméricos (sem I, O, Q no padrão real,
  // mas OCR pode introduzir ruído — validamos só o comprimento)
  const match = text.match(/\b[A-Za-z0-9]{17}\b/);
  return match ? match[0].toUpperCase() : '';
}

function extractMainValue(text: string): number {
  // Captura $NNN ou $NNN.NN que NÃO sejam precedidos por letra (ex: M$, P$)
  const regex = /(?<![A-Za-z])\$(\d+(?:\.\d{1,2})?)/g;
  const values: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    values.push(parseFloat(m[1]));
  }
  if (values.length === 0) return 0;
  // O maior valor standalone tende a ser o preço principal do serviço
  return Math.max(...values);
}

function extractFromTitle(line: string): { veiculo: string; descricao_servico: string } {
  // Localiza o ano (19xx ou 20xx) — marca o início do bloco veículo
  const yearMatch = line.match(/((?:19|20)\d{2})/);

  if (!yearMatch) {
    // Sem ano: tenta encontrar serviço diretamente na linha
    const lower = line.toLowerCase();
    for (const kw of SERVICE_KEYWORDS) {
      if (lower.includes(kw)) {
        return { veiculo: '', descricao_servico: capitalize(kw) };
      }
    }
    return { veiculo: '', descricao_servico: '' };
  }

  const yearStart = line.indexOf(yearMatch[1]);
  // Tudo a partir do ano: "2010 Subaru Legacy front windshield"
  const afterYear = line.slice(yearStart);
  const lower = afterYear.toLowerCase();

  // Acha o keyword de serviço mais precoce dentro de afterYear
  let serviceStart = -1;
  let foundKeyword = '';
  for (const kw of SERVICE_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx !== -1 && (serviceStart === -1 || idx < serviceStart)) {
      serviceStart = idx;
      foundKeyword = kw;
    }
  }

  if (serviceStart > 0) {
    // Veículo = tudo entre o ano e o serviço, sem espaços extras
    return {
      veiculo: afterYear.slice(0, serviceStart).trim(),
      descricao_servico: capitalize(foundKeyword),
    };
  }

  // Não achou serviço: assume as 3 primeiras palavras como veículo
  const vehicleWords = afterYear.trim().split(/\s+/).slice(0, 3);
  return { veiculo: vehicleWords.join(' '), descricao_servico: '' };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Função principal ───────────────────────────────────────────────────────────

export async function extractFromImage(fileBuffer: Buffer): Promise<ExtractResult> {
  let worker;

  try {
    worker = await createWorker('eng');
  } catch (err) {
    throw new AppError('Falha ao inicializar OCR. Tente novamente.', 500);
  }

  try {
    const { data } = await worker.recognize(fileBuffer);
    const rawText = data.text.trim();

    if (!rawText) {
      return {
        rawText: '',
        items: [emptyItem()],
      };
    }

    // Primeira linha não vazia costuma ser o título do serviço
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const titleLine = lines[0] ?? '';

    const { veiculo, descricao_servico } = extractFromTitle(titleLine);
    const vin = extractVin(rawText);
    const valor_unitario = extractMainValue(rawText);

    const item: ExtractedItem = {
      descricao_servico,
      veiculo,
      vin,
      quantidade: 1,
      valor_unitario,
      tax_percent: 0,
      tax_amount: 0,
      valor_total: valor_unitario,
    };

    return { rawText, items: [item] };
  } catch (err) {
    throw new AppError('Erro ao processar imagem com OCR.', 500);
  } finally {
    await worker.terminate();
  }
}

function emptyItem(): ExtractedItem {
  return {
    descricao_servico: '',
    veiculo: '',
    vin: '',
    quantidade: 1,
    valor_unitario: 0,
    tax_percent: 0,
    tax_amount: 0,
    valor_total: 0,
  };
}
