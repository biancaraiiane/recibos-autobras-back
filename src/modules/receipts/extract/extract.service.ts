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

// Prefixos operacionais/geográficos que aparecem antes do ano no título
// Ordem: mais longos primeiro para evitar match parcial ("sa" não engolir "satx")
const LOCATION_PREFIXES = ['san antonio', 'austin', 'satx', 'atx', 'sa'];

// Keywords base do serviço — mais específicos primeiro
const SERVICE_BASE_KEYWORDS = [
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

// Sufixos opcionais que seguem o keyword do serviço
const SERVICE_SUFFIXES = [
  ' no sensor',
  ' with sensor',
  ' w/sensor',
  ' w/ sensor',
  ' sensor',
];

// ── Normalização ───────────────────────────────────────────────────────────────

function normalizeLine(line: string): string {
  return line.replace(/[ \t]+/g, ' ').trim();
}

// ── Detecção de linha de título ────────────────────────────────────────────────

function hasYear(line: string): boolean {
  return /((?:19|20)\d{2})/.test(line);
}

function hasServiceKeyword(line: string): boolean {
  const lower = line.toLowerCase();
  return SERVICE_BASE_KEYWORDS.some((kw) => lower.includes(kw));
}

function findTitleLine(lines: string[]): string {
  // Prioridade 1: linha com ano + keyword de serviço
  for (const line of lines) {
    if (hasYear(line) && hasServiceKeyword(line)) return line;
  }
  // Prioridade 2: linha com ano seguida de linha com keyword de serviço
  for (let i = 0; i < lines.length - 1; i++) {
    if (hasYear(lines[i]) && hasServiceKeyword(lines[i + 1])) {
      return lines[i] + ' ' + lines[i + 1];
    }
  }
  // Prioridade 3: qualquer linha com ano
  for (const line of lines) {
    if (hasYear(line)) return line;
  }
  return lines[0] ?? '';
}

// ── Remoção de prefixo operacional ────────────────────────────────────────────

function removeLocationPrefix(line: string): string {
  const lower = line.toLowerCase();
  for (const prefix of LOCATION_PREFIXES) {
    // Só remove se o prefixo for seguido de espaço (evita match parcial em palavras)
    if (
      lower.startsWith(prefix) &&
      lower.length > prefix.length &&
      lower[prefix.length] === ' '
    ) {
      return line.slice(prefix.length).trim();
    }
  }
  return line;
}

// ── Extração de serviço com sufixo opcional ────────────────────────────────────

function extractServiceWithSuffix(text: string, kwStart: number, keyword: string): string {
  const afterKw = text.slice(kwStart + keyword.length);
  const lowerAfterKw = afterKw.toLowerCase();

  let suffix = '';
  for (const s of SERVICE_SUFFIXES) {
    if (lowerAfterKw.startsWith(s)) {
      suffix = afterKw.slice(0, s.length); // preserva casing original
      break;
    }
  }

  const raw = text.slice(kwStart, kwStart + keyword.length) + suffix;
  return capitalize(raw.trim());
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Extração de veículo + serviço da linha de título ─────────────────────────

function extractFromTitle(titleLine: string): { veiculo: string; descricao_servico: string } {
  if (!titleLine) return { veiculo: '', descricao_servico: '' };

  // Remove prefixo geográfico/operacional
  const cleanLine = removeLocationPrefix(titleLine);
  const lower = cleanLine.toLowerCase();

  // Localiza o ano
  const yearMatch = cleanLine.match(/((?:19|20)\d{2})/);

  if (!yearMatch) {
    // Sem ano: tenta identificar só o serviço
    for (const kw of SERVICE_BASE_KEYWORDS) {
      const idx = lower.indexOf(kw);
      if (idx !== -1) {
        return { veiculo: '', descricao_servico: extractServiceWithSuffix(cleanLine, idx, kw) };
      }
    }
    return { veiculo: '', descricao_servico: '' };
  }

  const yearStart = cleanLine.indexOf(yearMatch[1]);
  // Tudo a partir do ano: "2015 Ford Taurus Front windshield no sensor"
  const afterYear = cleanLine.slice(yearStart);
  const lowerAfter = afterYear.toLowerCase();

  // Encontra o keyword de serviço mais precoce dentro de afterYear
  let serviceStart = -1;
  let foundKeyword = '';
  for (const kw of SERVICE_BASE_KEYWORDS) {
    const idx = lowerAfter.indexOf(kw);
    if (idx !== -1 && (serviceStart === -1 || idx < serviceStart)) {
      serviceStart = idx;
      foundKeyword = kw;
    }
  }

  if (serviceStart > 0) {
    return {
      veiculo: afterYear.slice(0, serviceStart).trim(),
      descricao_servico: extractServiceWithSuffix(afterYear, serviceStart, foundKeyword),
    };
  }

  // Serviço não encontrado na linha: usa 3 palavras como veículo
  const vehicleWords = afterYear.trim().split(/\s+/).slice(0, 3);
  return { veiculo: vehicleWords.join(' '), descricao_servico: '' };
}

// ── Extração de VIN ───────────────────────────────────────────────────────────

function extractVin(text: string): string {
  // VIN padrão = 17 chars alfanuméricos; OCR pode retornar minúsculas
  const match = text.match(/\b[A-Za-z0-9]{17}\b/);
  return match ? match[0].toUpperCase() : '';
}

// ── Extração de valor principal ───────────────────────────────────────────────

function extractMainValue(text: string): number {
  // Captura $ (espaço opcional) + número
  // Lookbehind negativo: ignora quando precedido de letra (M$, P$)
  const regex = /(?<![A-Za-z])\$\s*(\d+(?:\.\d{1,2})?)/g;
  const values: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    values.push(parseFloat(m[1]));
  }
  if (values.length === 0) return 0;
  // Maior valor standalone = preço principal do serviço
  return Math.max(...values);
}

// ── Função principal ───────────────────────────────────────────────────────────

export async function extractFromImage(fileBuffer: Buffer): Promise<ExtractResult> {
  let worker;

  try {
    worker = await createWorker('eng');
  } catch {
    throw new AppError('Falha ao inicializar OCR. Tente novamente.', 500);
  }

  try {
    const { data } = await worker.recognize(fileBuffer);
    const rawText = data.text.trim();

    console.log('[OCR RAW TEXT]', rawText);

    if (!rawText) {
      const item = emptyItem();
      console.log('[OCR PARSED ITEM]', item);
      return { rawText: '', items: [item] };
    }

    const lines = rawText
      .split('\n')
      .map(normalizeLine)
      .filter(Boolean);

    const titleLine = findTitleLine(lines);
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

    console.log('[OCR PARSED ITEM]', item);

    return { rawText, items: [item] };
  } catch (err) {
    if (err instanceof AppError) throw err;
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
