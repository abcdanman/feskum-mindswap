'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Lock, Home } from 'lucide-react';

const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || 'admin2026';
const AUTH_KEY = 'mindswap_admin_authed';

const ADMIN_TABS = [
  { label: 'Overview', href: '/admin' },
  { label: 'Booths', href: '/admin/booths' },
  { label: 'Speakers', href: '/admin/speakers' },
  { label: 'Helpdesk', href: '/admin/rewards' },
  { label: 'Export', href: '/admin/export' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState(false);

  useEffect(() => {
    setIsAuthenticated(sessionStorage.getItem(AUTH_KEY) === 'true');
    setReady(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE || passcode === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem(AUTH_KEY, 'true');
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setPasscode('');
    setPassError(false);
  };

  if (!ready) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-ink border-t-brand-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-10 animate-fadeIn max-w-sm mx-auto space-y-5">
        <div className="card p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 border-2 border-ink flex items-center justify-center mx-auto shadow-brut">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <div>
            <span className="eyebrow text-brand-600">// restricted</span>
            <h2 className="display text-3xl text-ink mt-1">Admin portal</h2>
            <p className="text-xs text-slate-500 mt-1">Organiser authentication required</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label htmlFor="admin-passcode" className="eyebrow text-slate-500 block mb-1">Admin passcode</label>
              <input
                id="admin-passcode"
                name="passcode"
                type="password"
                autoComplete="current-password"
                autoFocus
                placeholder="default: admin2026"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-cream-50 border-2 border-ink text-ink placeholder-slate-400 text-base focus:bg-white"
              />
            </div>

            {passError && (
              <p role="alert" aria-live="polite" className="text-xs text-brand-700 font-bold text-center bg-brand-50 border-2 border-brand-500 rounded-xl py-2">
                Invalid passcode. Try again.
              </p>
            )}

            <button
              type="submit"
              className="btn w-full py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm uppercase"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ADMIN HEADER */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border-2 border-ink flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="display text-2xl text-ink leading-none">Control room</h1>
            <p className="text-[11px] text-slate-500">MindSwap @ FESKUM 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            className="btn p-2 bg-white text-ink"
            aria-label="Back to home"
            title="Back to home"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
          </Link>
          <button
            onClick={handleSignOut}
            className="btn px-3 py-1.5 bg-white text-ink text-[11px]"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ADMIN SUB-NAVIGATION TABS */}
      <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-2xl bg-white border-2 border-ink shadow-brut text-[11px] font-bold text-center">
        {ADMIN_TABS.map(tab => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`py-2 rounded-lg transition-colors ${
                isActive ? 'bg-ink text-cream-50' : 'text-slate-600 hover:text-ink hover:bg-cream-100'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
