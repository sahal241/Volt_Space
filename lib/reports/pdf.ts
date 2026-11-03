import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { EnergyReport } from './model.ts';
/** Server/client-safe PDF renderer. No remote resources or private signed URLs. */
export async function createReportPdf(report: EnergyReport) {
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(report.title);
  doc.setAuthor('VoltSpace AI');
  doc.setSubject('Household energy intelligence');
  const navy = rgb(0.055, 0.09, 0.12),
    mint = rgb(0.04, 0.48, 0.4),
    gray = rgb(0.38, 0.43, 0.47),
    pale = rgb(0.94, 0.97, 0.96);
  const text = (v: string) =>
    v
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/₹/g, 'INR ')
      .replace(/[–—]/g, '-')
      .replace(/[^\x20-\x7e]/g, '?');
  let page = doc.addPage([595.28, 841.89]),
    y = 0;
  const header = () => {
    page.drawRectangle({ x: 0, y: 764, width: 596, height: 78, color: navy });
    page.drawText('VOLTSPACE AI', { x: 38, y: 804, size: 17, font: bold, color: rgb(1, 1, 1) });
    page.drawText('Understand your power. Control your bill.', {
      x: 38,
      y: 785,
      size: 9,
      font,
      color: rgb(0.58, 0.87, 0.8),
    });
    y = 737;
  };
  header();
  const ensure = (height: number) => {
    if (y - height < 50) {
      page = doc.addPage([595.28, 841.89]);
      header();
    }
  };
  const wrap = (raw: string, width: number, size: number) => {
    const words = text(raw).split(/\s+/),
      lines: string[] = [];
    let line = '';
    for (const word of words) {
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        if (line) {
          lines.push(line);
          line = '';
        }
        let cut = 1;
        while (cut < rest.length && font.widthOfTextAtSize(rest.slice(0, cut + 1), size) <= width)
          cut++;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      const next = line ? `${line} ${rest}` : rest;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = rest;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  };
  const paragraph = (raw: string, size = 10, color = gray) => {
    for (const line of wrap(raw, 519, size)) {
      ensure(size + 8);
      page.drawText(line, { x: 38, y, size, font, color });
      y -= size + 5;
    }
    y -= 5;
  };
  paragraph(report.title, 22, navy);
  paragraph(`Reporting month: ${report.month} | ${report.source}`, 10);
  paragraph(`Generated: ${new Date(report.generated_at).toISOString().slice(0, 10)} (UTC)`, 9);
  for (const section of report.sections) {
    ensure(145);
    y -= 12;
    paragraph(section.title, 13, mint);
    const width = 519 / section.columns.length;
    const row = (cells: string[], isHeader = false) => {
      const lines = cells.map((c) => wrap(c, width - 14, 8.5)),
        height = Math.max(1, ...lines.map((l) => l.length)) * 12 + 16;
      ensure(height + 4);
      if (isHeader)
        page.drawRectangle({ x: 38, y: y - height + 7, width: 519, height, color: pale });
      cells.forEach((_, i) =>
        lines[i].forEach((line, n) =>
          page.drawText(line, {
            x: 45 + i * width,
            y: y - 6 - n * 12,
            size: 8.5,
            font: isHeader ? bold : font,
            color: isHeader ? mint : navy,
          }),
        ),
      );
      y -= height;
      page.drawLine({
        start: { x: 38, y: y + 7 },
        end: { x: 557, y: y + 7 },
        thickness: 0.4,
        color: rgb(0.85, 0.89, 0.88),
      });
    };
    row(section.columns, true);
    if (!section.rows.length) paragraph('No records available for this section.', 9);
    for (const cells of section.rows) {
      if (y - 100 < 50) {
        page = doc.addPage([595.28, 841.89]);
        header();
        row(section.columns, true);
      }
      row(cells);
    }
    y -= 12;
  }
  ensure(90);
  paragraph('Calculation assumptions & limitations', 13, mint);
  for (const note of report.notes) paragraph(note, 8.5);
  doc.getPages().forEach((p, i) => {
    p.drawLine({
      start: { x: 38, y: 37 },
      end: { x: 557, y: 37 },
      thickness: 0.5,
      color: rgb(0.8, 0.85, 0.83),
    });
    p.drawText(`VoltSpace AI | Private energy report | ${i + 1} / ${doc.getPageCount()}`, {
      x: 38,
      y: 23,
      size: 8,
      font,
      color: gray,
    });
  });
  return doc.save();
}
