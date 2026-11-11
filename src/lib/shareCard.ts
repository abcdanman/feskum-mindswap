'use client';

/**
 * Canvas-rendered, shareable "passport progress" card. Pure client-side —
 * no server round-trip, no extra dependency (html2canvas etc.) — drawn
 * directly at Instagram-Story resolution so a visitor can screenshot-free
 * share their progress. One template, not a picker of several: the ink
 * cover + visa-page "Passport" look is also what the live passport page
 * and the checkpoint stamp moment use, so this is the one that matches.
 */

import { STAMP_COLORS, hashSeed } from '@/components/BoothStamp';

export interface ShareCardBooth {
  name: string;
  faculty: string;
  visitedAt: string;
}

export interface ShareCardData {
  name: string;
  username: string | null;
  stamps: number;
  threshold: number;
  partnerStamps: number;
  totalBooths: number;
  rank: number | null;
  totalRanked: number | null;
  points: number | null;
  isComplete: boolean;
  booths: ShareCardBooth[];
}

const W = 1080;
const H = 1920;
const INK = '#0f172a';
const CREAM = '#FAF8F5';
const CREAM_200 = '#EFECE6';
const BRAND = '#293B9D';

const DISPLAY_FONT = 'Anton';
const BODY_FONT = '"Space Grotesk"';
const MONO_FONT = '"Space Mono"';

let fontsReady: Promise<void> | null = null;
function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (!fontsReady) {
    fontsReady = Promise.all([
      document.fonts.load(`900 100px ${DISPLAY_FONT}`),
      document.fonts.load(`700 40px ${BODY_FONT}`),
      document.fonts.load(`400 40px ${BODY_FONT}`),
      document.fonts.load(`700 40px ${MONO_FONT}`),
    ])
      .then(() => document.fonts.ready)
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontsReady;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** A cream, ink-bordered "seal" chip with the navy mark centered inside —
 * the same sticker treatment (border-ink + flat fill) used for every other
 * badge in this design system, so the brand mark reads as a deliberate
 * seal on any background instead of a faint watermark that's easy to
 * miss against a busy or similarly-colored backdrop. */
function drawLogoSeal(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, diameter: number) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return;
  ctx.save();
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(4, diameter * 0.035);
  ctx.strokeStyle = INK;
  ctx.stroke();

  const h = diameter * 0.52;
  const w = h * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

const FOOTER_TOP = H - 150;

function footer(ctx: CanvasRenderingContext2D, color: string, dim: string) {
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `700 26px ${MONO_FONT}`;
  ctx.fillText('MINDSWAP @ FESKUM 2026', W / 2, H - 118);
  ctx.fillStyle = dim;
  ctx.font = `400 22px ${BODY_FONT}`;
  ctx.fillText('13–14 NOV · UNIVERSITI MALAYA · mindswap.space', W / 2, H - 80);
}

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function stampDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
}

function facultyAbbr(faculty: string): string {
  return faculty.replace(/^Faculty of\s+/i, '');
}

function drawPassport(ctx: CanvasRenderingContext2D, data: ShareCardData, logo: HTMLImageElement | null) {
  const GOLD_FOIL = '#d4a94e';
  const BRAND_DEEP = '#1c276b';
  const PAPER = CREAM;
  const PAPER_LINE = 'rgba(41,59,157,0.05)';

  // ---- cover ----
  const coverH = 600;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, coverH);
  ctx.strokeStyle = 'rgba(212,169,78,0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, W - 56, coverH - 56, 18);
  ctx.stroke();

  drawLogoSeal(ctx, logo, W / 2, 168, 150);
  ctx.strokeStyle = GOLD_FOIL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, 168, 90, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD_FOIL;
  ctx.font = `900 72px ${DISPLAY_FONT}`;
  ctx.fillText('MINDSWAP', W / 2, 330);
  ctx.font = `700 26px ${MONO_FONT}`;
  ctx.fillStyle = 'rgba(250,248,245,0.55)';
  ctx.fillText('INNOVATION PASSPORT · FESKUM 2026', W / 2, 372);

  ctx.strokeStyle = 'rgba(212,169,78,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 420);
  ctx.lineTo(W - 90, 420);
  ctx.stroke();

  const bioCols = [
    { label: 'HOLDER', value: truncate(ctx, data.name || 'Visitor', 280) },
    { label: 'STAMPS', value: `${data.stamps} / ${data.threshold}` },
    { label: 'HANDLE', value: data.username ? `@${data.username}` : '—' },
  ];
  const bioW = (W - 180) / 3;
  ctx.font = `700 24px ${MONO_FONT}`;
  bioCols.forEach((col, i) => {
    const x = 90 + bioW * i;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(250,248,245,0.5)';
    ctx.font = `700 22px ${MONO_FONT}`;
    ctx.fillText(col.label, x, 468);
    ctx.fillStyle = CREAM;
    ctx.font = `700 30px ${BODY_FONT}`;
    ctx.fillText(truncate(ctx, col.value, bioW - 20), x, 508);
  });

  // ---- perforation ----
  const perfY = coverH + 20;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, coverH, W, 40);
  ctx.fillStyle = INK;
  ctx.fillRect(0, coverH, W, 20);
  ctx.fillStyle = PAPER;
  for (let x = 50; x < W; x += 50) {
    ctx.beginPath();
    ctx.arc(x, coverH + 10, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- visa page ----
  const pageTop = coverH + 40;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, pageTop, W, H - pageTop);
  ctx.strokeStyle = PAPER_LINE;
  ctx.lineWidth = 1;
  for (let y = pageTop + 20; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const pad = 90;
  ctx.textAlign = 'left';
  ctx.fillStyle = BRAND_DEEP;
  ctx.font = `700 26px ${MONO_FONT}`;
  ctx.fillText('VISA PAGES', pad, pageTop + 76);
  ctx.textAlign = 'right';
  ctx.fillStyle = BRAND;
  ctx.font = `700 28px ${MONO_FONT}`;
  ctx.fillText(`${data.stamps} / ${data.threshold} STAMPED`, W - pad, pageTop + 76);

  const trackY = pageTop + 104;
  ctx.fillStyle = CREAM_200;
  roundRect(ctx, pad, trackY, W - pad * 2, 12, 6);
  ctx.fill();
  const pct = data.threshold > 0 ? Math.min(data.stamps / data.threshold, 1) : 0;
  if (pct > 0) {
    ctx.fillStyle = BRAND;
    roundRect(ctx, pad, trackY, (W - pad * 2) * pct, 12, 6);
    ctx.fill();
  }

  // Stamp grid — content-aware so a low threshold (or low stamp count)
  // doesn't leave a huge dead gap before the footer, same pattern as the
  // other templates' vertically-centered blocks.
  const slots = Math.min(data.threshold, 16);
  const cols = slots > 9 ? 4 : 2;
  const gridTop = trackY + 50;
  const footerTop = FOOTER_TOP - 20;
  const rows = Math.ceil(slots / cols);
  const gap = 28;
  const cell = Math.min(300, ((W - pad * 2) - (cols - 1) * gap) / cols, ((footerTop - gridTop) - (rows - 1) * gap) / rows);
  const gridW = cols * cell + (cols - 1) * gap;
  const startX = (W - gridW) / 2;
  const gridH = rows * cell + (rows - 1) * gap;
  const startY = gridTop + Math.max(0, (footerTop - gridTop - gridH) / 2);
  const rotations = [-5, 4, 3, -4, 5, -3, 4, -5];

  for (let i = 0; i < slots; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cx = startX + col * (cell + gap) + cell / 2;
    const cy = startY + row * (cell + gap) + cell / 2;
    const booth = data.booths[i];

    if (booth) {
      // Hashed on the booth's own name (not list position) so the same
      // booth always stamps the same color/rotation here and in the live
      // passport page's BoothStamp — a booth has one consistent "ink" look
      // across the whole app.
      const hash = hashSeed(booth.name);
      const color = STAMP_COLORS[hash % STAMP_COLORS.length];
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rotations[hash % rotations.length] * Math.PI) / 180);
      const rOuter = cell * 0.41;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, cell * 0.022);
      ctx.beginPath();
      ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, cell * 0.012);
      ctx.beginPath();
      ctx.arc(0, 0, rOuter + cell * 0.07, 0, Math.PI * 2);
      ctx.stroke();

      // Fixed, non-overlapping anchors (faculty caption near the top of the
      // ring, name block starting a clear gap below it) rather than
      // centering both around the middle — a 2-line name block centered on
      // its own would otherwise climb up into the caption above it.
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      const facSize = Math.max(13, Math.round(cell * 0.062));
      ctx.font = `700 ${facSize}px ${MONO_FONT}`;
      ctx.globalAlpha = 0.75;
      ctx.fillText(truncate(ctx, facultyAbbr(booth.faculty).toUpperCase(), rOuter * 1.35), 0, -rOuter * 0.56);
      ctx.globalAlpha = 1;

      const nameSize = Math.max(17, Math.round(cell * 0.108));
      ctx.font = `900 ${nameSize}px ${DISPLAY_FONT}`;
      const words = booth.name.split(' ');
      const lineBudget = rOuter * 1.5;
      const lines: string[] = [];
      let current = '';
      words.forEach(word => {
        const next = current ? `${current} ${word}` : word;
        if (ctx.measureText(next).width > lineBudget && current) {
          lines.push(current);
          current = word;
        } else {
          current = next;
        }
      });
      if (current) lines.push(current);
      const shown = lines.slice(0, 2);
      if (lines.length > shown.length) shown[shown.length - 1] += '…';
      const lineH = nameSize * 1.1;
      const nameTop = -rOuter * 0.14;
      shown.forEach((line, li) => {
        ctx.fillText(truncate(ctx, line, lineBudget), 0, nameTop + li * lineH + lineH * 0.78);
      });
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(15,23,42,0.4)';
      ctx.font = `700 ${Math.max(13, Math.round(cell * 0.065))}px ${MONO_FONT}`;
      ctx.fillText(stampDate(booth.visitedAt), cx, cy + cell / 2 + cell * 0.1);
    } else {
      ctx.strokeStyle = 'rgba(15,23,42,0.22)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      roundRect(ctx, cx - cell / 2, cy - cell / 2, cell, cell, 16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(15,23,42,0.35)';
      ctx.font = `700 ${Math.max(14, Math.round(cell * 0.08))}px ${MONO_FONT}`;
      ctx.fillText(`#${i + 1} OPEN`, cx, cy + cell * 0.04);
    }
  }

  // Machine-readable-zone style footer rule, then the usual footer text.
  ctx.strokeStyle = 'rgba(15,23,42,0.15)';
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 10]);
  ctx.beginPath();
  ctx.moveTo(pad, FOOTER_TOP + 6);
  ctx.lineTo(W - pad, FOOTER_TOP + 6);
  ctx.stroke();
  ctx.setLineDash([]);

  footer(ctx, '#64748b', '#94a3b8');
}

export async function renderShareCard(data: ShareCardData, canvas: HTMLCanvasElement): Promise<void> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  await ensureFonts();
  const logo = await loadImage('/mindswap-mark-navy.png');
  ctx.clearRect(0, 0, W, H);
  drawPassport(ctx, data, logo);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png', 0.95));
}
