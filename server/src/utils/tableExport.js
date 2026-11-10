import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ApiError } from './ApiError.js';

/**
 * Turns an on-screen list into an Excel or PDF download.
 * columns: [{ header, value: (row) => any, width, money? }] — width is in Excel characters
 * and also sets each column's share of the PDF page. Money columns get a total row.
 */

const totalsOf = (columns, rows) =>
  columns.map((c) => (c.money ? rows.reduce((sum, row) => sum + Number(c.value(row) || 0), 0) : null));

export async function tableToExcel(title, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));
  sheet.columns = columns.map((c) => ({ header: c.header, width: c.width }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) sheet.addRow(columns.map((c) => (c.money ? Number(c.value(row) || 0) : c.value(row) ?? '')));
  const totals = totalsOf(columns, rows);
  if (totals.some((t) => t !== null)) {
    const totalRow = sheet.addRow(totals.map((t, i) => (i === 0 ? 'TOTAL' : t ?? '')));
    totalRow.font = { bold: true };
  }
  columns.forEach((c, i) => {
    if (c.money) sheet.getColumn(i + 1).numFmt = '₹ #,##0.00';
  });
  return workbook.xlsx.writeBuffer();
}

export function tableToPdf(title, columns, rows) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 30;
    const pageWidth = doc.page.width - 60;
    const bottom = doc.page.height - 40;
    const unit = pageWidth / columns.reduce((sum, c) => sum + c.width, 0);
    const widths = columns.map((c) => c.width * unit);
    // Helvetica has no rupee glyph
    const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const drawRow = (cells, y, { bold = false, fill = null } = {}) => {
      if (fill) doc.rect(left, y - 3, pageWidth, 18).fill(fill);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(bold && fill === '#0f172a' ? '#ffffff' : '#0f172a');
      let x = left;
      cells.forEach((text, i) => {
        doc.text(String(text ?? ''), x + 3, y, { width: widths[i] - 6, height: 12, ellipsis: true, lineBreak: false, align: columns[i].money ? 'right' : 'left' });
        x += widths[i];
      });
    };

    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(title, left, 30);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text(`Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} • ${rows.length} records`);

    const header = () => drawRow(columns.map((c) => c.header), doc.y + 10, { bold: true, fill: '#0f172a' });
    header();
    let y = doc.y + 8;
    rows.forEach((row, index) => {
      if (y > bottom) {
        doc.addPage();
        doc.y = 20;
        header();
        y = doc.y + 8;
      }
      drawRow(columns.map((c) => (c.money ? money(c.value(row)) : c.value(row))), y, { fill: index % 2 ? null : '#f1f5f9' });
      y += 18;
    });

    const totals = totalsOf(columns, rows);
    if (totals.some((t) => t !== null)) {
      if (y > bottom) {
        doc.addPage();
        y = 30;
      }
      drawRow(totals.map((t, i) => (i === 0 ? 'TOTAL' : t === null ? '' : money(t))), y, { bold: true, fill: '#e2e8f0' });
    }
    doc.end();
  });
}

export async function sendTable(res, format, title, columns, rows) {
  if (!['excel', 'pdf'].includes(format)) throw ApiError.badRequest('Export format must be excel or pdf');
  const isPdf = format === 'pdf';
  const buffer = isPdf ? await tableToPdf(title, columns, rows) : await tableToExcel(title, columns, rows);
  const fileName = `${title.replace(/\W+/g, '_')}_${new Date().toISOString().slice(0, 10)}.${isPdf ? 'pdf' : 'xlsx'}`;
  res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(Buffer.from(buffer));
}
