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

/** 17 numbered "Fac. booth" slots, 4 / 4 / 5 / 4 — positions 1-17. */
export const FACULTY_SLOTS: SlotLayout[] = [
  { position: 1, top: 35, left: 8.5, width: 13.5, height: 5 },
  { position: 2, top: 35, left: 25, width: 14, height: 5 },
  { position: 3, top: 35, left: 42, width: 14, height: 5 },
  { position: 4, top: 35, left: 59.5, width: 14, height: 5 },

  { position: 5, top: 46, left: 18.5, width: 13.5, height: 5 },
  { position: 6, top: 46, left: 38.5, width: 14, height: 5 },
  { position: 7, top: 46, left: 57, width: 14, height: 5 },
  { position: 8, top: 46, left: 75, width: 14, height: 5 },

  { position: 9, top: 57, left: 13.5, width: 12, height: 5 },
  { position: 10, top: 57, left: 27, width: 13, height: 5 },
  { position: 11, top: 57, left: 43.5, width: 14, height: 5 },
  { position: 12, top: 57, left: 61.5, width: 14, height: 5 },
  { position: 13, top: 57, left: 79.5, width: 14, height: 5 },

  { position: 14, top: 68, left: 7.5, width: 14, height: 5 },
  { position: 15, top: 68, left: 24, width: 14, height: 5 },
  { position: 16, top: 68, left: 41.5, width: 14, height: 5 },
  { position: 17, top: 68, left: 59.5, width: 14, height: 5 },
];

/** 7 numbered "External booth" slots, 4 / 3 — positions 18-24. */
export const EXTERNAL_SLOTS: SlotLayout[] = [
  { position: 18, top: 79, left: 8.5, width: 14, height: 5 },
  { position: 19, top: 79, left: 26.5, width: 14, height: 5 },
  { position: 20, top: 79, left: 42.5, width: 14, height: 5 },
  { position: 21, top: 79, left: 59.5, width: 14, height: 5 },

  { position: 22, top: 90, left: 8.5, width: 14, height: 5 },
  { position: 23, top: 90, left: 26.5, width: 14, height: 5 },
  { position: 24, top: 90, left: 42.5, width: 14, height: 5 },
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
  { top: 86, left: 12, width: 65, direction: 'left' },
];

export const VENUE_NAME = 'Marquee Tent, High Impact Research Building, Universiti Malaya';
