'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { listAllVisitors, deleteVisitor, updateVisitorProfile } from '@/lib/supabase';
import { VisitorListEntry } from '@/lib/types';
import Modal from '@/components/Modal';
import { Users, Search, Edit3, Trash2, Save, Loader2, AlertTriangle, CheckCircle2, Ticket } from 'lucide-react';

export default function AdminVisitorsPage() {
  const [visitors, setVisitors] = useState<VisitorListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<VisitorListEntry | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const list = await listAllVisitors();
    setVisitors(list);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visitors;
    return visitors.filter(
      v =>
        (v.display_name || '').toLowerCase().includes(q) ||
        (v.username || '').toLowerCase().includes(q) ||
        (v.student_id || '').toLowerCase().includes(q) ||
        (v.faculty || '').toLowerCase().includes(q)
    );
  }, [visitors, query]);

  const handleDelete = async (visitor: VisitorListEntry) => {
    const ok = confirm(
      `Delete "${visitor.display_name || visitor.username}"? This permanently removes their stamps, rewards, and votes, and frees up their matric/username so they can register again from scratch. This cannot be undone.`
    );
    if (!ok) return;
    setMessage('');
    const { error } = await deleteVisitor(visitor.id);
    if (error) {
      setMessage(error);
      return;
    }
    setVisitors(prev => prev.filter(v => v.id !== visitor.id));
    setMessage(`Deleted ${visitor.display_name || visitor.username}.`);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <h1 className="display text-2xl text-ink leading-none flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-600" aria-hidden="true" /> Visitors
        </h1>
        <p className="text-[11px] text-slate-500 mt-1">
          {visitors.length} registered {visitors.length === 1 ? 'identity' : 'identities'} — edit or delete to release a stuck device so someone can re-register.
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, username, matric, or faculty…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`p-2.5 rounded-xl text-xs font-bold text-center border-2 border-ink flex items-center justify-center gap-1.5 ${
            message.toLowerCase().includes('already') || message.toLowerCase().includes('could not')
              ? 'bg-rose-100 text-rose-700'
              : 'bg-emerald-400 text-ink'
          }`}
        >
          {message.toLowerCase().includes('already') || message.toLowerCase().includes('could not') ? (
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {message}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-ink border-t-brand-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-12">
          {query ? 'No visitors match your search.' : 'No registered visitors yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {query && (
            <p className="text-[10px] text-slate-400">
              {filtered.length} of {visitors.length} shown
            </p>
          )}
          {filtered.map(v => (
            <div key={v.id} className="card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-ink truncate">{v.display_name || 'Unnamed'}</span>
                  {v.username && <span className="text-xs text-brand-600 font-bold shrink-0">@{v.username}</span>}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {v.faculty || 'No faculty'}
                  {v.student_id ? ` · ${v.student_id}` : ''}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Ticket className="w-3 h-3" aria-hidden="true" /> {v.stamp_count} stamp{v.stamp_count === 1 ? '' : 's'}
                  {!v.show_on_leaderboard && ' · hidden from leaderboard'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditing(v)}
                  aria-label={`Edit ${v.display_name || v.username}`}
                  className="p-2 rounded-lg bg-white border-2 border-ink text-ink hover:bg-cream-100"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(v)}
                  aria-label={`Delete ${v.display_name || v.username}`}
                  className="p-2 rounded-lg bg-white border-2 border-ink text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditVisitorModal
          visitor={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setVisitors(prev => prev.map(v => (v.id === updated.id ? { ...v, ...updated } : v)));
            setEditing(null);
            setMessage('Visitor updated.');
            setTimeout(() => setMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
}

function EditVisitorModal({
  visitor,
  onClose,
  onSaved,
}: {
  visitor: VisitorListEntry;
  onClose: () => void;
  onSaved: (updated: VisitorListEntry) => void;
}) {
  const [displayName, setDisplayName] = useState(visitor.display_name || '');
  const [username, setUsername] = useState(visitor.username || '');
  const [faculty, setFaculty] = useState(visitor.faculty || '');
  const [studentId, setStudentId] = useState(visitor.student_id || '');
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(visitor.show_on_leaderboard);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const { error: err } = await updateVisitorProfile(visitor.id, {
      display_name: displayName,
      username,
      faculty,
      student_id: studentId || null,
      show_on_leaderboard: showOnLeaderboard,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onSaved({
      ...visitor,
      display_name: displayName,
      username: username.trim().replace(/^@+/, '').toLowerCase(),
      faculty,
      student_id: studentId || null,
      show_on_leaderboard: showOnLeaderboard,
    });
  };

  return (
    <Modal onClose={onClose} labelledBy="edit-visitor-title" panelClassName="max-w-sm">
      <div className="p-5 space-y-3">
        <h3 id="edit-visitor-title" className="display text-xl text-ink leading-none">Edit visitor</h3>

        <label className="block space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Full name</span>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Username</span>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Faculty</span>
          <input
            type="text"
            value={faculty}
            onChange={e => setFaculty(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Matric / Student ID</span>
          <input
            type="text"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={showOnLeaderboard}
            onChange={e => setShowOnLeaderboard(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-xs font-bold text-ink">Show on public leaderboard</span>
        </label>

        {error && (
          <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn flex-1 py-2.5 bg-white border-2 border-ink text-ink text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Save className="w-3.5 h-3.5" aria-hidden="true" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
