/**
 * Spatial layout of the venue floor plan — mirrors the printed plan's
 * actual positions (not just row counts), as percentages of a fixed
 * 4:3-ish canvas. Shared by the admin assignment editor and the public
 * map so they can never drift apart.
 */

export interface SlotLayout {
  position: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface LandmarkLayout {
  label: string;
  top: number;
  left: number;
  width: number;
  height: number;
  colorClass: string;
  rotate?: number;
  trapezoid?: boolean;
}

export interface WallLayout {
  top: number;
  left: number;
  width: number;
}

export interface WalkwayLayout {
  top: number;
  left: number;
  width: number;
  direction: 'left' | 'right';
}

// Shared left/right edge every booth row aligns to, regardless of how many
// slots it holds — rows with a different item count get a different slot
// width, not a different starting point, so columns don't zigzag row to row.
const ROW_LEFT = 7;
const ROW_RIGHT = 93;
const ROW_GAP = 2;

/** Builds one row of evenly-spaced slots sized to fill the shared
 * left/right span exactly, so every row's first slot starts at the same
 * left edge and its last slot ends at the same right edge. */
function row(positions: number[], top: number, height = 5): SlotLayout[] {
  const count = positions.length;
  const width = (ROW_RIGHT - ROW_LEFT - ROW_GAP * (count - 1)) / count;
  return positions.map((position, i) => ({ position, top, left: ROW_LEFT + i * (width + ROW_GAP), width, height }));
}

/** 17 numbered "Fac. booth" slots, 4 / 4 / 5 / 4 — positions 1-17. */
export const FACULTY_SLOTS: SlotLayout[] = [
  ...row([1, 2, 3, 4], 35),
  ...row([5, 6, 7, 8], 46),
  ...row([9, 10, 11, 12, 13], 57),
  ...row([14, 15, 16, 17], 68),
];

/** 7 numbered "External booth" slots, 4 / 3 — positions 18-24. */
export const EXTERNAL_SLOTS: SlotLayout[] = [
  ...row([18, 19, 20, 21], 79),
  ...row([22, 23, 24], 90),
];

export const FIRST_EXTERNAL_POSITION = 18;
export const TOTAL_POSITIONS = 24;

/** Non-interactive context shapes — stage, seating, corridors, services. */
export const LANDMARKS: LandmarkLayout[] = [
  { label: 'Backstage (Speakers)', top: 0, left: 11, width: 23, height: 4.5, colorClass: 'bg-slate-200/60' },
  { label: 'Stage & LED Screen', top: 1, left: 34.5, width: 30, height: 8, colorClass: 'bg-gold-400/50' },
  { label: 'Technical', top: 0, left: 65, width: 20, height: 4.5, colorClass: 'bg-slate-200/60' },
  { label: 'Fire Exit & VIP Lounge Entry', top: 5, left: 0, width: 4.5, height: 20, colorClass: 'bg-rose-100/60', rotate: -90 },
  { label: 'VIP Seating', top: 11, left: 35, width: 27, height: 6, colorClass: 'bg-orange-300/50', trapezoid: true },
  { label: 'Judges', top: 10, left: 69, width: 9, height: 6.5, colorClass: 'bg-slate-200/60', rotate: -25 },
  { label: 'General Audience Seating', top: 19, left: 21, width: 59, height: 10, colorClass: 'bg-orange-200/50' },
  { label: 'Ruang Berlegar 2', top: 45, left: 0, width: 4.5, height: 19, colorClass: 'bg-slate-100/70', rotate: -90 },
  { label: 'Ruang Berlegar 1', top: 64, left: 94, width: 4.5, height: 19, colorClass: 'bg-slate-100/70', rotate: -90 },
  { label: 'Photo Booth', top: 79, left: 0, width: 4.5, height: 16, colorClass: 'bg-rose-200/50', rotate: -90 },
  { label: 'Helpdesk', top: 96, left: 67, width: 14, height: 4, colorClass: 'bg-emerald-200/50' },
  { label: 'Registration', top: 90.5, left: 82.5, width: 17, height: 9.5, colorClass: 'bg-emerald-200/50' },
];

/** Wall dividers between seating and booth rows, and between booth rows. */
export const WALLS: WallLayout[] = [
  { top: 32.5, left: 6, width: 60 },
  { top: 53, left: 6, width: 88 },
  { top: 74, left: 6, width: 70 },
];

/** Direction-of-flow hints through the aisles between booth rows. */
export const WALKWAYS: WalkwayLayout[] = [
  { top: 41.5, left: 12, width: 76, direction: 'right' },
  { top: 63, left: 12, width: 76, direction: 'left' },
];

export const VENUE_NAME = 'Marquee Tent, High Impact Research Building, Universiti Malaya';

/** Palette tokens an admin can tag a booth with on the floor plan — shared
 * so the editor and the public map use the exact same swatches. Token is
 * what's persisted (`map_color`); the rest is presentation. */
export interface MapColorOption {
  token: string;
  label: string;
  swatchClass: string;
  slotClass: string;
}

export const MAP_COLORS: MapColorOption[] = [
  { token: 'brand', label: 'Brand', swatchClass: 'bg-brand-500', slotClass: 'bg-brand-100 border-brand-500' },
  { token: 'gold', label: 'Gold', swatchClass: 'bg-gold-500', slotClass: 'bg-gold-300/40 border-gold-500' },
  { token: 'emerald', label: 'Emerald', swatchClass: 'bg-emerald-500', slotClass: 'bg-emerald-100 border-emerald-500' },
  { token: 'rose', label: 'Rose', swatchClass: 'bg-rose-500', slotClass: 'bg-rose-100 border-rose-500' },
  { token: 'purple', label: 'Purple', swatchClass: 'bg-purple-500', slotClass: 'bg-purple-100 border-purple-500' },
  { token: 'slate', label: 'Slate', swatchClass: 'bg-slate-500', slotClass: 'bg-slate-100 border-slate-500' },
];

export function mapColorOption(token: string | null | undefined): MapColorOption | null {
  if (!token) return null;
  return MAP_COLORS.find(c => c.token === token) || null;
}
