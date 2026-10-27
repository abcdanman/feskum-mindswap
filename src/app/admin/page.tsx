'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminAnalytics, checkAdminWrite } from '@/lib/supabase';
import { Users, Ticket, Star, Gift, Award, Trophy, ShieldCheck, ShieldAlert, RefreshCw, HelpCircle, Handshake } from 'lucide-react';

export default function AdminOverviewPage() {
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getAdminAnalytics>> | null>(null);
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);

  useEffect(() => {
    loadAnalytics();
    runWriteCheck();
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function runWriteCheck() {
    setCheckingDb(true);
    const res = await checkAdminWrite();
    setDbStatus(res);
    setCheckingDb(false);
  }

  async function loadAnalytics() {
    const data = await getAdminAnalytics();
    setAnalytics(data);
  }

  const partnerBooths = analytics?.boothAnalytics.filter(booth => booth.booth_type === 'partner') || [];
  const partnerVisits = partnerBooths.reduce((sum, booth) => sum + booth.total_visits, 0);
  const kpis = analytics
    ? [
        { label: 'Visitors', value: analytics.totalVisitors, sub: 'Registered identities', icon: Users, color: 'text-brand-600' },
        { label: 'Stamps', value: analytics.totalVisits, sub: 'QR visits logged', icon: Ticket, color: 'text-emerald-600' },
        { label: 'Partner', value: partnerVisits, sub: 'Bonus stamps', icon: Handshake, color: 'text-amber-600' },
        { label: 'Quizzes', value: analytics.totalQuizCompletions, sub: `${analytics.totalQuizPoints} bonus pts`, icon: HelpCircle, color: 'text-brand-600' },
        { label: 'Avg Rating', value: `${analytics.avgOverallRating}`, sub: 'Overall satisfaction', icon: Star, color: 'text-gold-500' },
        { label: 'Claimed', value: `${analytics.rewardsClaimed}/${analytics.rewardsUnlocked}`, sub: 'Helpdesk redemptions', icon: Gift, color: 'text-purple-600' },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* KPI ANALYTICS GRID */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3">
          {kpis.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-slate-500">{kpi.label}</span>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <p className="display text-4xl text-ink leading-none">{kpi.value}</p>
                <p className="text-[10px] text-slate-500">{kpi.sub}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* DATABASE WRITE HEALTH CHECK */}
      <div
        className={`card p-4 flex items-center gap-3 border-2 ${
          dbStatus && !dbStatus.ok ? 'border-rose-300 bg-rose-50' : 'border-ink/10'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 border-ink ${
            checkingDb ? 'bg-white text-slate-400' : dbStatus?.ok ? 'bg-emerald-400 text-ink' : 'bg-rose-400 text-white'
          }`}
        >
          {checkingDb ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : dbStatus?.ok ? (
            <ShieldCheck className="w-4 h-4" />
          ) : (
            <ShieldAlert className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-ink text-sm">Database write access</h3>
          <p className="text-[11px] text-slate-500 break-words">
            {checkingDb ? 'Checking…' : dbStatus?.message || 'Not checked yet.'}
          </p>
        </div>
        <button onClick={runWriteCheck} disabled={checkingDb} className="btn px-2.5 py-1.5 bg-white text-ink text-[11px] shrink-0">
          Re-check
        </button>
      </div>

      <Link href="/leaderboard" className="card card-hover p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-gold-500" aria-hidden="true" />
          <div>
            <h3 className="font-extrabold text-ink text-sm">Attendee Leaderboard</h3>
            <p className="text-[11px] text-slate-500">View the public full standings</p>
          </div>
        </div>
        <span className="eyebrow text-brand-600">View →</span>
      </Link>

      {/* PEOPLE'S CHOICE LIVE TALLY */}
      {analytics && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" aria-hidden="true" />
              <div>
                <h3 className="display text-xl text-ink leading-none">People&apos;s Choice</h3>
                <p className="text-[11px] text-slate-500">
                  {analytics.totalVotes} vote{analytics.totalVotes === 1 ? '' : 's'} cast · updates every 30s
                </p>
              </div>
            </div>
            <Link href="/admin/export" className="eyebrow text-brand-600">Export</Link>
          </div>

          <div className="space-y-2">
            {[...analytics.speakers]
              .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
              .map((speaker, idx) => (
                <div key={speaker.id} className="p-2.5 rounded-xl bg-cream-100 border-2 border-ink/10 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-[10px] shrink-0 border-2 border-ink ${
                      idx === 0 ? 'bg-gold-400 text-ink' : 'bg-white text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-ink truncate">{speaker.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{speaker.organisation}</p>
                    </div>
                  </div>
                  <span className="mono font-bold text-purple-700 shrink-0">{speaker.vote_count || 0}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* BEST FACULTY BOOTH PERFORMANCE TABLE */}
      {analytics && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-gold-500" />
              <div>
                <h3 className="display text-xl text-ink leading-none">Best booth standings</h3>
                <p className="text-[11px] text-slate-500">Required faculty booths · ranked by footfall & star ratings</p>
              </div>
            </div>
            <span className="sticker bg-gold-400 text-ink text-[9px]">Live</span>
          </div>

          <div className="space-y-2">
            {analytics.boothAnalytics.filter(booth => booth.booth_type !== 'partner').map((booth, idx) => (
              <div key={booth.id} className="p-3 rounded-xl bg-cream-100 border-2 border-ink/10 flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 border-2 border-ink ${
                    idx === 0 ? 'bg-gold-400 text-ink' : 'bg-white text-slate-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-ink truncate">{booth.name}</h4>
                    <p className="text-[10px] text-brand-600">{booth.faculty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <span className="mono font-bold text-ink block">{booth.total_visits}</span>
                    <span className="eyebrow text-slate-400">Visits</span>
                  </div>
                  <div>
                    <span className="mono font-bold text-gold-600 block">★ {booth.avg_rating}</span>
                    <span className="eyebrow text-slate-400">Stars</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics && partnerBooths.length > 0 && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3">
            <div className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="display text-xl text-ink leading-none">Partner booths</h3>
                <p className="text-[11px] text-slate-500">Bonus stops · excluded from Best Booth</p>
              </div>
            </div>
            <span className="sticker bg-gold-400 text-ink text-[9px]">Bonus</span>
          </div>

          <div className="space-y-2">
            {partnerBooths.map(booth => (
              <div key={booth.id} className="p-3 rounded-xl bg-amber-50 border-2 border-ink/10 flex items-center justify-between text-xs gap-2">
                <div className="min-w-0">
                  <h4 className="font-bold text-ink truncate">{booth.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{booth.faculty}</p>
                </div>
                <div className="flex items-center gap-3 text-right shrink-0">
                  <div>
                    <span className="mono font-bold text-ink block">{booth.total_visits}</span>
                    <span className="eyebrow text-slate-400">Stamps</span>
                  </div>
                  <div>
                    <span className="mono font-bold text-brand-600 block">{booth.quiz_completions}</span>
                    <span className="eyebrow text-slate-400">Quiz</span>
                  </div>
                  <div>
                    <span className="mono font-bold text-gold-600 block">{booth.quiz_points}</span>
                    <span className="eyebrow text-slate-400">Pts</span>
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
