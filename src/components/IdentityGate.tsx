'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, BadgeCheck } from 'lucide-react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { getOrInitVisitorId, setVisitorId, setVisitorIdentity, getVisitorIdentity } from '@/lib/visitor';
import { registerVisitorIdentity } from '@/lib/supabase';
import { FACULTIES } from '@/lib/faculties';

export default function IdentityGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const adminTaps = useRef(0);
  const lastTapAt = useRef(0);

  const handleHiddenAdminTap = () => {
    const now = Date.now();
    if (now - lastTapAt.current > 2000) adminTaps.current = 0;
    lastTapAt.current = now;
    adminTaps.current += 1;
    if (adminTaps.current >= 5) {
      adminTaps.current = 0;
      router.push('/admin');
    }
  };

  const [name, setName] = useState('');
  const [matric, setMatric] = useState('');
  const [faculty, setFaculty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reclaimed, setReclaimed] = useState(false);

  useEffect(() => {
    const identity = getVisitorIdentity();
    setComplete(identity.complete);
    setReady(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !faculty.trim()) {
      setError('Please fill in your name and faculty to continue.');
      return;
    }
    setSubmitting(true);

    const { showOnLeaderboard } = getVisitorIdentity();
    const localId = getOrInitVisitorId();
    const { visitorId, reclaimed: wasReclaimed } = await registerVisitorIdentity(localId, {
      name,
      matric,
      faculty,
      showOnLeaderboard,
    });
    if (visitorId && visitorId !== localId) setVisitorId(visitorId);

    setVisitorIdentity({ name, matric, faculty, showOnLeaderboard });
    setReclaimed(wasReclaimed);
    setSubmitting(false);
    setComplete(true);
  };

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-ink border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Admin portal is gated by its own passcode, not the attendee identity.
  if (pathname?.startsWith('/admin')) {
    return <main id="main-content" className="relative z-10 flex-1 max-w-md w-full mx-auto px-4 py-4">{children}</main>;
  }

  if (!complete) {
    return (
      <div className="flex-1 flex flex-col">
        <main id="main-content" className="flex-1 max-w-md w-full mx-auto px-5 py-8 space-y-5">
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleHiddenAdminTap}
              className="eyebrow text-brand-600"
              aria-label="Laluan Aspirasi"
            >
              // Laluan Aspirasi
            </button>
            <h1 className="display text-5xl text-ink">
              Start your<br />passport
            </h1>
            <p className="text-sm text-slate-600 max-w-[34ch]">
              Scan booth QR codes to collect stamps and unlock your reward.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-5 space-y-4">
            <div>
              <label htmlFor="identity-name" className="eyebrow text-slate-500 block mb-1.5">
                01 / Full name
              </label>
              <input
                id="identity-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Danish Aiman"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={60}
                className="w-full px-4 py-3 rounded-xl bg-cream-50 border-2 border-ink text-ink placeholder-slate-400 text-base font-semibold focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="identity-matric" className="eyebrow text-slate-500 block mb-1.5">
                02 / Matric / Student ID <span className="normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <input
                id="identity-matric"
                name="matric"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. U2001234 / CB12345"
                value={matric}
                onChange={e => setMatric(e.target.value)}
                maxLength={40}
                className="w-full px-4 py-3 rounded-xl bg-cream-50 border-2 border-ink text-ink placeholder-slate-400 text-base font-semibold mono focus:outline-none focus:bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Used to reunite your stamps if you switch devices.
              </p>
            </div>

            <div>
              <label htmlFor="identity-faculty" className="eyebrow text-slate-500 block mb-1.5">
                03 / Faculty
              </label>
              <select
                id="identity-faculty"
                name="faculty"
                value={faculty}
                onChange={e => setFaculty(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-cream-50 border-2 border-ink text-ink text-base font-semibold focus:outline-none focus:bg-white"
              >
                <option value="" disabled>
                  Select your faculty…
                </option>
                {FACULTIES.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p role="alert" aria-live="polite" className="text-xs font-bold text-brand-700 bg-brand-50 border-2 border-brand-500 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn w-full bg-brand-500 hover:bg-brand-600 text-white py-3.5 flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Start passport <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> No password · No email · One-time setup
            </p>
          </form>

          {reclaimed && (
            <p className="text-xs text-emerald-700 font-bold text-center">
              <Sparkles className="w-3.5 h-3.5 inline" /> Welcome back — we restored your existing progress.
            </p>
          )}
        </main>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main id="main-content" className="relative z-10 flex-1 max-w-md w-full mx-auto px-4 py-4">{children}</main>
      <Navbar />
    </>
  );
}
