'use client';

/**
 * A formal, print-ready certificate PDF — distinct from the Instagram-style
 * share card. Built with vector text/shapes (jsPDF) rather than a rasterized
 * canvas, so it stays crisp at any zoom/print size and keeps a small file
 * size — the point of a CV/portfolio artifact.
 */

import { jsPDF } from 'jspdf';

export interface PassportPdfBooth {
  name: string;
  faculty: string;
  visitedAt: string;
}

export interface PassportPdfData {
  name: string;
  username: string | null;
  stamps: number;
  threshold: number;
  totalBooths: number;
  rank: number | null;
  totalRanked: number | null;
  points: number | null;
  isComplete: boolean;
  booths: PassportPdfBooth[];
}

const INK = '#0f172a';
const BRAND = '#293B9D';
const GOLD = '#f59e0b';
const SLATE = '#64748b';
const CREAM = '#FAF8F5';

interface LoadedImage {
  dataUrl: string;
  aspect: number;
}

function loadImageDataUrl(src: string): Promise<LoadedImage | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), aspect: img.naturalWidth / img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export async function generatePassportPdf(data: PassportPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210;
  const H = 297;
  const margin = 14;

  doc.setFillColor(CREAM);
  doc.rect(0, 0, W, H, 'F');

  // Outer + inner border frame
  doc.setDrawColor(INK);
  doc.setLineWidth(1.4);
  doc.roundedRect(margin, margin, W - margin * 2, H - margin * 2, 4, 4, 'S');
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 4, margin + 4, W - (margin + 4) * 2, H - (margin + 4) * 2, 3, 3, 'S');

  const cx = W / 2;
  let y = margin + 20;

  // Mark-only (not the full wordmark lockup) — the title line right below
  // already spells out "MINDSWAP @ FESKUM 2026", so pairing it with just
  // the brand's navy mark reads cleaner than repeating the wordmark twice.
  const logo = await loadImageDataUrl('/mindswap-mark-navy.png');
  if (logo) {
    try {
      const logoH = 16;
      const logoW = logoH * logo.aspect;
      doc.addImage(logo.dataUrl, 'PNG', cx - logoW / 2, y - 6, logoW, logoH);
      y += 14;
    } catch {
      /* skip logo if it fails to embed */
    }
  }

  doc.setTextColor(SLATE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CERTIFICATE OF PARTICIPATION', cx, y, { align: 'center' });
  y += 10;

  doc.setTextColor(BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('MINDSWAP @ FESKUM 2026', cx, y, { align: 'center' });
  y += 7;

  doc.setTextColor(SLATE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Laluan Aspirasi — Innovation Passport Challenge', cx, y, { align: 'center' });
  y += 14;

  // The header above (logo/eyebrow/title/subtitle) stays anchored near the
  // top, but everything below it — badge, paragraph, stats, booth list —
  // is content-aware centered in the remaining space down to the footer.
  // Fixed positions here leave a large dead gap at the bottom for a
  // visitor with few stamps or no rank yet, which reads as broken rather
  // than intentional on a document meant for a CV/portfolio.
  const blockTop = y;
  const footerY = H - margin - 16;
  const blockBottom = footerY - 10;

  const badgeLabel = data.isComplete ? 'PASSPORT COMPLETE' : 'IN PROGRESS';
  const displayName = data.name || 'Visitor';
  const verb = data.isComplete ? 'successfully completed' : 'participated in';
  const paragraph =
    `This certifies that ${displayName}${data.username ? ` (@${data.username})` : ''} ${verb} the Innovation ` +
    `Passport Challenge, visiting ${data.stamps} of ${data.threshold} required faculty booths across the ` +
    `exhibition floor during MindSwap @ FESKUM 2026, held 13–14 November 2026 at Universiti Malaya.`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(paragraph, W - margin * 2 - 30);

  const shownBooths = data.booths.slice(0, 12);
  const boothsPerCol = Math.ceil(shownBooths.length / 2);
  const rowH = 6.2;
  const boothsHeight =
    shownBooths.length > 0 ? 8 + boothsPerCol * rowH + 10 + (data.booths.length > shownBooths.length ? 8 : 0) : 0;

  const naturalHeight = 16 + (lines.length * 5.6 + 10) + 30 + boothsHeight;
  const shiftY = Math.max(0, (blockBottom - blockTop - naturalHeight) / 2);
  y = blockTop + shiftY;

  // Status badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const badgeW = doc.getTextWidth(badgeLabel) + 14;
  doc.setFillColor(data.isComplete ? GOLD : INK);
  doc.roundedRect(cx - badgeW / 2, y - 5, badgeW, 8, 4, 4, 'F');
  doc.setTextColor(data.isComplete ? INK : CREAM);
  doc.text(badgeLabel, cx, y, { align: 'center' });
  y += 16;

  // Body paragraph
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(lines, cx, y, { align: 'center' });
  y += lines.length * 5.6 + 10;

  // Stats row
  const stats: { label: string; value: string }[] = [
    { label: 'BOOTHS VISITED', value: `${data.stamps} / ${data.threshold}` },
  ];
  if (data.rank) stats.push({ label: 'RANK', value: `#${data.rank}${data.totalRanked ? ` / ${data.totalRanked}` : ''}` });
  if (data.points !== null) stats.push({ label: 'POINTS', value: String(data.points) });

  const statBoxW = (W - margin * 2 - 16) / stats.length;
  const statY = y;
  stats.forEach((s, i) => {
    const boxX = margin + 16 + i * statBoxW;
    doc.setDrawColor(INK);
    doc.setLineWidth(0.4);
    doc.roundedRect(boxX, statY, statBoxW - 6, 20, 2, 2, 'S');
    doc.setTextColor(SLATE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(s.label, boxX + (statBoxW - 6) / 2, statY + 7, { align: 'center' });
    doc.setTextColor(BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(s.value, boxX + (statBoxW - 6) / 2, statY + 15.5, { align: 'center' });
  });
  y = statY + 30;

  // Visited booths list
  if (shownBooths.length > 0) {
    doc.setTextColor(INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BOOTHS STAMPED', margin + 16, y);
    y += 2;
    doc.setDrawColor(INK);
    doc.setLineWidth(0.3);
    doc.line(margin + 16, y, W - margin - 16, y);
    y += 6;

    const colW = (W - margin * 2 - 32) / 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    shownBooths.forEach((b, i) => {
      const col = Math.floor(i / boothsPerCol);
      const row = i % boothsPerCol;
      const bx = margin + 16 + col * colW;
      const by = y + row * rowH;
      doc.setTextColor(INK);
      doc.setFont('helvetica', 'bold');
      const name = b.name.length > 28 ? b.name.slice(0, 27) + '…' : b.name;
      doc.text(name, bx, by);
      doc.setTextColor(SLATE);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(b.visitedAt), bx + colW - 6, by, { align: 'right' });
    });
    y += boothsPerCol * rowH + 10;

    if (data.booths.length > shownBooths.length) {
      doc.setTextColor(SLATE);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(`+ ${data.booths.length - shownBooths.length} more`, margin + 16, y);
      y += 8;
    }
  }

  // Footer — signature + verification
  doc.setDrawColor(INK);
  doc.setLineWidth(0.3);
  doc.line(margin + 16, footerY, margin + 70, footerY);
  doc.setTextColor(SLATE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Organising Committee, FESKUM 2026', margin + 16, footerY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Issued ${formatDate(new Date().toISOString())}`, W - margin - 16, footerY + 5, { align: 'right' });

  doc.setTextColor(SLATE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('mindswap.space', cx, H - margin - 6, { align: 'center' });

  drawHighlightsPage(doc, W, H, margin);

  return doc;
}

const HIGHLIGHTS: { title: string; body: string }[] = [
  {
    title: 'Opening & Keynote',
    body: 'Day 1, 3:30 PM — the MindSwap Opening Ceremony and keynote address kick off two days of faculty showcases and talks.',
  },
  {
    title: 'UM Talks Competition',
    body: 'Fourteen students pitch across Round 1, the Semi-Finals, and a live Grand Final — a student speaking competition run alongside the exhibition.',
  },
  {
    title: 'Guest & Alumni Speakers',
    body: 'Sessions from WWF Malaysia, Teach For Malaysia, alumnus Mr Goh Chee Yong, and Day 2 closing speaker Dr Stefanie Pillai.',
  },
  {
    title: 'Closing Ceremony & Awards',
    body: 'Day 2, 12:45 PM — Best Faculty Booth, UM Talks Champion, and People’s Choice are announced at the Main Hall.',
  },
];

function drawHighlightsPage(doc: jsPDF, W: number, H: number, margin: number) {
  doc.addPage();
  const cx = W / 2;

  doc.setFillColor(CREAM);
  doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(INK);
  doc.setLineWidth(1.4);
  doc.roundedRect(margin, margin, W - margin * 2, H - margin * 2, 4, 4, 'S');
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 4, margin + 4, W - (margin + 4) * 2, H - (margin + 4) * 2, 3, 3, 'S');

  let y = margin + 22;
  doc.setTextColor(SLATE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EVENT HIGHLIGHTS', cx, y, { align: 'center' });
  y += 10;

  doc.setTextColor(BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('MindSwap @ FESKUM 2026', cx, y, { align: 'center' });
  y += 8;

  doc.setTextColor(SLATE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('13–14 November 2026 · Marquee Tent, High Impact Research Building · Universiti Malaya', cx, y, {
    align: 'center',
  });
  y += 7;
  doc.setLineWidth(0.3);
  doc.setDrawColor(INK);
  doc.line(margin + 16, y, W - margin - 16, y);
  y += 12;

  // About blurb
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const about = doc.splitTextToSize(
    'Laluan Aspirasi is MindSwap’s innovation passport challenge: explore every faculty booth across the exhibition floor, ' +
      'collect a stamp at each one, and unlock a reward at the HIR Helpdesk once your passport is complete.',
    W - margin * 2 - 32
  );
  doc.text(about, cx, y, { align: 'center' });
  y += about.length * 5.2 + 14;

  // Highlight cards
  const cardX = margin + 16;
  const cardW = W - margin * 2 - 32;
  HIGHLIGHTS.forEach(h => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.7);
    const bodyLines = doc.splitTextToSize(h.body, cardW - 26);
    const cardH = 12 + bodyLines.length * 4.6 + 6;

    doc.setDrawColor(INK);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX, y, cardW, cardH, 3, 3, 'S');

    doc.setFillColor(BRAND);
    doc.roundedRect(cardX, y, 7, cardH, 2, 2, 'F');

    doc.setTextColor(INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(h.title, cardX + 14, y + 10);

    doc.setTextColor(SLATE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.7);
    doc.text(bodyLines, cardX + 14, y + 17);

    y += cardH + 7;
  });

  // Footer
  doc.setTextColor(SLATE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('mindswap.space', cx, H - margin - 6, { align: 'center' });
}

export function passportPdfFileName(data: PassportPdfData): string {
  const base = (data.username || data.name || 'visitor').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `mindswap-passport-${base || 'visitor'}.pdf`;
}
