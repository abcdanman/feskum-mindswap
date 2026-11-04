'use client';

import React from 'react';
import { Checkpoint } from '@/lib/types';
import { FIRST_EXTERNAL_POSITION, VENUE_NAME, SlotLayout } from '@/lib/floorplan';
import FloorPlanCanvas from './FloorPlanCanvas';
import { CheckCircle2, MapPin } from 'lucide-react';

interface FloorPlanMapProps {
  checkpoints: Checkpoint[];
  visitedIds?: Set<string>;
  lastCheckpointId?: string | null;
  onSelect?: (checkpoint: Checkpoint) => void;
  /** When a search/filter is active, booths outside it are dimmed rather
   * than removed — removing one would leave a gap in the real layout. */
  highlightedIds?: Set<string> | null;
  venue?: string;
}

export default function FloorPlanMap({
  checkpoints,
  visitedIds = new Set(),
  lastCheckpointId = null,
  onSelect,
  highlightedIds = null,
  venue = VENUE_NAME,
}: FloorPlanMapProps) {
  const byPosition = new Map<number, Checkpoint>();
  checkpoints.forEach(c => {
    if (c.map_label) byPosition.set(c.map_label, c);
  });
  const anyAssigned = byPosition.size > 0;

  const renderSlot = (slot: SlotLayout) => {
    const checkpoint = byPosition.get(slot.position);
    const isExternal = slot.position >= FIRST_EXTERNAL_POSITION;
    const displayNo = isExternal ? slot.position - FIRST_EXTERNAL_POSITION + 1 : slot.position;

    if (!checkpoint) {
      return (
        <div
          className="w-full h-full rounded-lg border-2 border-dashed border-ink/15 bg-white/40 flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-[8px] sm:text-[9px] font-bold text-slate-300">{isExternal ? `E${displayNo}` : `#${displayNo}`}</span>
        </div>
      );
    }

    const visited = visitedIds.has(checkpoint.id);
    const isHere = lastCheckpointId === checkpoint.id;
    const dimmed = highlightedIds ? !highlightedIds.has(checkpoint.id) : false;

    return (
      <button
        type="button"
        onClick={() => onSelect?.(checkpoint)}
        className={`relative w-full h-full rounded-lg border-2 border-ink px-1 py-0.5 flex flex-col items-center justify-center gap-0.5 text-center transition-all active:scale-95 overflow-hidden ${
          visited ? 'bg-emerald-500 text-white' : isExternal ? 'bg-gold-400/40 text-ink hover:bg-gold-400/60' : 'bg-white text-ink hover:bg-cream-100'
        } ${dimmed ? 'opacity-25' : ''}`}
        aria-label={`${checkpoint.name}${visited ? ' — stamped' : ''}${isHere ? ' — you were here' : ''}`}
      >
        {isHere && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-500 border-2 border-ink animate-pulse" aria-hidden="true" />
        )}
        {visited ? (
          <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
        ) : (
          <span className="text-[8px] font-extrabold text-slate-400 leading-none">{isExternal ? `E${displayNo}` : `#${displayNo}`}</span>
        )}
        <span className="text-[7px] sm:text-[8px] font-bold leading-tight line-clamp-2">{checkpoint.faculty.replace('Faculty of ', '')}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="card p-3 space-y-2 bg-cream-100">
        <FloorPlanCanvas renderSlot={renderSlot} />

        {!anyAssigned && (
          <p className="text-[10px] text-slate-400 text-center pt-1">Booth positions will appear here once announced.</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
          {venue}
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-ink" aria-hidden="true" />
            To visit
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-ink" aria-hidden="true" />
            Stamped
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-ink" aria-hidden="true" />
            You were here
          </span>
        </span>
      </div>
    </div>
  );
}
