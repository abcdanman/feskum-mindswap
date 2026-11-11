'use client';

import React from 'react';
import { ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { FACULTY_SLOTS, EXTERNAL_SLOTS, LANDMARKS, WALLS, WALKWAYS, SlotLayout } from '@/lib/floorplan';

interface FloorPlanCanvasProps {
  renderSlot: (slot: SlotLayout) => React.ReactNode;
  /** Minimum pixel width before the canvas scrolls horizontally — keeps
   * slots legible on narrow screens instead of squishing text. */
  minWidth?: number;
}

export default function FloorPlanCanvas({ renderSlot, minWidth = 640 }: FloorPlanCanvasProps) {
  return (
    <div>
      {/* Below `minWidth` the map scrolls sideways — without this hint that
         reads as the map being cut off rather than scrollable. Hidden once
         the viewport is wide enough that the map fits without scrolling
         (Tailwind's sm: breakpoint is also 640px, matching the default
         minWidth, so the two stay in sync). */}
      <p className="sm:hidden flex items-center justify-center gap-1.5 text-[10px] font-bold text-brand-600 pb-1.5" aria-hidden="true">
        <ArrowLeftRight className="w-3 h-3" />
        Scroll sideways to see the full map
      </p>
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="relative w-full rounded-2xl border-2 border-ink bg-cream-50"
          style={{ aspectRatio: '4 / 3', minWidth }}
        >
        {LANDMARKS.map(l => (
          <div
            key={l.label}
            className={`absolute flex items-center justify-center text-center rounded-md border-2 border-ink/15 overflow-hidden ${l.colorClass}`}
            style={{
              top: `${l.top}%`,
              left: `${l.left}%`,
              width: `${l.width}%`,
              height: `${l.height}%`,
              clipPath: l.trapezoid ? 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)' : undefined,
            }}
          >
            <span
              className="text-[6px] sm:text-[8px] font-extrabold uppercase tracking-wide text-ink/55 leading-[1.05] px-0.5 whitespace-nowrap"
              style={{ transform: l.rotate ? `rotate(${l.rotate}deg)` : undefined }}
            >
              {l.label}
            </span>
          </div>
        ))}

        {WALLS.map((w, i) => (
          <div
            key={i}
            className="absolute bg-ink/50 h-[2px] rounded-full"
            style={{ top: `${w.top}%`, left: `${w.left}%`, width: `${w.width}%` }}
            aria-hidden="true"
          />
        ))}

        {WALKWAYS.map((a, i) => (
          <div
            key={i}
            className="absolute flex items-center text-brand-500/60"
            style={{ top: `${a.top}%`, left: `${a.left}%`, width: `${a.width}%` }}
            aria-hidden="true"
          >
            {a.direction === 'left' && <ArrowLeft className="w-2.5 h-2.5 shrink-0" />}
            <div className="flex-1 border-t border-dashed border-current" />
            {a.direction === 'right' && <ArrowRight className="w-2.5 h-2.5 shrink-0" />}
          </div>
        ))}

        {[...FACULTY_SLOTS, ...EXTERNAL_SLOTS].map(slot => (
          <div
            key={slot.position}
            className="absolute"
            style={{ top: `${slot.top}%`, left: `${slot.left}%`, width: `${slot.width}%`, height: `${slot.height}%` }}
          >
            {renderSlot(slot)}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
