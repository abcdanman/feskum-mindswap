'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSpeakers, saveSpeaker, deleteSpeaker } from '@/lib/supabase';
import { Speaker } from '@/lib/types';
import { Mic, Plus, Edit3, Trash2, ArrowLeft, X, Save, ThumbsUp, Calendar, Clock, User } from 'lucide-react';

export default function AdminSpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Partial<Speaker>>({});

  useEffect(() => {
    loadSpeakers();
  }, []);

  async function loadSpeakers() {
    const list = await getSpeakers();
    setSpeakers(list);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSpeaker(editingSpeaker);
    setShowModal(false);
    loadSpeakers();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this speaker?')) {
      await deleteSpeaker(id);
      loadSpeakers();
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 border border-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 font-display">UM Talk Speaker Management</h1>
            <p className="text-xs text-slate-500">Add, edit, or update speaker profiles & voting tallies</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingSpeaker({
              session_date: '11 Nov 2026',
              session_time: '10:00 AM - 10:30 AM',
            });
            setShowModal(true);
          }}
          className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" /> Add Speaker
        </button>
      </div>

      {/* SPEAKERS LIST */}
      <div className="grid grid-cols-1 gap-3">
        {speakers.map((speaker) => (
          <div
            key={speaker.id}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                {speaker.photo_url ? (
                  <img src={speaker.photo_url} alt={speaker.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {speaker.session_date}
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3 text-amber-500" /> {speaker.vote_count || 0} Votes
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mt-1 leading-snug truncate">{speaker.name}</h3>
                <p className="text-xs text-brand-600 font-bold truncate">{speaker.position} • {speaker.organisation}</p>
                <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">&quot;{speaker.session_title}&quot;</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setEditingSpeaker(speaker);
                  setShowModal(true);
                }}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
                title="Edit Speaker"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(speaker.id)}
                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200"
                title="Delete Speaker"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT / ADD SPEAKER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-slate-900 text-lg font-display">
              {editingSpeaker.id ? 'Edit Speaker Profile' : 'Add New Speaker'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Speaker Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Dr. Ahmad Subhi"
                  value={editingSpeaker.name || ''}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Position / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chair of AI Research"
                  value={editingSpeaker.position || ''}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, position: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Faculty / Organisation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Faculty of Computer Science & IT"
                  value={editingSpeaker.organisation || ''}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, organisation: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Session Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Building Ethical AI for Next-Gen Society"
                  value={editingSpeaker.session_title || ''}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, session_title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Session Date</label>
                  <select
                    value={editingSpeaker.session_date || '11 Nov 2026'}
                    onChange={(e) => setEditingSpeaker({ ...editingSpeaker, session_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500"
                  >
                    <option value="11 Nov 2026">11 Nov 2026</option>
                    <option value="12 Nov 2026">12 Nov 2026</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Session Time</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00 AM - 10:30 AM"
                    value={editingSpeaker.session_time || ''}
                    onChange={(e) => setEditingSpeaker({ ...editingSpeaker, session_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Biography</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Short bio about speaker..."
                  value={editingSpeaker.bio || ''}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, bio: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Photo Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editingSpeaker.photo_url || ''}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, photo_url: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 mt-2 shadow-md shadow-brand-500/20"
              >
                <Save className="w-4 h-4" /> Save Speaker Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
