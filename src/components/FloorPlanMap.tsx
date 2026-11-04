'use client';

import React from 'react';
import { Checkpoint } from '@/lib/types';
import { FACULTY_ROWS, EXTERNAL_ROWS, FIRST_EXTERNAL_POSITION, VENUE_NAME } from '@/lib/floorplan';
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

function LandmarkBlock({ label, className }: { label: string; className: string }) {
  return (
    <div className={`rounded-lg border-2 border-ink/15 text-center py-1.5 px-1 ${className}`}>
      <span className="text-[8px] font-extrabold uppercase tracking-wide text-ink/55 leading-none">{label}</span>
    </div>
  );
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

  const renderSlot = (position: number) => {
    const checkpoint = byPosition.get(position);
    const isExternal = position >= FIRST_EXTERNAL_POSITION;
    const displayNo = isExternal ? position - FIRST_EXTERNAL_POSITION + 1 : position;

    if (!checkpoint) {
      return (
        <div
          key={position}
          className="rounded-xl border-2 border-dashed border-ink/15 bg-cream-50/60 flex items-center justify-center py-3"
          aria-hidden="true"
        >
          <span className="text-[9px] font-bold text-slate-300">{isExternal ? `E${displayNo}` : `#${displayNo}`}</span>
        </div>
      );
    }

    const visited = visitedIds.has(checkpoint.id);
    const isHere = lastCheckpointId === checkpoint.id;
    const dimmed = highlightedIds ? !highlightedIds.has(checkpoint.id) : false;

    return (
      <button
        key={position}
        type="button"
        onClick={() => onSelect?.(checkpoint)}
        className={`relative rounded-xl border-2 border-ink p-2 flex flex-col items-center gap-1 text-center transition-all active:scale-95 ${
          visited ? 'bg-emerald-500 text-white' : isExternal ? 'bg-gold-400/30 text-ink hover:bg-gold-400/50' : 'bg-white text-ink hover:bg-cream-100'
        } ${dimmed ? 'opacity-25' : ''}`}
        aria-label={`${checkpoint.name}${visited ? ' — stamped' : ''}${isHere ? ' — you were here' : ''}`}
      >
        {isHere && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-brand-500 border-2 border-ink animate-pulse" aria-hidden="true" />
        )}
        {visited ? (
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <span className="text-[9px] font-extrabold text-slate-400">{isExternal ? `E${displayNo}` : `#${displayNo}`}</span>
        )}
        <span className="text-[8px] font-bold leading-tight line-clamp-2">{checkpoint.faculty.replace('Faculty of ', '')}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="card p-3 space-y-1.5 bg-cream-100">
        {/* Top corner landmarks — matches the printed plan's corners */}
        <div className="grid grid-cols-2 gap-1.5">
          <LandmarkBlock label="Backstage (Speakers)" className="bg-slate-200/50" />
          <LandmarkBlock label="Technical" className="bg-slate-200/50" />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <LandmarkBlock label="Fire Exit &amp; VIP Lounge Entry" className="bg-rose-100/50" />
          <LandmarkBlock label="Judges" className="bg-slate-200/50" />
        </div>

        {/* Stage & seating — non-interactive context, matching the real plan */}
        <LandmarkBlock label="Stage &amp; LED Screen" className="bg-gold-400/40 py-2.5" />
        <LandmarkBlock label="VIP Seating" className="bg-orange-200/40" />
        <LandmarkBlock label="General Audience Seating" className="bg-orange-100/50 py-2" />

        <div className="grid grid-cols-2 gap-1.5">
          <LandmarkBlock label="Ruang Berlegar 2" className="bg-slate-100/60" />
          <LandmarkBlock label="Ruang Berlegar 1" className="bg-slate-100/60" />
        </div>

        {/* 19 numbered faculty positions, 4/5/5/5 — matches the printed plan */}
        <div className="space-y-1.5 pt-1">
          {FACULTY_ROWS.map((row, i) => (
            <div key={i} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map(renderSlot)}
            </div>
          ))}
        </div>

        {/* 8 numbered external booth positions, 4/4 — matches the printed plan */}
        <div className="pt-2 border-t-2 border-ink/10 space-y-1.5">
          <span className="eyebrow text-slate-400 block">External &amp; partner booths</span>
          {EXTERNAL_ROWS.map((row, i) => (
            <div key={i} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map(renderSlot)}
            </div>
          ))}
        </div>

        {!anyAssigned && (
          <p className="text-[10px] text-slate-400 text-center pt-1">Booth positions will appear here once announced.</p>
        )}

        {/* Bottom landmarks */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t-2 border-ink/10">
          <LandmarkBlock label="Photo Booth" className="bg-rose-200/40" />
          <LandmarkBlock label="Helpdesk" className="bg-emerald-200/40" />
          <LandmarkBlock label="Registration" className="bg-emerald-200/40" />
        </div>
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
