'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSpeakers, saveSpeaker, deleteSpeaker, uploadImage, getVotingStatus, setVotingActive } from '@/lib/supabase';
import { Speaker, VotingStatus } from '@/lib/types';
import Modal from '@/components/Modal';
import ImageCropModal from '@/components/ImageCropModal';
import { Plus, Edit3, Trash2, ArrowLeft, X, Save, ThumbsUp, User, UploadCloud, ImageIcon, Award, Crown } from 'lucide-react';

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
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [votingStatus, setVotingStatusState] = useState<VotingStatus | null>(null);
  const [togglingVote, setTogglingVote] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSpeakers();
    loadVotingStatus();
  }, []);

  async function loadSpeakers() {
    const list = await getSpeakers(true);
    setSpeakers(list);
  }

  async function loadVotingStatus() {
    const status = await getVotingStatus();
    setVotingStatusState(status);
  }

  const handleToggleVoting = async () => {
    if (!votingStatus) return;
    setTogglingVote(true);
    const { error: toggleError } = await setVotingActive(!votingStatus.is_active);
    setTogglingVote(false);
    if (toggleError) {
      alert(`Could not update voting status: ${toggleError}`);
      return;
    }
    await loadVotingStatus();
  };

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

  const handleImageFile = (file: File | null) => {
    if (!file) return;
    setError('');
    setCropFile(file);
  };

  const handleCroppedImage = async (file: File) => {
    setCropFile(null);
    setUploading(true);
    const { url, error: uploadError } = await uploadImage(file, 'speakers');
    setUploading(false);
    if (!url) {
      setError(`${uploadError || 'Photo upload failed.'} You can paste an image URL instead.`);
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

      {/* PEOPLE'S CHOICE VOTING TOGGLE */}
      <div className="card p-4 flex items-center justify-between gap-3 bg-gold-400/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gold-400 border-2 border-ink flex items-center justify-center text-ink shrink-0">
            <Award className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-ink text-sm">People&apos;s Choice voting</h3>
            <p className="text-[11px] text-slate-500">
              {votingStatus?.is_active
                ? 'Open — visitors can vote at /talks/vote for anyone in the Day 2 lineup.'
                : 'Closed — set each speaker’s date to Day 2 (or both days), then open voting.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleVoting}
          disabled={!votingStatus || togglingVote}
          aria-pressed={Boolean(votingStatus?.is_active)}
          className={`btn px-3.5 py-2 text-xs font-extrabold shrink-0 disabled:opacity-60 ${
            votingStatus?.is_active ? 'bg-emerald-500 text-white' : 'bg-white text-ink'
          }`}
        >
          {togglingVote ? 'Updating…' : votingStatus?.is_active ? 'Open' : 'Closed'}
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="eyebrow text-slate-500">{speaker.session_date}</span>
                  {speaker.is_winner ? (
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gold-400 text-ink flex items-center gap-1">
                      <Crown className="w-3 h-3" aria-hidden="true" /> Top 3
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-gold-700 bg-gold-400/20 px-1.5 py-0.5 rounded border-2 border-ink/10 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-gold-500" /> {speaker.vote_count || 0}
                    </span>
                  )}
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
                  : 'Add a UM Talk speaker. Every field is optional — fill in what you have.'}
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
                    onChange={e => {
                      handleImageFile(e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
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
                    <option value="13-14 Nov 2026">Both days (13 &amp; 14 Nov)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="speaker-time" className="eyebrow text-slate-500 block mb-1">Time</label>
                  <input
                    id="speaker-time"
                    name="session_time"
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. 10:00 AM – 10:30 AM"
                    value={editingSpeaker.session_time || ''}
                    onChange={e => setEditingSpeaker({ ...editingSpeaker, session_time: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gold-400/10 border-2 border-gold-500/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingSpeaker.is_winner ?? false}
                  onChange={e => setEditingSpeaker({ ...editingSpeaker, is_winner: e.target.checked })}
                  className="w-4 h-4 accent-gold-500"
                />
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-gold-600" aria-hidden="true" />
                  Judges&apos; Top 3 — a separate award, shown on the admin list only
                </span>
              </label>

              <div>
                <label htmlFor="speaker-bio" className="eyebrow text-slate-500 block mb-1">Biography</label>
                <textarea
                  id="speaker-bio"
                  name="bio"
                  rows={4}
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

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={1}
          title="Crop speaker photo"
          onCancel={() => setCropFile(null)}
          onCropped={handleCroppedImage}
        />
      )}
    </div>
  );
}
