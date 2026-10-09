'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminAnalytics } from '@/lib/supabase';
import { BoothAnalytics } from '@/lib/types';
import { ShieldCheck, Users, Ticket, Star, ThumbsUp, Gift, QrCode, Download, Settings, Lock, CheckCircle2, Award, ChevronRight } from 'lucide-react';

export default function AdminOverviewPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [passError, setPassError] = useState<boolean>(false);

  const [analytics, setAnalytics] = useState<{
    totalVisitors: number;
    totalVisits: number;
    avgOverallRating: string;
    totalVotes: number;
    rewardsUnlocked: number;
    rewardsClaimed: number;
    boothAnalytics: BoothAnalytics[];
  } | null>(null);

  useEffect(() => {
    // Check local session
    const authed = sessionStorage.getItem('mindswap_admin_authed');
    if (authed === 'true') {
      setIsAuthenticated(true);
      loadAnalytics();
    }
  }, []);

  async function loadAnalytics() {
    const data = await getAdminAnalytics();
    setAnalytics(data);
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin2026' || passcode === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('mindswap_admin_authed', 'true');
      setPassError(false);
      loadAnalytics();
    } else {
      setPassError(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="py-12 animate-fadeIn max-w-sm mx-auto space-y-6">
        <div className="glass-card rounded-3xl p-6 border border-brand-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 text-brand-300 flex items-center justify-center mx-auto border border-brand-500/40">
            <Lock className="w-8 h-8 text-brand-400" />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-white font-display">MindSwap Admin Portal</h2>
            <p className="text-xs text-slate-400 mt-1">Organiser Authentication Required</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Admin Passcode
              </label>
              <input
                type="password"
                placeholder="Enter passcode (default: admin2026)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-400"
              />
            </div>

            {passError && (
              <p className="text-xs text-rose-400 font-bold text-center">
                Invalid passcode! Use: admin2026
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-400 hover:from-brand-500 hover:to-brand-300 text-slate-950 font-bold text-sm shadow-lg shadow-brand-500/25 transition-all"
            >
              Sign In to Admin Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ADMIN HEADER */}
      <div className="glass-card rounded-3xl p-5 border border-brand-500/30 bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white font-display">Admin Operations</h1>
            <p className="text-xs text-slate-400">MindSwap @ FESKUM 2026 Realtime Control</p>
          </div>
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem('mindswap_admin_authed');
            setIsAuthenticated(false);
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          Sign Out
        </button>
      </div>

      {/* ADMIN SUB-NAVIGATION TABS */}
      <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 text-[11px] font-bold text-center shadow-sm">
        <Link href="/admin" className="py-2 rounded-xl bg-slate-900 text-white">
          Overview
        </Link>
        <Link href="/admin/booths" className="py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100">
          Booths
        </Link>
        <Link href="/admin/speakers" className="py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100">
          Speakers
        </Link>
        <Link href="/admin/rewards" className="py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100">
          Helpdesk
        </Link>
        <Link href="/admin/export" className="py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100">
          Export
        </Link>
      </div>

      {/* KPI ANALYTICS GRID */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Unique Visitors</span>
              <Users className="w-4 h-4 text-brand-400" />
            </div>
            <p className="text-2xl font-extrabold text-white font-mono">{analytics.totalVisitors}</p>
            <p className="text-[10px] text-slate-400">Registered browser identities</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Booth Stamps</span>
              <Ticket className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold text-white font-mono">{analytics.totalVisits}</p>
            <p className="text-[10px] text-slate-400">Total QR visits logged</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Avg Booth Rating</span>
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold text-amber-300 font-mono">{analytics.avgOverallRating} <span className="text-xs font-normal text-slate-500">/ 5.00</span></p>
            <p className="text-[10px] text-slate-400">Overall visitor satisfaction</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Rewards Claimed</span>
              <Gift className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-extrabold text-purple-300 font-mono">{analytics.rewardsClaimed} <span className="text-xs font-normal text-slate-500">/ {analytics.rewardsUnlocked}</span></p>
            <p className="text-[10px] text-slate-400">DTC helpdesk redemptions</p>
          </div>
        </div>
      )}

      {/* BEST FACULTY BOOTH PERFORMANCE TABLE */}
      {analytics && (
        <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-extrabold text-white text-sm font-display">Best Faculty Booth Standings</h3>
                <p className="text-[11px] text-slate-400">Ranked by footfall & visitor star ratings</p>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Live Data
            </span>
          </div>

          <div className="space-y-2 overflow-x-auto">
            {analytics.boothAnalytics.map((booth, idx) => (
              <div
                key={booth.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate">{booth.name}</h4>
                    <p className="text-[10px] text-brand-400">{booth.faculty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <span className="font-mono font-bold text-white block">{booth.total_visits}</span>
                    <span className="text-[9px] text-slate-500 uppercase">Visits</span>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-amber-400 block">★ {booth.avg_rating}</span>
                    <span className="text-[9px] text-slate-500 uppercase">Avg Stars</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
