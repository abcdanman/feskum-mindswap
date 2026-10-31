'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSpeakers, saveSpeaker, deleteSpeaker, uploadImage } from '@/lib/supabase';
import { Speaker } from '@/lib/types';
import Modal from '@/components/Modal';
import { Plus, Edit3, Trash2, ArrowLeft, X, Save, ThumbsUp, User, UploadCloud, ImageIcon } from 'lucide-react';

const inputCls =
  'w-full p-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink text-sm focus:bg-white';

export default function AdminSpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Partial<Speaker>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [initialSpeaker, setInitialSpeaker] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSpeakers();
  }, []);

  async function loadSpeakers() {
    const list = await getSpeakers(true);
    setSpeakers(list);
  }

  const openNew = () => {
    const next: Partial<Speaker> = {
      session_date: '13 Nov 2026',
      session_time: '10:00 AM - 10:30 AM',
    };
    setEditingSpeaker(next);
    setInitialSpeaker(JSON.stringify(next));
    setError('');
    setShowModal(true);
  };

  const openEdit = (speaker: Speaker) => {
    const next = { ...speaker };
    setEditingSpeaker(next);
    setInitialSpeaker(JSON.stringify(next));
    setError('');
    setShowModal(true);
  };

  const isDirty = () => JSON.stringify(editingSpeaker) !== initialSpeaker;

  const requestClose = () => {
    if (isDirty() && !window.confirm('Discard unsaved speaker changes?')) return;
    setShowModal(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const missing = [
      ['name', editingSpeaker.name],
      ['position', editingSpeaker.position],
      ['organisation', editingSpeaker.organisation],
      ['session title', editingSpeaker.session_title],
      ['session time', editingSpeaker.session_time],
      ['biography', editingSpeaker.bio],
    ].filter(([, value]) => !String(value || '').trim());

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map(([label]) => label).join(', ')}.`);
      return;
    }

    setSaving(true);
    const { error: saveError } = await saveSpeaker(editingSpeaker);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setInitialSpeaker(JSON.stringify(editingSpeaker));
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
    setError('');
    const url = await uploadImage(file, 'speakers');
    setUploading(false);
    if (!url) {
      setError('Photo upload failed — check the “speakers” storage bucket or paste an image URL instead.');
      return;
    }
    setEditingSpeaker(prev => ({ ...prev, photo_url: url }));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white text-ink border-2 border-ink shadow-brut"
            aria-label="Back to admin overview"
            title="Back to admin overview"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {speakers.map(speaker => (
          <div key={speaker.id} className="card p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-cream-100 shrink-0 border-2 border-ink">
                {speaker.photo_url ? (
                  <img src={speaker.photo_url} alt={speaker.name} width={56} height={56} loading="lazy" className="w-full h-full object-cover" />
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
                <h3 className="font-extrabold text-ink text-sm leading-snug line-clamp-2">{speaker.name}</h3>
                <p className="text-[11px] text-brand-600 font-bold truncate">{speaker.position}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 shrink-0">
              <button
                onClick={() => openEdit(speaker)}
                className="btn w-10 h-10 bg-white text-ink flex items-center justify-center"
                aria-label={`Edit ${speaker.name}`}
                title="Edit speaker"
              >
                <Edit3 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => handleDelete(speaker.id)}
                className="btn w-10 h-10 bg-rose-50 text-rose-600 flex items-center justify-center"
                aria-label={`Delete ${speaker.name}`}
                title="Delete speaker"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT / ADD MODAL */}
      {showModal && (
        <Modal
          onClose={requestClose}
          labelledBy="speaker-form-title"
          closeLabel="Close speaker editor"
          initialFocus="#speaker-name"
          panelClassName="!max-w-2xl p-0 overflow-hidden"
        >
          <form onSubmit={handleSave} className="flex max-h-[90dvh] flex-col text-xs">
            <div className="shrink-0 border-b-2 border-ink/10 px-5 py-4 pr-14">
              <h3 id="speaker-form-title" className="display text-2xl text-ink leading-none">
                {editingSpeaker.id ? 'Edit speaker' : 'New speaker'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {editingSpeaker.id
                  ? 'Update the public UM Talk profile and session details.'
                  : 'Add a UM Talk speaker. Required fields are marked by the browser.'}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-cream-100 shrink-0 border-2 border-ink">
                  {editingSpeaker.photo_url ? (
                    <img src={editingSpeaker.photo_url} alt="Speaker photo preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-6 h-6" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="btn flex-1 py-2 bg-white text-ink text-xs flex items-center justify-center gap-1.5"
                    >
                      {uploading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" aria-hidden="true" /> Upload photo
                        </>
                      )}
                    </button>
                    {editingSpeaker.photo_url && (
                      <button
                        type="button"
                        onClick={() => setEditingSpeaker({ ...editingSpeaker, photo_url: '' })}
                        className="btn px-2.5 py-2 bg-rose-50 text-rose-600 text-xs"
                        aria-label="Remove speaker photo"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImageFile(e.target.files?.[0] || null)}
                  />
                  <input
                    type="url"
                    name="photo_url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="…or paste an image URL"
                    value={editingSpeaker.photo_url || ''}
                    onChange={e => setEditingSpeaker({ ...editingSpeaker, photo_url: e.target.value })}
                    className={`${inputCls} !text-[11px]`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="speaker-name" className="eyebrow text-slate-500 block mb-1">Speaker Name</label>
                  <input
                    id="speaker-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Prof. Dr. Imran"
                    value={editingSpeaker.name || ''}
                    onChange={e => setEditingSpeaker({ ...editingSpeaker, name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="speaker-position" className="eyebrow text-slate-500 block mb-1">Position / Title</label>
                  <input
                    id="speaker-position"
                    name="position"
                    type="text"
                    required
                    autoComplete="organization-title"
                    placeholder="e.g. Chair of AI Research"
                    value={editingSpeaker.position || ''}
                    onChange={e => setEditingSpeaker({ ...editingSpeaker, position: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="speaker-organisation" className="eyebrow text-slate-500 block mb-1">Faculty / Organisation</label>
                <input
                  id="speaker-organisation"
                  name="organisation"
                  type="text"
                  required
                  autoComplete="organization"
                  placeholder="e.g. Faculty of Computer Science & IT"
                  value={editingSpeaker.organisation || ''}
                  onChange={e => setEditingSpeaker({ ...editingSpeaker, organisation: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="speaker-session-title" className="eyebrow text-slate-500 block mb-1">Session Topic</label>
                <input
                  id="speaker-session-title"
                  name="session_title"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="e.g. Building Responsible AI"
                  value={editingSpeaker.session_title || ''}
                  onChange={e => setEditingSpeaker({ ...editingSpeaker, session_title: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="speaker-date" className="eyebrow text-slate-500 block mb-1">Date</label>
                  <select
                    id="speaker-date"
                    name="session_date"
                    value={editingSpeaker.session_date || '13 Nov 2026'}
                    onChange={e => setEditingSpeaker({ ...editingSpeaker, session_date: e.target.value })}
                    className={inputCls}
                  >
                    <option value="13 Nov 2026">13 Nov 2026</option>
                    <option value="14 Nov 2026">14 Nov 2026</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="speaker-time" className="eyebrow text-slate-500 block mb-1">Time</label>
                  <input
                    id="speaker-time"
                    name="session_time"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="e.g. 10:00 AM – 10:30 AM"
                    value={editingSpeaker.session_time || ''}
                    onChange={e => setEditingSpeaker({ ...editingSpeaker, session_time: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="speaker-bio" className="eyebrow text-slate-500 block mb-1">Biography</label>
                <textarea
                  id="speaker-bio"
                  name="bio"
                  rows={4}
                  required
                  autoComplete="off"
                  placeholder="Short public biography for the speaker card and profile modal."
                  value={editingSpeaker.bio || ''}
                  onChange={e => setEditingSpeaker({ ...editingSpeaker, bio: e.target.value })}
                  className={`${inputCls} resize-y`}
                />
              </div>
            </div>

            <div className="shrink-0 border-t-2 border-ink/10 bg-cream-50 px-5 py-3 space-y-2">
              {error && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-[11px] font-bold text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-3 py-2"
                >
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={requestClose}
                  className="btn flex-1 py-3 bg-white text-ink text-sm uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="btn flex-[1.4] py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm flex items-center justify-center gap-2 uppercase"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" aria-hidden="true" /> Save speaker
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
