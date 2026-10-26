'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Check, Pencil } from 'lucide-react';
import Modal from '@/components/Modal';
import { FACULTIES } from '@/lib/faculties';
import {
  getOrInitVisitorId,
  getVisitorIdentity,
  setVisitorIdentity,
  getVisitorName,
} from '@/lib/visitor';
import { registerVisitorIdentity } from '@/lib/supabase';

export default function Header() {
  const router = useRouter();
  const [visitorId, setVisitorId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [savedMsg, setSavedMsg] = useState<boolean>(false);

  const [tempName, setTempName] = useState('');
  const [tempMatric, setTempMatric] = useState('');
  const [tempFaculty, setTempFaculty] = useState('');
  const [tempShow, setTempShow] = useState(true);
  const [saving, setSaving] = useState(false);

  // Hidden organiser entrance: 5 quick taps on the logo.
  const adminTaps = useRef(0);
  const lastTapAt = useRef(0);

  const handleLogoTap = (event: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapAt.current > 2000) adminTaps.current = 0;
    lastTapAt.current = now;
    adminTaps.current += 1;
    if (adminTaps.current >= 5) {
      event.preventDefault();
      adminTaps.current = 0;
      router.push('/admin');
    }
  };

  useEffect(() => {
    const id = getOrInitVisitorId();
    setVisitorId(id);
    setName(getVisitorName());
  }, []);

  const openDrawer = () => {
    const identity = getVisitorIdentity();
    setTempName(identity.name);
    setTempMatric(identity.matric);
    setTempFaculty(identity.faculty);
    setTempShow(identity.showOnLeaderboard);
    setIsEditing(true);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim() || !tempFaculty.trim()) return;
    setSaving(true);
    const id = getOrInitVisitorId();
    const { visitorId: finalId } = await registerVisitorIdentity(id, {
      name: tempName,
      matric: tempMatric,
      faculty: tempFaculty,
      showOnLeaderboard: tempShow,
    });
    setVisitorIdentity({ name: tempName, matric: tempMatric, faculty: tempFaculty, showOnLeaderboard: tempShow });
    if (finalId) setVisitorId(finalId);
    setName(tempName.trim());
    setSaving(false);
    setIsEditing(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full">
        <div className="bg-cream-50/95 backdrop-blur-md border-b-2 border-ink px-4 py-2.5">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <Link href="/" onClick={handleLogoTap} className="flex items-center gap-2.5 group">
              <div className="flex items-baseline gap-1.5">
                <span className="display text-2xl text-ink leading-none">MindSwap</span>
                <span className="sticker bg-brand-500 text-white text-[9px] px-1.5 py-0.5">2026</span>
              </div>
            </Link>

            <div className="flex items-center gap-1.5">
              <button
                onClick={openDrawer}
                className="flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-xl bg-white border-2 border-ink hover:bg-slate-50 active:translate-y-px"
                aria-label="Edit your profile"
              >
                <span className="w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center text-white">
                  <User className="w-3 h-3" aria-hidden="true" />
                </span>
                <span className="max-w-[76px] truncate text-xs font-bold text-ink">{name || 'Visitor'}</span>
                <Pencil className="w-3 h-3 text-slate-400" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {isEditing && (
        <Modal onClose={() => setIsEditing(false)} labelledBy="profile-title">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500 border-2 border-ink flex items-center justify-center text-white">
                <User className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 id="profile-title" className="display text-xl text-ink leading-none">Your profile</h3>
                <p className="text-[11px] text-slate-500 mt-1">Saved on this device · no account needed</p>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="space-y-3.5">
              <div>
                <label htmlFor="profile-name" className="eyebrow text-slate-500 block mb-1">Full name</label>
                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink placeholder-slate-400 focus:outline-none focus:bg-white text-base"
                  maxLength={60}
                />
              </div>
              <div>
                <label htmlFor="profile-matric" className="eyebrow text-slate-500 block mb-1">
                  Matric / Student ID <span className="normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <input
                  id="profile-matric"
                  name="matric"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={tempMatric}
                  onChange={e => setTempMatric(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink placeholder-slate-400 mono focus:outline-none focus:bg-white text-base"
                  maxLength={40}
                />
              </div>
              <div>
                <label htmlFor="profile-faculty" className="eyebrow text-slate-500 block mb-1">Faculty</label>
                <select
                  id="profile-faculty"
                  name="faculty"
                  value={tempFaculty}
                  onChange={e => setTempFaculty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink focus:outline-none focus:bg-white text-base"
                >
                  <option value="" disabled>Select your faculty…</option>
                  {FACULTIES.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                  {tempFaculty && !FACULTIES.includes(tempFaculty as (typeof FACULTIES)[number]) && (
                    <option value={tempFaculty}>{tempFaculty}</option>
                  )}
                </select>
              </div>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-cream-100 border-2 border-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={tempShow}
                  onChange={e => setTempShow(e.target.checked)}
                  className="w-4 h-4 accent-brand-500"
                />
                <span className="text-xs font-semibold text-slate-700">Show me on the public leaderboard</span>
              </label>

              <div className="p-3 rounded-xl bg-cream-100 border-2 border-ink space-y-1">
                <span className="eyebrow text-slate-500">Device token</span>
                <p className="text-[11px] mono text-slate-700 break-all select-all">{visitorId}</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn w-full bg-brand-500 hover:bg-brand-600 text-white py-3 flex items-center justify-center gap-2 text-sm uppercase"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" /> Save profile
                  </>
                )}
              </button>
            </form>
          </div>
        </Modal>
      )}

      {savedMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full border-2 border-ink shadow-brut flex items-center gap-1.5 animate-fadeIn"
        >
          <Check className="w-4 h-4" aria-hidden="true" /> Profile updated
        </div>
      )}
    </>
  );
}
