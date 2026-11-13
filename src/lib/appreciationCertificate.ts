'use client';

/**
 * Renders the "Certificate of Appreciation" design (exported from Canva as a
 * flat background) with the attendee's name overlaid. Canvas-based so the
 * same render feeds both the on-screen preview and the downloaded PDF —
 * they can never drift apart. Swap /public/certificate-bg.png and the
 * NAME_BOX box below when the final design (signatures, body copy) lands.
 */

import { jsPDF } from 'jspdf';

export const CERT_W = 1920;
export const CERT_H = 1080;

// Left-aligned box the name is drawn into — matches "PROUDLY PRESENTED TO"'s
// left edge, sitting between that line and the underline rule beneath it.
const NAME_BOX = { x: 648, yBaseline: 628, maxWidth: 1180 };
const NAME_FONT = '"Space Grotesk"';
const NAME_COLOR = '#ffffff';
const NAME_MAX_SIZE = 56;
const NAME_MIN_SIZE = 26;

/** Shrinks the name to fit on one line down to NAME_MIN_SIZE; if it's still
 * too wide even there (an unusually long full name), wraps it onto two
 * lines instead of letting it run off the card or overlap the seal. */
function fitNameLines(
  ctx: CanvasRenderingContext2D,
  name: string,
  maxWidth: number
): { lines: string[]; size: number } {
  let size = NAME_MAX_SIZE;
  while (size > NAME_MIN_SIZE) {
    ctx.font = `700 ${size}px ${NAME_FONT}`;
    if (ctx.measureText(name).width <= maxWidth) return { lines: [name], size };
    size -= 2;
  }

  const words = name.split(' ');
  if (words.length < 2) return { lines: [name], size: NAME_MIN_SIZE };

  // Split at whichever gap balances the two lines' widths best, measuring
  // at the max size so the choice doesn't depend on a size we haven't
  // picked yet.
  ctx.font = `700 ${NAME_MAX_SIZE}px ${NAME_FONT}`;
  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const w1 = ctx.measureText(words.slice(0, i).join(' ')).width;
    const w2 = ctx.measureText(words.slice(i).join(' ')).width;
    const diff = Math.abs(w1 - w2);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }
  const line1 = words.slice(0, bestSplit).join(' ');
  const line2 = words.slice(bestSplit).join(' ');

  size = Math.round(NAME_MAX_SIZE * 0.8);
  while (size > NAME_MIN_SIZE - 6) {
    ctx.font = `700 ${size}px ${NAME_FONT}`;
    if (ctx.measureText(line1).width <= maxWidth && ctx.measureText(line2).width <= maxWidth) break;
    size -= 2;
  }
  return { lines: [line1, line2], size };
}

let fontReady: Promise<void> | null = null;
function ensureFont(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (!fontReady) {
    fontReady = document.fonts
      .load(`700 56px ${NAME_FONT}`)
      .then(() => document.fonts.ready)
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontReady;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderAppreciationCertificate(name: string, canvas: HTMLCanvasElement): Promise<void> {
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  await ensureFont();
  const bg = await loadImage('/certificate-bg.png');
  ctx.clearRect(0, 0, CERT_W, CERT_H);
  if (bg) {
    ctx.drawImage(bg, 0, 0, CERT_W, CERT_H);
  } else {
    ctx.fillStyle = '#293B9D';
    ctx.fillRect(0, 0, CERT_W, CERT_H);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = NAME_COLOR;
  const { lines, size } = fitNameLines(ctx, name, NAME_BOX.maxWidth);
  ctx.font = `700 ${size}px ${NAME_FONT}`;
  if (lines.length === 1) {
    ctx.fillText(lines[0], NAME_BOX.x, NAME_BOX.yBaseline);
  } else {
    const lineGap = size * 1.08;
    const firstBaseline = NAME_BOX.yBaseline - lineGap * 0.55;
    ctx.fillText(lines[0], NAME_BOX.x, firstBaseline);
    ctx.fillText(lines[1], NAME_BOX.x, firstBaseline + lineGap);
  }
}

export function certificateCanvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png', 0.95));
}

export function generateAppreciationCertificatePdf(canvas: HTMLCanvasElement): jsPDF {
  const doc = new jsPDF({ unit: 'px', format: [CERT_W, CERT_H], orientation: 'landscape' });
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, CERT_W, CERT_H);
  return doc;
}

export function appreciationCertificateFileName(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'passport';
  return `mindswap-certificate-${slug}.pdf`;
}
