'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getEvaluationReport } from '@/lib/supabase';
import { EvaluationReport, LeaderboardDay } from '@/lib/types';
import {
  Users,
  UserCheck,
  Star,
  Ticket,
  HelpCircle,
  ThumbsUp,
  Lightbulb,
  MessageSquare,
  Clock,
  RefreshCw,
} from 'lucide-react';

const DAY_TABS: { key: LeaderboardDay; label: string }[] = [
  { key: 'all', label: 'All days' },
  { key: 'day1', label: 'Day 1' },
  { key: 'day2', label: 'Day 2' },
];

const dateFormatter = new Intl.DateTimeFormat('en-MY', {
  timeZone: 'Asia/Kuala_Lumpur',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-14 shrink-0 mono text-slate-500 text-right">{label}</span>
      <div className="flex-1 h-5 rounded-md bg-cream-100 border-2 border-ink/10 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 mono font-bold text-ink">{value}</span>
    </div>
  );
}

export default function AdminEvaluationPage() {
  const [day, setDay] = useState<LeaderboardDay>('all');
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (selectedDay: LeaderboardDay) => {
    setLoading(true);
    const data = await getEvaluationReport(selectedDay);
    setReport(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(day);
  }, [day, load]);

  const maxHourly = report ? Math.max(1, ...report.hourly_traffic.map(h => h.visits)) : 1;
  const maxRating = report ? Math.max(1, ...Object.values(report.rating_distribution)) : 1;
  const funnelTotal = report ? report.funnel.zero_stamps + report.funnel.partial_stamps + report.funnel.completed : 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="display text-2xl text-ink leading-none">Evaluation</h1>
          <p className="text-[11px] text-slate-500 mt-1">Is the passport working? What to fix before the next day.</p>
        </div>
        <button
          onClick={() => load(day)}
          disabled={loading}
          className="btn p-2.5 bg-white text-ink disabled:opacity-60"
          aria-label="Refresh evaluation report"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border-2 border-ink shadow-brut text-xs font-bold">
        {DAY_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setDay(tab.key)}
            aria-pressed={day === tab.key}
            className={`flex-1 px-2 py-1.5 rounded-xl transition-colors ${
              day === tab.key ? 'bg-ink text-cream-50' : 'text-slate-500 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && !report ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-ink border-t-brand-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : report ? (
        <>
          {/* RECOMMENDATIONS */}
          <div className="card p-5 space-y-3 bg-gold-400/10 border-gold-500">
            <div className="flex items-center gap-2.5 border-b-2 border-ink/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-gold-400 border-2 border-ink flex items-center justify-center text-ink shrink-0">
                <Lightbulb className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-extrabold text-ink text-sm">What to change next</h2>
                <p className="text-[11px] text-slate-500">Rule-based flags from the numbers below, not a guess.</p>
              </div>
            </div>
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-ink leading-relaxed flex items-start gap-2">
                  <span className="text-gold-700 font-extrabold shrink-0">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* KPI GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Registered', value: report.registered_visitors, sub: 'Total identities', icon: Users, color: 'text-brand-600' },
              { label: 'Active', value: report.active_visitors, sub: 'Scanned ≥1 booth', icon: UserCheck, color: 'text-emerald-600' },
              { label: 'Completed', value: report.funnel.completed, sub: `Reached ${report.funnel.threshold} stamps`, icon: Ticket, color: 'text-brand-600' },
              { label: 'Avg Rating', value: report.avg_rating.toFixed(2), sub: 'This window', icon: Star, color: 'text-gold-500' },
              { label: 'Quiz Rate', value: `${Math.round(report.quiz.completion_rate * 100)}%`, sub: `${report.quiz.attempted}/${report.quiz.eligible_visits} attempted`, icon: HelpCircle, color: 'text-brand-600' },
              { label: 'Vote Rate', value: `${Math.round(report.voting.participation_rate * 100)}%`, sub: `${report.voting.votes} votes cast`, icon: ThumbsUp, color: 'text-gold-700' },
            ].map(kpi => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="card p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-slate-500">{kpi.label}</span>
                    <Icon className={`w-4 h-4 ${kpi.color}`} aria-hidden="true" />
                  </div>
                  <p className="display text-3xl text-ink leading-none">{kpi.value}</p>
                  <p className="text-[10px] text-slate-500">{kpi.sub}</p>
                </div>
              );
            })}
          </div>

          {/* FUNNEL */}
          <div className="card p-5 space-y-3">
            <span className="eyebrow text-slate-500">Passport funnel · active visitors</span>
            <div className="w-full h-8 rounded-xl overflow-hidden border-2 border-ink flex">
              {funnelTotal > 0 ? (
                <>
                  <div
                    className="h-full bg-rose-300 flex items-center justify-center text-[10px] font-bold text-ink"
                    style={{ width: `${(report.funnel.zero_stamps / funnelTotal) * 100}%` }}
                  >
                    {report.funnel.zero_stamps > 0 && report.funnel.zero_stamps}
                  </div>
                  <div
                    className="h-full bg-gold-400 flex items-center justify-center text-[10px] font-bold text-ink"
                    style={{ width: `${(report.funnel.partial_stamps / funnelTotal) * 100}%` }}
                  >
                    {report.funnel.partial_stamps > 0 && report.funnel.partial_stamps}
                  </div>
                  <div
                    className="h-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ width: `${(report.funnel.completed / funnelTotal) * 100}%` }}
                  >
                    {report.funnel.completed > 0 && report.funnel.completed}
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-cream-100 flex items-center justify-center text-[10px] text-slate-400">
                  No active visitors yet
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-300" /> 0 stamps</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gold-400" /> Partial</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Completed</span>
            </div>
          </div>

          {/* RATING DISTRIBUTION + HOURLY TRAFFIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card p-5 space-y-2.5">
              <span className="eyebrow text-slate-500 block mb-1">Rating distribution</span>
              {(['5', '4', '3', '2', '1'] as const).map(star => (
                <Bar
                  key={star}
                  label={`${star}★`}
                  value={report.rating_distribution[star]}
                  max={maxRating}
                  color={Number(star) >= 4 ? 'bg-emerald-500' : Number(star) === 3 ? 'bg-gold-400' : 'bg-rose-400'}
                />
              ))}
            </div>

            <div className="card p-5 space-y-2.5">
              <span className="eyebrow text-slate-500 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Hourly traffic (KL time)
              </span>
              {report.hourly_traffic.length === 0 ? (
                <p className="text-xs text-slate-400">No visits recorded yet.</p>
              ) : (
                report.hourly_traffic.map(h => (
                  <Bar key={h.hour} label={`${h.hour}:00`} value={h.visits} max={maxHourly} color="bg-brand-500" />
                ))
              )}
            </div>
          </div>

          {/* BOOTH PERFORMANCE */}
          <div className="card p-5 space-y-3">
            <span className="eyebrow text-slate-500">Booth performance</span>
            <div className="space-y-1.5">
              {report.booth_performance.length === 0 ? (
                <p className="text-xs text-slate-400">No booth data for this window.</p>
              ) : (
                report.booth_performance.map(b => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border-2 ${
                      b.visits > 0 && b.avg_rating > 0 && b.avg_rating < 3.5
                        ? 'bg-rose-50 border-rose-300'
                        : 'bg-cream-50 border-ink/10'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink truncate">{b.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {b.faculty}
                        {b.booth_type === 'partner' ? ' · Partner' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px] font-bold text-right">
                      <span className="mono text-ink">{b.visits} visits</span>
                      <span className="mono text-gold-600 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-gold-400 text-gold-400" aria-hidden="true" />
                        {b.avg_rating > 0 ? b.avg_rating.toFixed(1) : '—'}
                      </span>
                      {b.quiz_eligible && <span className="mono text-brand-600">{b.quiz_attempts} quiz</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* REVIEWS */}
          <div className="card p-5 space-y-3">
            <span className="eyebrow text-slate-500 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Written reviews ({report.reviews.length})
            </span>
            {report.reviews.length === 0 ? (
              <p className="text-xs text-slate-400">No written reviews in this window.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto overscroll-contain pr-1">
                {report.reviews.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-cream-50 border-2 border-ink/10">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-bold text-ink truncate">{r.booth_name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-gold-600">
                          <Star className="w-3 h-3 fill-gold-400 text-gold-400" aria-hidden="true" />
                          {r.rating}
                        </span>
                        <span className="text-[10px] text-slate-400 mono">{dateFormatter.format(new Date(r.visited_at))}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic">&ldquo;{r.review}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
