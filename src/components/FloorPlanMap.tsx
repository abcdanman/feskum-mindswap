'use client';

import React from 'react';
import { Checkpoint } from '@/lib/types';
import { buildFloorPlanNodes, FLOORPLAN } from '@/lib/floorplan';
import { CheckCircle2, MapPin } from 'lucide-react';

interface FloorPlanMapProps {
  checkpoints: Checkpoint[];
  visitedIds?: Set<string>;
  lastCheckpointId?: string | null;
  onSelect?: (checkpoint: Checkpoint) => void;
  image?: string | null;
  venue?: string;
}

export default function FloorPlanMap({
  checkpoints,
  visitedIds = new Set(),
  lastCheckpointId = null,
  onSelect,
  image = FLOORPLAN.image,
  venue = FLOORPLAN.venue,
}: FloorPlanMapProps) {
  const nodes = buildFloorPlanNodes(checkpoints);
  const numberById = new Map(
    checkpoints.map((checkpoint, index) => [checkpoint.id, index + 1])
  );

  if (nodes.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-slate-500">
        No booths to place on the map yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[4/5] rounded-2xl border-2 border-ink overflow-hidden bg-cream-100 blueprint-grid">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={`Floor plan of ${venue}`}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0">
            <div className="absolute top-3 left-3 sticker bg-ink text-cream-50 text-[9px]">
              Plan
            </div>
            <div className="absolute bottom-3 right-3 text-[9px] mono uppercase tracking-widest text-slate-400">
              Schematic
            </div>
          </div>
        )}

        {nodes.map(node => {
          const { checkpoint, x, y } = node;
          const visited = visitedIds.has(checkpoint.id);
          const isHere = lastCheckpointId === checkpoint.id;
          const number = numberById.get(checkpoint.id);
          const isPartner = checkpoint.booth_type === 'partner';

          return (
            <button
              key={checkpoint.id}
              type="button"
              onClick={() => onSelect?.(checkpoint)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group focus-visible:z-20 z-10"
              aria-label={`${checkpoint.name}${visited ? ' — stamped' : ''}${
                isHere ? ' — you were here' : ''
              }`}
            >
              <span
                className={`relative flex items-center justify-center w-9 h-9 rounded-full border-2 border-ink font-extrabold text-xs shadow-brut transition-transform group-hover:scale-110 group-active:scale-95 ${
                  visited
                    ? (isPartner ? 'bg-gold-400 text-ink' : 'bg-emerald-500 text-white')
                    : (isPartner ? 'bg-amber-50 text-ink' : 'bg-white text-ink')
                } ${isHere ? 'ring-4 ring-brand-300' : ''}`}
              >
                {visited ? (
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  number
                )}
                {isHere && (
                  <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-brand-500 border-2 border-ink animate-pulse" aria-hidden="true" />
                )}
              </span>
              <span className="max-w-[72px] text-[8px] font-bold leading-tight text-center text-ink bg-cream-50/90 border border-ink/20 rounded px-1 line-clamp-2">
                {checkpoint.faculty.replace('Faculty of ', '')}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
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
            <span className="w-2.5 h-2.5 rounded-full bg-gold-400 border-2 border-ink" aria-hidden="true" />
            Partner
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
