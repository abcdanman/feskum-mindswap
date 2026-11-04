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

function loadImageDataUrl(src: string): Promise<string | null> {
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
        resolve(canvas.toDataURL('image/png'));
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

  const logoData = await loadImageDataUrl('/mindswap-logo.png');
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', cx - 8, y - 6, 16, 16);
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
  doc.text('feskum-mindswap.vercel.app', cx, H - margin - 6, { align: 'center' });

  return doc;
}

export function passportPdfFileName(data: PassportPdfData): string {
  const base = (data.username || data.name || 'visitor').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `mindswap-passport-${base || 'visitor'}.pdf`;
}
