'use client';

import React, { useCallback, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, ArrowLeftRight, Move, Eye, EyeOff } from 'lucide-react';
import {
  FACULTY_SLOTS,
  EXTERNAL_SLOTS,
  LANDMARKS,
  WALLS,
  WALKWAYS,
  SlotLayout,
  LandmarkLayout,
} from '@/lib/floorplan';

const DEFAULT_SLOTS = [...FACULTY_SLOTS, ...EXTERNAL_SLOTS];

interface FloorPlanCanvasProps {
  renderSlot: (slot: SlotLayout) => React.ReactNode;
  /** Minimum pixel width before the canvas scrolls horizontally — keeps
   * slots legible on narrow screens instead of squishing text. */
  minWidth?: number;
  /** Positions to draw — defaults to the hand-tuned layout in floorplan.ts,
   * but a caller can pass admin-dragged (overridden) positions instead. */
  slots?: SlotLayout[];
  landmarks?: LandmarkLayout[];
  /** When true, every slot/landmark gets a drag handle that reports moves
   * in percentage coordinates (admin's "Edit layout" mode). */
  editable?: boolean;
  onMoveSlot?: (position: number, top: number, left: number) => void;
  onMoveLandmark?: (label: string, top: number, left: number) => void;
  /** Landmarks an admin has hidden from the public map — when provided
   * (admin only), every landmark gets a show/hide eye toggle and hidden
   * ones render dimmed instead of disappearing, so the admin can still
   * find and unhide them. The public map instead just omits hidden
   * landmarks from the `landmarks` array it passes in. */
  hiddenLandmarks?: Set<string>;
  onToggleLandmarkHidden?: (label: string) => void;
}

type DragTarget = { kind: 'slot'; key: number } | { kind: 'landmark'; key: string };

export default function FloorPlanCanvas({
  renderSlot,
  minWidth = 640,
  slots = DEFAULT_SLOTS,
  landmarks = LANDMARKS,
  editable = false,
  onMoveSlot,
  onMoveLandmark,
  hiddenLandmarks,
  onToggleLandmarkHidden,
}: FloorPlanCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    target: DragTarget;
    startX: number;
    startY: number;
    startTop: number;
    startLeft: number;
  } | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragState.current;
      const surface = surfaceRef.current;
      if (!drag || !surface) return;
      const rect = surface.getBoundingClientRect();
      const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
      const nextTop = Math.min(98, Math.max(0, drag.startTop + dyPct));
      const nextLeft = Math.min(98, Math.max(0, drag.startLeft + dxPct));
      if (drag.target.kind === 'slot') onMoveSlot?.(drag.target.key, nextTop, nextLeft);
      else onMoveLandmark?.(drag.target.key, nextTop, nextLeft);
    },
    [onMoveSlot, onMoveLandmark]
  );

  const stopDrag = useCallback(() => {
    dragState.current = null;
    setDraggingKey(null);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDrag);
  }, [handlePointerMove]);

  const startDrag = (target: DragTarget, top: number, left: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = { target, startX: e.clientX, startY: e.clientY, startTop: top, startLeft: left };
    setDraggingKey(target.kind === 'slot' ? `slot-${target.key}` : `landmark-${target.key}`);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDrag);
  };

  const dragHandle = (target: DragTarget, top: number, left: number) => (
    <button
      type="button"
      onPointerDown={startDrag(target, top, left)}
      aria-label="Drag to reposition"
      className={`absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full border-2 border-ink bg-gold-400 text-ink flex items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
        draggingKey === (target.kind === 'slot' ? `slot-${target.key}` : `landmark-${target.key}`) ? 'scale-110' : ''
      }`}
    >
      <Move className="w-2.5 h-2.5" aria-hidden="true" />
    </button>
  );

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
          ref={surfaceRef}
          className="relative w-full rounded-2xl border-2 border-ink bg-cream-50"
          style={{ aspectRatio: '4 / 3', minWidth }}
        >
        {landmarks.map(l => {
          const isHidden = Boolean(hiddenLandmarks?.has(l.label));
          return (
            <div
              key={l.label}
              className={`absolute flex items-center justify-center text-center rounded-md border-2 overflow-visible ${l.colorClass} ${
                isHidden ? 'border-dashed border-ink/10 opacity-40' : editable ? 'border-dashed border-brand-500/50' : 'border-ink/15'
              }`}
              style={{
                top: `${l.top}%`,
                left: `${l.left}%`,
                width: `${l.width}%`,
                height: `${l.height}%`,
                clipPath: l.trapezoid ? 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)' : undefined,
              }}
            >
              {editable && dragHandle({ kind: 'landmark', key: l.label }, l.top, l.left)}
              {onToggleLandmarkHidden && (
                <button
                  type="button"
                  onClick={() => onToggleLandmarkHidden(l.label)}
                  aria-label={isHidden ? `Show ${l.label} on the public map` : `Hide ${l.label} from the public map`}
                  title={isHidden ? 'Hidden from public map — click to show' : 'Hide from the public map'}
                  className="absolute -top-1.5 -left-1.5 z-20 w-4 h-4 rounded-full border-2 border-ink bg-white text-slate-500 hover:text-slate-700 flex items-center justify-center"
                >
                  {isHidden ? <EyeOff className="w-2.5 h-2.5" aria-hidden="true" /> : <Eye className="w-2.5 h-2.5" aria-hidden="true" />}
                </button>
              )}
              <span
                className="text-[6px] sm:text-[8px] font-extrabold uppercase tracking-wide text-ink/55 leading-[1.05] px-0.5 whitespace-nowrap"
                style={{ transform: l.rotate ? `rotate(${l.rotate}deg)` : undefined }}
              >
                {l.label}
              </span>
            </div>
          );
        })}

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

        {slots.map(slot => (
          <div
            key={slot.position}
            className="absolute overflow-visible"
            style={{ top: `${slot.top}%`, left: `${slot.left}%`, width: `${slot.width}%`, height: `${slot.height}%` }}
          >
            {editable && dragHandle({ kind: 'slot', key: slot.position }, slot.top, slot.left)}
            {renderSlot(slot)}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
