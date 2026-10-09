'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Sparkles, X, Check, ShieldCheck } from 'lucide-react';
import { getOrInitVisitorId, getVisitorName, setVisitorName } from '@/lib/visitor';

export default function Header() {
  const [visitorId, setVisitorId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>('');
  const [savedMsg, setSavedMsg] = useState<boolean>(false);

  useEffect(() => {
    const id = getOrInitVisitorId();
    setVisitorId(id);
    setName(getVisitorName());
  }, []);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setVisitorName(tempName);
    setName(tempName.trim());
    setIsEditing(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const openDrawer = () => {
    setTempName(name);
    setIsEditing(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-brand-500 p-0.5 shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-slate-900 font-display text-base uppercase">mindswap.</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-brand-500 text-white">2026</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Laluan Aspirasi @ FESKUM</p>
            </div>
          </Link>

          <button
            onClick={openDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-xs font-semibold text-slate-800"
            aria-label="Visitor Profile"
          >
            <div className="w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="max-w-[80px] truncate">{name || 'Visitor'}</span>
          </button>
        </div>
      </header>

      {/* Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg font-display">Visitor Identity</h3>
                <p className="text-xs text-slate-500">Zero login required • Anonymous</p>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Danish"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm"
                  maxLength={30}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Appears on your digital stamp receipts and passport status.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Visitor Token ID:</span>
                </div>
                <p className="text-[11px] font-mono text-slate-800 break-all select-all">
                  {visitorId}
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all"
              >
                <Check className="w-4 h-4" /> Save Identity
              </button>
            </form>
          </div>
        </div>
      )}

      {savedMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
          <Check className="w-4 h-4" /> Identity Updated Successfully!
        </div>
      )}
    </>
  );
}
