'use client';

import React from 'react';
import { Checkpoint } from '@/lib/types';
import { MAP_ROWS, VENUE_NAME } from '@/lib/floorplan';
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
    if (c.map_label && (c.booth_type || 'required') !== 'partner') byPosition.set(c.map_label, c);
  });
  const partnerBooths = checkpoints.filter(c => c.booth_type === 'partner');
  const anyAssigned = byPosition.size > 0;

  const renderSlot = (position: number) => {
    const checkpoint = byPosition.get(position);
    if (!checkpoint) {
      return (
        <div
          key={position}
          className="rounded-xl border-2 border-dashed border-ink/15 bg-cream-50/60 flex items-center justify-center py-3"
          aria-hidden="true"
        >
          <span className="text-[9px] font-bold text-slate-300">#{position}</span>
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
          visited ? 'bg-emerald-500 text-white' : 'bg-white text-ink hover:bg-cream-100'
        } ${dimmed ? 'opacity-25' : ''}`}
        aria-label={`${checkpoint.name}${visited ? ' — stamped' : ''}${isHere ? ' — you were here' : ''}`}
      >
        {isHere && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-brand-500 border-2 border-ink animate-pulse" aria-hidden="true" />
        )}
        {visited ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <span className="text-[9px] font-extrabold text-slate-400">#{position}</span>}
        <span className="text-[8px] font-bold leading-tight line-clamp-2">{checkpoint.faculty.replace('Faculty of ', '')}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="card p-3 space-y-1.5 bg-cream-100">
        {/* Stage & seating — non-interactive context, matching the real plan */}
        <LandmarkBlock label="Stage &amp; LED Screen" className="bg-gold-400/40 py-2.5" />
        <LandmarkBlock label="VIP Seating" className="bg-orange-200/40" />
        <LandmarkBlock label="General Audience Seating" className="bg-orange-100/50 py-2" />

        {/* 17 numbered faculty positions, 4/4/5/4 — matches the printed plan */}
        <div className="space-y-1.5 pt-1.5">
          {MAP_ROWS.map((row, i) => (
            <div key={i} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map(renderSlot)}
            </div>
          ))}
        </div>

        {!anyAssigned && (
          <p className="text-[10px] text-slate-400 text-center pt-1">Booth positions will appear here once announced.</p>
        )}

        {/* External / partner booths — no fixed numbered slots, shown as a row */}
        {partnerBooths.length > 0 && (
          <div className="pt-2 border-t-2 border-ink/10">
            <span className="eyebrow text-slate-400 block mb-1.5">External &amp; partner booths</span>
            <div className="flex flex-wrap gap-1.5">
              {partnerBooths.map(booth => {
                const visited = visitedIds.has(booth.id);
                const isHere = lastCheckpointId === booth.id;
                const dimmed = highlightedIds ? !highlightedIds.has(booth.id) : false;
                return (
                  <button
                    key={booth.id}
                    type="button"
                    onClick={() => onSelect?.(booth)}
                    className={`relative px-2.5 py-1.5 rounded-lg border-2 border-ink text-[9px] font-bold flex items-center gap-1 active:scale-95 transition-all ${
                      visited ? 'bg-gold-400 text-ink' : 'bg-white text-ink hover:bg-cream-100'
                    } ${dimmed ? 'opacity-25' : ''}`}
                  >
                    {isHere && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-ink animate-pulse" aria-hidden="true" />
                    )}
                    {visited && <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />}
                    <span className="line-clamp-1 max-w-[110px]">{booth.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
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
