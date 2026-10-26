'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSpeakers, saveSpeaker, deleteSpeaker, uploadImage } from '@/lib/supabase';
import { Speaker } from '@/lib/types';
import { Plus, Edit3, Trash2, ArrowLeft, X, Save, ThumbsUp, User, UploadCloud, ImageIcon } from 'lucide-react';

const inputCls =
  'w-full p-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink text-sm focus:outline-none focus:bg-white';

export default function AdminSpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Partial<Speaker>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSpeakers();
  }, []);

  async function loadSpeakers() {
    const list = await getSpeakers();
    setSpeakers(list);
  }

  const openNew = () => {
    setEditingSpeaker({ session_date: '13 Nov 2026', session_time: '10:00 AM - 10:30 AM' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!editingSpeaker.name || !editingSpeaker.name.trim()) {
      setError('Please enter the speaker name.');
      return;
    }
    setSaving(true);
    const { error: saveError } = await saveSpeaker(editingSpeaker);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setShowModal(false);
    loadSpeakers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this speaker?')) return;
    const { error: delError } = await deleteSpeaker(id);
    if (delError) {
      alert(`Delete failed: ${delError}`);
      return;
    }
    loadSpeakers();
  };

  const handleImageFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file, 'speakers');
    setUploading(false);
    if (url) setEditingSpeaker(prev => ({ ...prev, photo_url: url }));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="p-2 rounded-xl bg-white text-ink border-2 border-ink shadow-brut">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="display text-2xl text-ink leading-none">Speakers</h1>
            <p className="text-[11px] text-slate-500">Manage UM Talk profiles & tallies</p>
          </div>
        </div>

        <button
          onClick={openNew}
          className="btn px-3 py-2 bg-brand-500 text-white text-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* SPEAKERS LIST */}
      <div className="grid grid-cols-1 gap-3">
        {speakers.map(speaker => (
          <div key={speaker.id} className="card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-cream-100 shrink-0 border-2 border-ink">
                {speaker.photo_url ? (
                  <img src={speaker.photo_url} alt={speaker.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="eyebrow text-slate-500">{speaker.session_date}</span>
                  <span className="text-[10px] font-bold text-gold-700 bg-gold-400/20 px-1.5 py-0.5 rounded border-2 border-ink/10 flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3 text-gold-500" /> {speaker.vote_count || 0}
                  </span>
                </div>
                <h3 className="font-extrabold text-ink text-sm leading-snug truncate">{speaker.name}</h3>
                <p className="text-[11px] text-brand-600 font-bold truncate">{speaker.position}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => openEdit(speaker)}
                className="btn p-1.5 bg-white text-ink"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(speaker.id)} className="btn p-1.5 bg-rose-50 text-rose-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT / ADD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-sm card p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="display text-2xl text-ink leading-none">
              {editingSpeaker.id ? 'Edit speaker' : 'New speaker'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-600 font-semibold text-[11px]">
                  {error}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-cream-100 shrink-0 border-2 border-ink">
                  {editingSpeaker.photo_url ? (
                    <img src={editingSpeaker.photo_url} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="btn w-full py-2 bg-white text-ink text-xs flex items-center justify-center gap-1.5"
                  >
                    {uploading ? (
                      <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" /> Upload photo
                      </>
                    )}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImageFile(e.target.files?.[0] || null)}
                  />
                  <input
                    type="url"
                    placeholder="…or paste URL"
                    value={editingSpeaker.photo_url || ''}
                    onChange={e => setEditingSpeaker({ ...editingSpeaker, photo_url: e.target.value })}
                    className={`${inputCls} !text-[11px]`}
                  />
                </div>
              </div>

              <div>
                <label className="eyebrow text-slate-500 block mb-1">Speaker name</label>
                <input
                  type="text"
                  required
                  value={editingSpeaker.name || ''}
                  onChange={e => setEditingSpeaker({ ...editingSpeaker, name: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="eyebrow text-slate-500 block mb-1">Position / Title</label>
                <input
                  type="text"
                  required
                  value={editingSpeaker.position || ''}
                  onChange={e => setEditingSpeaker({ ...editingSpeaker, position: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="eyebrow text-slate-500 block mb-1">Faculty / Organisation</label>
                <input
                  type="text"
                  required
                  value={editingSpeaker.organisation || ''}
                  onChange={e => setEditingSpeaker({ ...editingSpeaker, organisation: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="eyebrow text-slate-500 block mb-1">Session topic</label>
                <input
                  type="text"
                  required
                  value={editingSpeaker.session_title || ''}
                  onChange={e => setEditingSpeaker({ ...editingSpeaker, session_title: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="eyebrow text-slate-500 block mb-1">Date</label>
                  <select
                    value={editingSpeaker.session_date || '13 Nov 2026'}
                    onChange={e => setEditingSpeaker({ ...editingSpeaker, session_date: e.target.value })}
                    className={inputCls}
                  >
                    <option value="13 Nov 2026">13 Nov 2026</option>
                    <option value="14 Nov 2026">14 Nov 2026</option>
                  </select>
                </div>
                <div>
                  <label className="eyebrow text-slate-500 block mb-1">Time</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00 AM - 10:30 AM"
                    value={editingSpeaker.session_time || ''}
                    onChange={e => setEditingSpeaker({ ...editingSpeaker, session_time: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="eyebrow text-slate-500 block mb-1">Biography</label>
                <textarea
                  rows={2}
                  required
                  value={editingSpeaker.bio || ''}
                  onChange={e => setEditingSpeaker({ ...editingSpeaker, bio: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn w-full py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm flex items-center justify-center gap-2 uppercase"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save speaker
                  </>
                )}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
