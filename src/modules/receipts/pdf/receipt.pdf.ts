import PDFDocument from 'pdfkit';
import type { ReciboComItens } from '../../../shared/types';

const COLORS = {
  primary: '#1a1a2e',
  accent: '#c8a951',
  lightGray: '#f5f5f5',
  mediumGray: '#cccccc',
  darkGray: '#555555',
  white: '#ffffff',
  black: '#000000',
};

function formatCurrency(value: number): string {
  return value.toFixed(2);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function generateReceiptPDF(recibo: ReciboComItens): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100;

    // ── CABEÇALHO ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 130).fill(COLORS.primary);

    // Logo placeholder (texto estilizado)
    doc
      .fillColor(COLORS.accent)
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('AUTOBRAS', 50, 35);

    doc
      .fillColor(COLORS.white)
      .fontSize(10)
      .font('Helvetica')
      .text('AUTO GLASS', 50, 68);

    // Título INVOICE
    doc
      .fillColor(COLORS.white)
      .fontSize(36)
      .font('Helvetica-Bold')
      .text('INVOICE', 0, 30, { align: 'right', width: doc.page.width - 50 });

    doc
      .fillColor(COLORS.accent)
      .fontSize(11)
      .font('Helvetica')
      .text('TAX INVOICE', 0, 72, { align: 'right', width: doc.page.width - 50 });

    // ── INFO DA EMPRESA ────────────────────────────────────────────────────────
    doc.fillColor(COLORS.black).fontSize(9).font('Helvetica');
    const companyY = 150;

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLORS.primary)
      .text('Autobras LLC', 50, companyY);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text('Henderson pass', 50, companyY + 16)
      .text('San Antonio, United States', 50, companyY + 28)
      .text('+1 210 589 0667', 50, companyY + 40);

    // ── INVOICE DETAILS (direita) ──────────────────────────────────────────────
    const rightCol = 370;
    const detailBoxY = companyY - 5;

    doc
      .rect(rightCol - 10, detailBoxY, 215, 75)
      .fillAndStroke(COLORS.lightGray, COLORS.mediumGray);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text('INVOICE NO.', rightCol, detailBoxY + 8)
      .text('ISSUE DATE', rightCol, detailBoxY + 26)
      .text('DUE DATE', rightCol, detailBoxY + 44);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.black)
      .text(`#${String(recibo.numero_recibo).padStart(5, '0')}`, rightCol + 100, detailBoxY + 8)
      .text(formatDate(recibo.issue_date), rightCol + 100, detailBoxY + 26)
      .text(recibo.due_date ? formatDate(recibo.due_date) : 'Upon Receipt', rightCol + 100, detailBoxY + 44);

    // ── BILL TO ────────────────────────────────────────────────────────────────
    const billY = companyY + 70;

    doc
      .rect(50, billY, 220, 58)
      .fillAndStroke(COLORS.lightGray, COLORS.mediumGray);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.accent)
      .text('BILL TO', 60, billY + 8);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.primary)
      .text(recibo.cliente_nome, 60, billY + 22);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text('United States', 60, billY + 36);

    // ── DIVISOR ────────────────────────────────────────────────────────────────
    const tableStartY = billY + 80;

    doc
      .moveTo(50, tableStartY - 10)
      .lineTo(doc.page.width - 50, tableStartY - 10)
      .strokeColor(COLORS.mediumGray)
      .lineWidth(0.5)
      .stroke();

    // ── CABEÇALHO DA TABELA ────────────────────────────────────────────────────
    const colWidths = {
      desc: pageWidth * 0.40,
      qty: pageWidth * 0.08,
      price: pageWidth * 0.17,
      tax: pageWidth * 0.13,
      amount: pageWidth * 0.17,
    };

    const cols = {
      desc: 50,
      qty: 50 + colWidths.desc,
      price: 50 + colWidths.desc + colWidths.qty,
      tax: 50 + colWidths.desc + colWidths.qty + colWidths.price,
      amount: 50 + colWidths.desc + colWidths.qty + colWidths.price + colWidths.tax,
    };

    const headerHeight = 22;
    doc
      .rect(50, tableStartY, pageWidth, headerHeight)
      .fill(COLORS.primary);

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.white);

    doc.text('DESCRIPTION', cols.desc + 4, tableStartY + 7, { width: colWidths.desc - 8 });
    doc.text('QTY', cols.qty + 2, tableStartY + 7, { width: colWidths.qty - 4, align: 'center' });
    doc.text('UNIT PRICE (USD)', cols.price + 2, tableStartY + 7, { width: colWidths.price - 4, align: 'right' });
    doc.text('TAX', cols.tax + 2, tableStartY + 7, { width: colWidths.tax - 4, align: 'right' });
    doc.text('AMOUNT (USD)', cols.amount + 2, tableStartY + 7, { width: colWidths.amount - 4, align: 'right' });

    // ── LINHAS DA TABELA ────────────────────────────────────────────────────────
    let currentY = tableStartY + headerHeight;
    let rowIndex = 0;

    for (const item of recibo.itens) {
      const isEven = rowIndex % 2 === 0;
      const lineHeight = item.veiculo || item.vin ? 38 : 22;

      doc
        .rect(50, currentY, pageWidth, lineHeight)
        .fill(isEven ? COLORS.white : COLORS.lightGray);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COLORS.primary)
        .text(item.descricao_servico, cols.desc + 4, currentY + 6, { width: colWidths.desc - 8 });

      if (item.veiculo) {
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(COLORS.darkGray)
          .text(item.veiculo, cols.desc + 4, currentY + 18, { width: colWidths.desc - 8 });
      }

      if (item.vin) {
        const vinY = item.veiculo ? currentY + 28 : currentY + 18;
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(COLORS.darkGray)
          .text(`VIN: ${item.vin}`, cols.desc + 4, vinY, { width: colWidths.desc - 8 });
      }

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(COLORS.black);

      doc.text(String(item.quantidade), cols.qty + 2, currentY + 6, { width: colWidths.qty - 4, align: 'center' });
      doc.text(`$${formatCurrency(item.valor_unitario)}`, cols.price + 2, currentY + 6, { width: colWidths.price - 4, align: 'right' });
      doc.text(`${Number(item.tax_percent).toFixed(2)}%`, cols.tax + 2, currentY + 6, { width: colWidths.tax - 4, align: 'right' });

      doc
        .font('Helvetica-Bold')
        .text(`$${formatCurrency(item.valor_total)}`, cols.amount + 2, currentY + 6, { width: colWidths.amount - 4, align: 'right' });

      // Linha separadora
      doc
        .moveTo(50, currentY + lineHeight)
        .lineTo(doc.page.width - 50, currentY + lineHeight)
        .strokeColor(COLORS.mediumGray)
        .lineWidth(0.3)
        .stroke();

      currentY += lineHeight;
      rowIndex++;
    }

    // ── TOTAIS ─────────────────────────────────────────────────────────────────
    const totalsX = cols.price;
    const totalsWidth = colWidths.price + colWidths.tax + colWidths.amount;
    currentY += 10;

    // Subtotal
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text('SUBTOTAL', totalsX, currentY, { width: totalsWidth - colWidths.amount - 4, align: 'right' })
      .font('Helvetica')
      .fillColor(COLORS.black)
      .text(`$${formatCurrency(recibo.subtotal)}`, cols.amount + 2, currentY, { width: colWidths.amount - 4, align: 'right' });

    currentY += 16;

    // TAX total
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text('TAX', totalsX, currentY, { width: totalsWidth - colWidths.amount - 4, align: 'right' })
      .fillColor(COLORS.black)
      .text(`$${formatCurrency(recibo.total_tax)}`, cols.amount + 2, currentY, { width: colWidths.amount - 4, align: 'right' });

    currentY += 8;

    // Linha antes do total
    doc
      .moveTo(totalsX, currentY)
      .lineTo(doc.page.width - 50, currentY)
      .strokeColor(COLORS.primary)
      .lineWidth(1)
      .stroke();

    currentY += 8;

    // TOTAL DUE
    doc
      .rect(totalsX, currentY, totalsWidth, 28)
      .fill(COLORS.primary);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.white)
      .text('TOTAL DUE (USD)', totalsX + 4, currentY + 8, { width: totalsWidth - colWidths.amount - 8, align: 'right' });

    doc
      .fillColor(COLORS.accent)
      .fontSize(12)
      .text(`$${formatCurrency(recibo.total)}`, cols.amount + 2, currentY + 7, { width: colWidths.amount - 4, align: 'right' });

    currentY += 50;

    // ── RODAPÉ ─────────────────────────────────────────────────────────────────
    doc
      .moveTo(50, currentY)
      .lineTo(doc.page.width - 50, currentY)
      .strokeColor(COLORS.mediumGray)
      .lineWidth(0.5)
      .stroke();

    currentY += 12;

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.primary)
      .text('★  Lifetime labor warranty', 50, currentY, { align: 'center', width: pageWidth });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.darkGray)
      .text('Thank you for choosing Autobras LLC — Auto Glass Specialists', 50, currentY + 16, {
        align: 'center',
        width: pageWidth,
      });

    doc.end();
  });
}
