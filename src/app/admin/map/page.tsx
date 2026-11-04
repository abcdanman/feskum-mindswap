'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getCheckpoints, saveCheckpoint } from '@/lib/supabase';
import { Checkpoint } from '@/lib/types';
import { FIRST_EXTERNAL_POSITION, SlotLayout } from '@/lib/floorplan';
import FloorPlanCanvas from '@/components/FloorPlanCanvas';
import { ArrowLeft, Save, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AdminMapPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [initialAssignments, setInitialAssignments] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const list = await getCheckpoints(true);
    setCheckpoints(list);
    const loaded: Record<number, string> = {};
    list.forEach(c => {
      if (c.map_label) loaded[c.map_label] = c.id;
    });
    setAssignments(loaded);
    setInitialAssignments(loaded);
    setLoading(false);
  }

  const checkpointMap = useMemo(() => new Map(checkpoints.map(c => [c.id, c])), [checkpoints]);

  const isDirty = JSON.stringify(assignments) !== JSON.stringify(initialAssignments);
  const changeCount = useMemo(() => {
    const positions = new Set([...Object.keys(assignments), ...Object.keys(initialAssignments)]);
    let count = 0;
    positions.forEach(p => {
      if (assignments[Number(p)] !== initialAssignments[Number(p)]) count += 1;
    });
    return count;
  }, [assignments, initialAssignments]);

  const handleAssign = (position: number, checkpointId: string) => {
    setMessage('');
    setAssignments(prev => {
      const next = { ...prev };
      // A booth can only occupy one physical slot — clear it from wherever
      // it currently sits before placing it here.
      Object.keys(next).forEach(p => {
        if (next[Number(p)] === checkpointId) delete next[Number(p)];
      });
      if (checkpointId) next[position] = checkpointId;
      else delete next[position];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    // Only touch booths whose assigned position actually changed — not an
    // autosave-on-every-click, one batch write when you hit Save.
    const changedCheckpointIds = new Set<string>();
    const allPositions = new Set([...Object.keys(assignments), ...Object.keys(initialAssignments)].map(Number));
    allPositions.forEach(pos => {
      const before = initialAssignments[pos];
      const after = assignments[pos];
      if (before !== after) {
        if (before) changedCheckpointIds.add(before);
        if (after) changedCheckpointIds.add(after);
      }
    });

    const results = await Promise.all(
      Array.from(changedCheckpointIds).map(id => {
        const checkpoint = checkpointMap.get(id);
        if (!checkpoint) return Promise.resolve({ error: null });
        const newPosition = Object.entries(assignments).find(([, cid]) => cid === id)?.[0];
        return saveCheckpoint({ ...checkpoint, map_label: newPosition ? Number(newPosition) : null });
      })
    );

    setSaving(false);
    const failed = results.some(r => r.error);
    if (failed) {
      setMessage('Some changes failed to save — check your connection and try again.');
      return;
    }
    setMessage('Map saved.');
    await load();
    setTimeout(() => setMessage(''), 3000);
  };

  const renderSlot = (slot: SlotLayout) => {
    const position = slot.position;
    const isExternal = position >= FIRST_EXTERNAL_POSITION;
    const displayNo = isExternal ? position - FIRST_EXTERNAL_POSITION + 1 : position;
    const assignedId = assignments[position] || '';
    const changed = assignments[position] !== initialAssignments[position];
    return (
      <div
        className={`w-full h-full rounded-lg border-2 px-1 py-0.5 flex flex-col justify-center overflow-hidden ${
          changed ? 'border-brand-500 bg-brand-50' : assignedId ? 'border-ink bg-white' : 'border-ink/20 bg-white/40'
        }`}
      >
        <span className="text-[6px] sm:text-[8px] font-extrabold uppercase tracking-wide text-slate-400 leading-none">
          {isExternal ? `Ext #${displayNo}` : `#${displayNo}`}
        </span>
        <select
          value={assignedId}
          onChange={e => handleAssign(position, e.target.value)}
          className="w-full text-[7px] sm:text-[9px] font-bold text-ink bg-transparent border-0 p-0 focus:outline-none focus:ring-0 truncate"
        >
          <option value="">— Empty —</option>
          {checkpoints.map(b => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/booths"
            className="p-2 rounded-xl bg-white text-ink border-2 border-ink shadow-brut"
            aria-label="Back to booths"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="display text-2xl text-ink leading-none">Floor plan</h1>
            <p className="text-[11px] text-slate-500">Assign booths to the 24 numbered positions</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="btn px-3.5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs flex items-center gap-1.5 shrink-0"
        >
          {saving ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {saving ? 'Saving…' : isDirty ? `Save (${changeCount})` : 'Saved'}
        </button>
      </div>

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`p-2.5 rounded-xl text-xs font-bold text-center border-2 border-ink flex items-center justify-center gap-1.5 ${
            message.includes('failed') ? 'bg-rose-100 text-rose-700' : 'bg-emerald-400 text-ink'
          }`}
        >
          {message.includes('failed') ? <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> : <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
          {message}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-ink border-t-brand-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="card p-4 bg-cream-100 space-y-3">
          <FloorPlanCanvas renderSlot={renderSlot} />

          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1">
            <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" /> Layout mirrors the printed floor plan's actual positions, gaps and walkways — not to scale.
          </p>
        </div>
      )}
    </div>
  );
}
