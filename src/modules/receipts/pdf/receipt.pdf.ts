import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import type { ReciboComItens } from '../../../shared/types';

const C = {
  navy: '#24364f',
  blue: '#4f98d8',
  dark: '#1f2937',
  gray: '#64748b',
  lightGray: '#d9e1ec',
  white: '#ffffff',
};

function getLogoPath() {
  const possiblePaths = [
    path.join(process.cwd(), 'src/assets/logo-autobras.png'),
    path.join(process.cwd(), 'dist/assets/logo-autobras.png'),
    path.join(__dirname, '../../../assets/logo-autobras.png'),
  ];

  return possiblePaths.find((p) => fs.existsSync(p));
}

function fmt(value: number): string {
  return Number(value || 0).toFixed(2);
}

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return '';

  const d = new Date(dateStr + 'T00:00:00');

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function drawRightText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  options?: PDFKit.Mixins.TextOptions,
) {
  doc.text(text, x, y, {
    width,
    align: 'right',
    ...options,
  });
}

export function generateReceiptPDF(recibo: ReciboComItens): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const marginX = 50;
    const contentW = pageW - marginX * 2;

    // ─────────────────────────────────────────────
    // HEADER
    // ─────────────────────────────────────────────

    const logoPath = getLogoPath();

    if (logoPath) {
      doc.image(logoPath, marginX, 34, {
        width: 115,
      });
    } else {
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#0b4edb')
        .text('AUTOBRAS', marginX, 45);

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(C.gray)
        .text('AUTOGLASS REPLACEMENT', marginX, 70);
    }

    doc
      .font('Helvetica')
      .fontSize(34)
      .fillColor(C.dark)
      .text('RECEIPT', marginX, 30, {
        width: contentW,
        align: 'right',
      });

    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(C.gray)
      .text('TAX RECEIPT', marginX, 76, {
        width: contentW,
        align: 'right',
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.navy)
      .text('Autobras LLC', marginX, 110, {
        width: contentW,
        align: 'right',
      });

    doc.font('Helvetica').fontSize(11).fillColor(C.navy);

    drawRightText(doc, 'Henderson pass', marginX, 128, contentW);
    drawRightText(doc, 'San Antonio', marginX, 146, contentW);
    drawRightText(doc, 'United States', marginX, 164, contentW);
    drawRightText(doc, '+1 210 589 0667', marginX, 198, contentW);

    // ─────────────────────────────────────────────
    // BILL TO + RECEIPT INFO
    // ─────────────────────────────────────────────

    const infoY = 250;

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(C.gray)
      .text('BILL TO', marginX, infoY);

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(C.dark)
      .text(recibo.cliente_nome, marginX, infoY + 22);

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(C.gray)
      .text('United States', marginX, infoY + 40);

    const labelX = 310;
    const valueX = 445;
    const infoW = pageW - marginX - valueX;

    doc.font('Helvetica').fontSize(11).fillColor(C.gray);

    doc.text('Receipt Nº:', labelX, infoY);
    doc.text('Issue date:', labelX, infoY + 24);
    doc.text('Due date:', labelX, infoY + 48);

    doc
      .font('Helvetica-Oblique')
      .fontSize(10)
      .fillColor('#8a98ad')
      .text('Auto-generated', valueX, infoY, {
        width: infoW,
        align: 'right',
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.dark)
      .text(fmtDate(recibo.issue_date), valueX, infoY + 24, {
        width: infoW,
        align: 'right',
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.dark)
      .text(recibo.due_date ? fmtDate(recibo.due_date) : fmtDate(recibo.issue_date), valueX, infoY + 48, {
        width: infoW,
        align: 'right',
      });

    // Divider
    const dividerY = 340;

    doc
      .moveTo(marginX, dividerY)
      .lineTo(pageW - marginX, dividerY)
      .strokeColor(C.lightGray)
      .lineWidth(0.8)
      .stroke();

    // ─────────────────────────────────────────────
    // TABLE
    // ─────────────────────────────────────────────

    const tableY = 372;
    const headerH = 56;

    const colW = {
      desc: contentW * 0.47,
      qty: contentW * 0.10,
      price: contentW * 0.19,
      tax: contentW * 0.12,
      amount: contentW * 0.12,
    };

    const col = {
      desc: marginX,
      qty: marginX + colW.desc,
      price: marginX + colW.desc + colW.qty,
      tax: marginX + colW.desc + colW.qty + colW.price,
      amount: marginX + colW.desc + colW.qty + colW.price + colW.tax,
    };

    doc.rect(marginX, tableY, contentW, headerH).fill(C.blue);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white);

    doc.text('DESCRIPTION', col.desc + 12, tableY + 22, {
      width: colW.desc - 20,
    });

    doc.text('QTY', col.qty, tableY + 22, {
      width: colW.qty,
      align: 'center',
    });

    doc.text('UNIT PRICE\n(USD)', col.price, tableY + 14, {
      width: colW.price - 8,
      align: 'right',
    });

    doc.text('TAX', col.tax, tableY + 22, {
      width: colW.tax - 8,
      align: 'right',
    });

    doc.text('AMOUNT\n(USD)', col.amount, tableY + 14, {
      width: colW.amount - 12,
      align: 'right',
    });

    let rowY = tableY + headerH + 12;

    for (const item of recibo.itens) {
      const rowH = item.veiculo || item.vin ? 88 : 38;

      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(C.dark)
        .text(item.descricao_servico, col.desc + 12, rowY, {
          width: colW.desc - 20,
        });

      if (item.veiculo) {
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(C.gray)
          .text(item.veiculo, col.desc + 12, rowY + 18, {
            width: colW.desc - 20,
          });
      }

      if (item.vin) {
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor('#7c8ca5')
          .text(`Vin: ${item.vin}`, col.desc + 12, rowY + 36, {
            width: colW.desc - 20,
          });
      }

      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(C.dark)
        .text(String(item.quantidade), col.qty, rowY, {
          width: colW.qty,
          align: 'center',
        });

      doc.text(fmt(item.valor_unitario), col.price, rowY, {
        width: colW.price - 8,
        align: 'right',
      });

      const taxText =
        Number(item.tax_percent) > 0
          ? `${Number(item.tax_percent).toFixed(2)}%`
          : '—';

      doc.text(taxText, col.tax, rowY, {
        width: colW.tax - 8,
        align: 'right',
      });

      doc.text(fmt(item.valor_total), col.amount, rowY, {
        width: colW.amount - 12,
        align: 'right',
      });

      rowY += rowH;
    }

    // ─────────────────────────────────────────────
    // TOTAL
    // ─────────────────────────────────────────────

    rowY += 10;

    doc
      .moveTo(marginX, rowY)
      .lineTo(pageW - marginX, rowY)
      .strokeColor(C.dark)
      .lineWidth(1.5)
      .stroke();

    rowY += 22;

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(C.dark)
      .text('TOTAL DUE (USD)', marginX, rowY);

    doc
      .font('Helvetica-Bold')
      .fontSize(26)
      .fillColor(C.dark)
      .text(fmt(recibo.total), marginX, rowY - 4, {
        width: contentW,
        align: 'right',
      });

    rowY += 50;

    doc
      .moveTo(marginX, rowY)
      .lineTo(pageW - marginX, rowY)
      .strokeColor(C.lightGray)
      .lineWidth(0.8)
      .stroke();

    // ─────────────────────────────────────────────
    // FOOTER
    // ─────────────────────────────────────────────

    rowY += 24;

    doc
      .font('Helvetica-Oblique')
      .fontSize(10)
      .fillColor(C.gray)
      .text('Lifetime labor warranty', marginX, rowY);

    doc.end();
  });
}