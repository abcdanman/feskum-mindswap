'use client';

/**
 * The floor-plan editor's per-slot booth assignment control — a tiny
 * custom dropdown (not a native <select>) so it can carry an in-panel
 * Required/External filter, which a native select has no way to offer.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Checkpoint } from '@/lib/types';
import { ChevronDown } from 'lucide-react';

interface BoothSlotPickerProps {
  value: string;
  onChange: (id: string) => void;
  checkpoints: Checkpoint[];
  className?: string;
}

type TypeFilter = 'all' | 'required' | 'partner';

const FILTER_LABEL: Record<TypeFilter, string> = { all: 'All', required: 'Required', partner: 'External' };

export default function BoothSlotPicker({ value, onChange, checkpoints, className = '' }: BoothSlotPickerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<TypeFilter>('all');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = checkpoints.find(c => c.id === value);
  const filtered = checkpoints.filter(c => {
    if (filter === 'all') return true;
    return (c.booth_type === 'partner' ? 'partner' : 'required') === filter;
  });

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        aria-label="Assign booth to this position"
        className="w-full text-[6px] sm:text-[8px] font-bold text-ink bg-transparent border-0 p-0 focus:outline-none flex items-center justify-between gap-0.5"
      >
        <span className={`truncate text-left ${selected ? '' : 'text-slate-400'}`}>{selected ? selected.name : '— Empty —'}</span>
        <ChevronDown className="w-2 h-2 shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          onMouseDown={e => e.stopPropagation()}
          className="absolute z-30 top-full left-0 mt-1 w-48 max-h-72 overflow-hidden rounded-lg border-2 border-ink bg-white shadow-brut flex flex-col"
        >
          <div className="flex gap-0.5 p-1 border-b border-ink/10 shrink-0">
            {(['all', 'required', 'partner'] as TypeFilter[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex-1 text-[8px] font-bold uppercase py-1 rounded ${
                  filter === f ? 'bg-ink text-cream-50' : 'text-slate-500 hover:bg-cream-100'
                }`}
              >
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 text-[10px] font-semibold ${
                value === '' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:bg-cream-100'
              }`}
            >
              — Empty —
            </button>
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-[10px] font-semibold truncate ${
                  value === c.id ? 'bg-brand-500 text-white' : 'text-ink hover:bg-cream-100'
                }`}
              >
                {c.name}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-2 py-1.5 text-[10px] text-slate-400">No booths</p>}
          </div>
        </div>
      )}
    </div>
  );
}
