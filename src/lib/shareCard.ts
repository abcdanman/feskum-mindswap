'use client';

/**
 * Canvas-rendered, shareable "passport progress" cards. Pure client-side —
 * no server round-trip, no extra dependency (html2canvas etc.) — drawn
 * directly at Instagram-Story resolution so a visitor can screenshot-free
 * share their progress. Three visually distinct templates, not just color
 * variants, since a single reused layout gets old fast across an event.
 */

export type ShareCardTemplateId = 'scoreboard' | 'ticket' | 'certificate';

export interface ShareCardTemplate {
  id: ShareCardTemplateId;
  label: string;
  blurb: string;
  swatch: string;
}

export const SHARE_CARD_TEMPLATES: ShareCardTemplate[] = [
  { id: 'scoreboard', label: 'Scoreboard', blurb: 'Bold stat card, your rank front and centre', swatch: '#293B9D' },
  { id: 'ticket', label: 'Ticket stub', blurb: 'Boarding-pass style with ink-stamped booths', swatch: '#FAF8F5' },
  { id: 'certificate', label: 'Certificate', blurb: 'Gold seal — best once your passport is complete', swatch: '#F59E0B' },
];

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
}

const W = 1080;
const H = 1920;
const INK = '#0f172a';
const CREAM = '#FAF8F5';
const CREAM_200 = '#EFECE6';
const BRAND = '#293B9D';
const BRAND_LIGHT = '#7486E8';
const GOLD = '#f59e0b';
const GOLD_LIGHT = '#fcd34d';
const EMERALD = '#10b981';

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

/** Draws the mark preserving its natural aspect ratio into a box of the
 * given height, anchored so `edgeX` stays put regardless of the computed
 * width — 'left' keeps the left edge fixed, 'right' the right edge,
 * 'center' centers on edgeX. */
function drawLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  edgeX: number,
  y: number,
  h: number,
  align: 'left' | 'right' | 'center'
) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return;
  const w = h * (img.naturalWidth / img.naturalHeight);
  const x = align === 'right' ? edgeX - w : align === 'center' ? edgeX - w / 2 : edgeX;
  ctx.drawImage(img, x, y, w, h);
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

function drawDotField(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, spacing: number, color: string, alpha: number, radius: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let yy = y; yy < y + h; yy += spacing) {
    for (let xx = x; xx < x + w; xx += spacing) {
      ctx.beginPath();
      ctx.arc(xx, yy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = rotation + (i * Math.PI) / points;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
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

function drawScoreboard(ctx: CanvasRenderingContext2D, data: ShareCardData, logo: HTMLImageElement | null) {
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, W, H);
  drawDotField(ctx, 0, 0, W, H, 42, '#ffffff', 0.06, 2.5);

  // Frame
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 10;
  roundRect(ctx, 36, 36, W - 72, H - 72, 44);
  ctx.stroke();

  // Header
  ctx.textAlign = 'left';
  ctx.fillStyle = BRAND_LIGHT;
  ctx.font = `700 28px ${MONO_FONT}`;
  ctx.fillText('// LALUAN ASPIRASI', 90, 170);
  drawLogoSeal(ctx, logo, W - 170, 195, 160);

  ctx.fillStyle = CREAM;
  ctx.font = `900 72px ${DISPLAY_FONT}`;
  ctx.fillText('MINDSWAP', 90, 250);

  // Rotated "sticker" badge
  ctx.save();
  ctx.translate(W - 190, 360);
  ctx.rotate((-9 * Math.PI) / 180);
  ctx.fillStyle = data.isComplete ? GOLD : CREAM;
  roundRect(ctx, -120, -36, 240, 72, 16);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `700 26px ${MONO_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(data.isComplete ? 'COMPLETE ✓' : 'IN PROGRESS', 0, 9);
  ctx.restore();

  // Stamp meter grid geometry, computed up front so the whole block below
  // the header can be vertically centered in the space available instead
  // of always hugging the top — a low stamp count otherwise leaves the
  // bottom half of the card looking broken/empty.
  const slots = Math.min(data.threshold, 24);
  const cols = slots > 16 ? 8 : slots > 9 ? 6 : Math.max(slots, 1);
  const cell = 64;
  const gap = 14;
  const rows = Math.ceil(slots / cols);
  const gridW = cols * cell + (cols - 1) * gap;
  const startX = (W - gridW) / 2;

  const hasPill = Boolean(data.rank || data.points !== null);
  const naturalHeight = 440 /* number */ + 70 /* label gap */ + 40 + rows * (cell + gap) + (hasPill ? 150 : 40) + 90;
  const blockTop = 420;
  const blockBottom = FOOTER_TOP - 10;
  const shiftY = Math.max(0, Math.round((blockBottom - blockTop - naturalHeight) / 2));

  // Giant stamp count
  ctx.textAlign = 'center';
  ctx.fillStyle = CREAM;
  ctx.font = `900 440px ${DISPLAY_FONT}`;
  ctx.fillText(String(data.stamps), W / 2, 760 + shiftY);

  ctx.font = `700 42px ${MONO_FONT}`;
  ctx.fillStyle = BRAND_LIGHT;
  ctx.fillText(`OF ${data.threshold} BOOTHS STAMPED`, W / 2, 830 + shiftY);

  let startY = 900 + shiftY;
  for (let i = 0; i < slots; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = startX + col * (cell + gap);
    const y = startY + row * (cell + gap);
    const filled = i < data.stamps;
    ctx.fillStyle = filled ? EMERALD : 'rgba(255,255,255,0.12)';
    roundRect(ctx, x, y, cell, cell, 14);
    ctx.fill();
    if (filled) {
      ctx.strokeStyle = CREAM;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.22, y + cell * 0.52);
      ctx.lineTo(x + cell * 0.42, y + cell * 0.72);
      ctx.lineTo(x + cell * 0.8, y + cell * 0.28);
      ctx.stroke();
    }
  }
  startY += rows * (cell + gap) + 40;

  // Rank / points pill row
  if (data.rank || data.points !== null) {
    const pillY = startY + 20;
    ctx.fillStyle = GOLD;
    roundRect(ctx, W / 2 - 320, pillY, 640, 110, 28);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    if (data.rank) {
      ctx.font = `900 54px ${DISPLAY_FONT}`;
      ctx.fillText(`RANK #${data.rank}${data.totalRanked ? ` / ${data.totalRanked}` : ''}`, W / 2, pillY + 52);
    }
    if (data.points !== null) {
      ctx.font = `700 30px ${MONO_FONT}`;
      ctx.fillText(`${data.points} PTS${data.partnerStamps ? ` · +${data.partnerStamps} BONUS` : ''}`, W / 2, pillY + 92);
    }
    startY = pillY + 110;
  }

  // Name strip
  ctx.textAlign = 'center';
  ctx.fillStyle = CREAM;
  ctx.font = `700 40px ${BODY_FONT}`;
  const nameLine = truncate(ctx, data.username ? `@${data.username}` : data.name, W - 200);
  ctx.fillText(nameLine, W / 2, startY + 90);

  footer(ctx, 'rgba(250,248,245,0.9)', 'rgba(250,248,245,0.6)');
}

function drawTicket(ctx: CanvasRenderingContext2D, data: ShareCardData, logo: HTMLImageElement | null) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  const pad = 56;
  const cardY = 120;

  // Size the ticket to its actual content instead of a fixed tall box — a
  // low stamp count otherwise leaves a large dead white area at the
  // bottom, which reads as broken rather than intentional.
  const slots = Math.min(data.threshold, 20);
  const cols = 5;
  const cell = 108;
  const gap = 20;
  const gridRows = Math.ceil(slots / cols);
  const perfY = cardY + 300;
  const stampsY = perfY + 230;
  const gridTop = stampsY + 40;
  const gridBottom = gridTop + gridRows * (cell + gap) - gap;
  const hasStats = Boolean(data.rank || data.points !== null);
  const contentBottom = hasStats ? gridBottom + 30 + 104 : gridBottom;
  const cardH = Math.min(H - 240, Math.max(980, contentBottom - cardY + 90));

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, pad, cardY, W - pad * 2, cardH, 36);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  roundRect(ctx, pad, cardY, W - pad * 2, cardH, 36);
  ctx.stroke();

  // Top band
  ctx.save();
  roundRect(ctx, pad, cardY, W - pad * 2, 300, 36);
  ctx.clip();
  ctx.fillStyle = INK;
  ctx.fillRect(pad, cardY, W - pad * 2, 300);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = `700 26px ${MONO_FONT}`;
  ctx.fillText('ADMIT ONE · DIGITAL PASSPORT', pad + 48, cardY + 90);
  ctx.fillStyle = CREAM;
  ctx.font = `900 64px ${DISPLAY_FONT}`;
  ctx.fillText('MINDSWAP', pad + 48, cardY + 170);
  ctx.font = `900 64px ${DISPLAY_FONT}`;
  ctx.fillText('@ FESKUM 2026', pad + 48, cardY + 240);
  drawLogoSeal(ctx, logo, W - pad - 48 - 80, cardY + 108, 150);

  // Perforation
  ctx.save();
  ctx.setLineDash([2, 18]);
  ctx.lineWidth = 6;
  ctx.strokeStyle = CREAM_200;
  ctx.beginPath();
  ctx.moveTo(pad + 20, perfY);
  ctx.lineTo(W - pad - 20, perfY);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(pad, perfY, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W - pad, perfY, 26, 0, Math.PI * 2);
  ctx.fill();

  // Visitor block
  ctx.fillStyle = INK;
  ctx.font = `700 24px ${MONO_FONT}`;
  ctx.fillText('PASSENGER', pad + 48, perfY + 70);
  ctx.font = `900 54px ${DISPLAY_FONT}`;
  const nameLine = truncate(ctx, data.name || 'Visitor', W - pad * 2 - 96);
  ctx.fillText(nameLine, pad + 48, perfY + 130);
  if (data.username) {
    ctx.fillStyle = '#64748b';
    ctx.font = `700 30px ${BODY_FONT}`;
    ctx.fillText(`@${data.username}`, pad + 48, perfY + 172);
  }

  // Ink-stamped booth grid
  ctx.fillStyle = INK;
  ctx.font = `700 24px ${MONO_FONT}`;
  ctx.fillText(`${data.stamps} OF ${data.threshold} BOOTHS STAMPED`, pad + 48, stampsY);

  const gridW = cols * cell + (cols - 1) * gap;
  const startX = pad + ((W - pad * 2) - gridW) / 2;
  const startY = gridTop;
  const colors = [BRAND, EMERALD, GOLD, '#be185d', '#0891b2'];
  for (let i = 0; i < slots; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = startX + col * (cell + gap) + cell / 2;
    const y = startY + row * (cell + gap) + cell / 2;
    const filled = i < data.stamps;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((((i * 37) % 17) - 8) * (Math.PI / 180));
    ctx.lineWidth = 5;
    ctx.strokeStyle = filled ? colors[i % colors.length] : '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, 0, cell / 2 - 6, 0, Math.PI * 2);
    ctx.stroke();
    if (filled) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.font = `900 30px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('✓', 0, 12);
    } else {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `700 24px ${MONO_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), 0, 9);
    }
    ctx.restore();
  }

  const statsY = gridBottom + 30;

  if (hasStats) {
    ctx.strokeStyle = CREAM_200;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad + 48, statsY);
    ctx.lineTo(W - pad - 48, statsY);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = `700 22px ${MONO_FONT}`;
    ctx.fillText('RANK', pad + 48, statsY + 54);
    ctx.fillStyle = INK;
    ctx.font = `900 46px ${DISPLAY_FONT}`;
    ctx.fillText(data.rank ? `#${data.rank}` : '—', pad + 48, statsY + 104);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = `700 22px ${MONO_FONT}`;
    ctx.fillText('POINTS', W - pad - 48, statsY + 54);
    ctx.fillStyle = INK;
    ctx.font = `900 46px ${DISPLAY_FONT}`;
    ctx.fillText(String(data.points ?? 0), W - pad - 48, statsY + 104);
  }

  footer(ctx, '#64748b', '#94a3b8');
}

function drawCertificate(ctx: CanvasRenderingContext2D, data: ShareCardData, logo: HTMLImageElement | null) {
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, W, H);
  drawDotField(ctx, 0, 0, W, H, 46, INK, 0.07, 3);

  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  roundRect(ctx, 40, 40, W - 80, H - 80, 40);
  ctx.stroke();
  ctx.lineWidth = 3;
  roundRect(ctx, 64, 64, W - 128, H - 128, 28);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `700 28px ${MONO_FONT}`;
  ctx.fillText('CERTIFICATE OF COMPLETION', W / 2, 210);
  ctx.font = `900 64px ${DISPLAY_FONT}`;
  ctx.fillText('MINDSWAP @ FESKUM 2026', W / 2, 290);
  // A letterhead-style corner mark, not a second seal — the certificate
  // already has its own large medallion below for the stamp count, so a
  // centered brand seal here would just duplicate that circular shape.
  drawLogo(ctx, logo, W - 96, 96, 72, 'right');

  // Seal — vertically balance the whole seal+name block in the space
  // below the title, since a fixed position leaves a large empty gap
  // above the footer when there's no rank/points to show.
  const cx = W / 2;
  const rOuter = 300;
  const hasStats = Boolean(data.rank || data.points !== null);
  const naturalHeight = rOuter * 2 + 260 + 48 + (hasStats ? 140 : 40);
  const blockTop = 410;
  const blockBottom = FOOTER_TOP - 10;
  const shiftY = Math.max(0, Math.round((blockBottom - blockTop - naturalHeight) / 2));
  const cy = blockTop + rOuter + shiftY;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = GOLD_LIGHT;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter - 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter - 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = INK;
  drawStar(ctx, cx, cy - 70, 90, 38, 5);
  ctx.fill();

  ctx.font = `900 56px ${DISPLAY_FONT}`;
  ctx.fillText(data.isComplete ? 'ALL STAMPED' : `${data.stamps}/${data.threshold}`, cx, cy + 70);
  ctx.font = `700 26px ${MONO_FONT}`;
  ctx.fillText(data.isComplete ? 'PASSPORT COMPLETE' : 'BOOTHS COLLECTED', cx, cy + 112);
  ctx.restore();

  // Ribbon tails
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(cx - 140, cy + rOuter - 20);
  ctx.lineTo(cx - 70, cy + rOuter + 160);
  ctx.lineTo(cx - 20, cy + rOuter + 110);
  ctx.lineTo(cx - 40, cy + rOuter - 20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 140, cy + rOuter - 20);
  ctx.lineTo(cx + 70, cy + rOuter + 160);
  ctx.lineTo(cx + 20, cy + rOuter + 110);
  ctx.lineTo(cx + 40, cy + rOuter - 20);
  ctx.closePath();
  ctx.fill();

  // Name + credentials
  const infoY = cy + rOuter + 260;
  ctx.fillStyle = INK;
  ctx.font = `900 58px ${DISPLAY_FONT}`;
  ctx.fillText(truncate(ctx, data.name || 'Visitor', W - 200), cx, infoY);
  if (data.username) {
    ctx.font = `700 32px ${BODY_FONT}`;
    ctx.fillText(`@${data.username}`, cx, infoY + 48);
  }

  if (data.rank || data.points !== null) {
    ctx.save();
    ctx.translate(cx, infoY + 140);
    ctx.fillStyle = INK;
    roundRect(ctx, -300, -44, 600, 88, 24);
    ctx.fill();
    ctx.fillStyle = GOLD_LIGHT;
    ctx.font = `900 40px ${DISPLAY_FONT}`;
    const bits = [data.rank ? `RANK #${data.rank}` : null, data.points !== null ? `${data.points} PTS` : null].filter(Boolean);
    ctx.fillText(bits.join(' · '), 0, 14);
    ctx.restore();
  }

  footer(ctx, 'rgba(15,23,42,0.85)', 'rgba(15,23,42,0.6)');
}

export async function renderShareCard(templateId: ShareCardTemplateId, data: ShareCardData, canvas: HTMLCanvasElement): Promise<void> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  await ensureFonts();
  const logo = await loadImage('/mindswap-mark-navy.png');
  ctx.clearRect(0, 0, W, H);
  if (templateId === 'ticket') drawTicket(ctx, data, logo);
  else if (templateId === 'certificate') drawCertificate(ctx, data, logo);
  else drawScoreboard(ctx, data, logo);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png', 0.95));
}
