'use client';

/**
 * The one "ink stamp" visual, reused everywhere a booth's collected stamp
 * shows up — the passport page's meter, the checkpoint success moment, the
 * Passport share card (canvas version in shareCard.ts mirrors this same
 * palette/rotation so a booth reads the same wherever it appears). A
 * booth's color/rotation is derived from its own id, not list position, so
 * the same booth always stamps the same way across the app.
 */

import React from 'react';

export const STAMP_COLORS = ['#293B9D', '#0e7a5f', '#9c3b17', '#6b3fa0'];
const ROTATIONS = [-5, 4, 3, -4, 5, -3, 4, -5];

export function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(h, 31) + value.charCodeAt(i)) >>> 0;
  return h;
}

export function facultyAbbr(faculty: string): string {
  return faculty.replace(/^Faculty of\s+/i, '');
}

interface BoothStampProps {
  faculty: string;
  name: string;
  /** Diameter in px. */
  size?: number;
  /** Stable per-booth key (e.g. checkpoint.id) driving color + rotation. */
  seed: string;
  /** Overrides the derived palette color — used for partner/bonus booths. */
  color?: string;
  filled?: boolean;
  placeholder?: string;
  className?: string;
  /** The empty-slot dashed ring needs a different contrast on a dark (ink)
   * background than on a light one — filled stamps use explicit brand
   * colors so they read fine on either and don't need this. */
  tone?: 'light' | 'dark';
}

export default function BoothStamp({
  faculty,
  size = 96,
  seed,
  color,
  filled = true,
  placeholder,
  className = '',
  tone = 'light',
}: BoothStampProps) {
  if (!filled) {
    const emptyStyle =
      tone === 'dark'
        ? { borderColor: 'rgba(250,248,245,0.3)', color: 'rgba(250,248,245,0.45)' }
        : { borderColor: 'rgba(15,23,42,0.22)', color: '#94a3b8' };
    return (
      <div
        style={{ width: size, height: size, borderColor: emptyStyle.borderColor }}
        className={`rounded-full border-2 border-dashed flex items-center justify-center shrink-0 ${className}`}
      >
        <span className="mono font-bold" style={{ fontSize: Math.max(9, size * 0.11), color: emptyStyle.color }}>
          {placeholder || '—'}
        </span>
      </div>
    );
  }

  const hash = hashSeed(seed);
  const ringColor = color || STAMP_COLORS[hash % STAMP_COLORS.length];
  const rotation = ROTATIONS[hash % ROTATIONS.length];

  return (
    <div
      style={{ width: size, height: size, transform: `rotate(${rotation}deg)`, borderColor: ringColor }}
      className={`relative rounded-full border-2 flex flex-col items-center justify-center text-center shrink-0 px-2 ${className}`}
    >
      <div
        className="absolute rounded-full border pointer-events-none"
        style={{ inset: Math.max(4, size * 0.08), borderColor: ringColor }}
        aria-hidden="true"
      />
      <span
        className="display leading-[1.05] line-clamp-3"
        style={{ color: ringColor, fontSize: Math.max(9, size * 0.115) }}
      >
        {facultyAbbr(faculty)}
      </span>
    </div>
  );
}
