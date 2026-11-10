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
const NAME_BOX = { x: 648, yBaseline: 600, maxWidth: 1180 };
const NAME_FONT = '"Space Grotesk"';
const NAME_COLOR = '#ffffff';
const NAME_MAX_SIZE = 56;
const NAME_MIN_SIZE = 28;

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

  let size = NAME_MAX_SIZE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = NAME_COLOR;
  do {
    ctx.font = `700 ${size}px ${NAME_FONT}`;
    if (ctx.measureText(name).width <= NAME_BOX.maxWidth || size <= NAME_MIN_SIZE) break;
    size -= 2;
  } while (true);
  ctx.fillText(name, NAME_BOX.x, NAME_BOX.yBaseline);
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
