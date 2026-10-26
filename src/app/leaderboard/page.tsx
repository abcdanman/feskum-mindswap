'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Medal, Crown, Ticket, ArrowRight } from 'lucide-react';
import { getOrInitVisitorId } from '@/lib/visitor';
import { getLeaderboard, getVisitorRank, getRewardSetting } from '@/lib/supabase';
import { LeaderboardEntry, RankingMetric } from '@/lib/types';

const METRIC_LABEL: Record<RankingMetric, string> = {
  stamps: 'Booth Stamps',
  points: 'Points',
  stamps_rating: 'Stamps · Rating',
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<{ rank: number; total: number; entry: LeaderboardEntry | null } | null>(null);
  const [metric, setMetric] = useState<RankingMetric>('stamps');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const visitorId = getOrInitVisitorId();
      const setting = await getRewardSetting();
      const m = (setting.ranking_metric || 'stamps') as RankingMetric;
      setMetric(m);
      const [board, rank] = await Promise.all([
        getLeaderboard(10, m, visitorId),
        getVisitorRank(visitorId, m),
      ]);
      setEntries(board);
      setMe(rank);
      setLoading(false);
    }
    load();
  }, []);

  const medal = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-gold-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return null;
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-brand-600">// live standings</span>
        <span className="text-[10px] mono font-bold text-slate-500 uppercase">
          ranked by {METRIC_LABEL[metric]}
        </span>
      </div>

      <h1 className="display text-4xl text-ink leading-none">
        Leader<br />board
      </h1>

      {/* Personal rank card */}
      {me && me.entry ? (
        <div className="card p-4 bg-ink text-cream-50 border-ink tnum">
          <div className="flex items-center justify-between">
            <div>
              <span className="eyebrow text-cream-200/70">Your rank</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="display text-5xl text-brand-400">#{me.rank}</span>
                <span className="text-xs text-cream-200/70">of {me.total} ranked</span>
              </div>
            </div>
            <div className="text-right">
              <span className="eyebrow text-cream-200/70">Stamps</span>
              <p className="display text-4xl text-cream-50">{me.entry.stamps}</p>
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="card p-4 bg-cream-100">
            <p className="text-xs font-bold text-slate-600">
              You&apos;re not ranked yet — collect your first booth stamp to enter the leaderboard.
            </p>
          </div>
        )
      )}

      {/* PODIUM: top 3 */}
      {!loading && entries.length > 0 && (
        <div className="card p-4">
          <span className="eyebrow text-slate-400 block mb-3 text-center">// podium</span>
          <div className="flex items-end justify-center gap-2">
            {[entries[1], entries[0], entries[2]].map((entry, col) => {
              const heightClass = ['h-14', 'h-24', 'h-10'][col];
              const colorClass = ['bg-slate-300', 'bg-gold-400', 'bg-amber-700'][col];
              const place = [2, 1, 3][col];
              return (
                <div key={col} className="flex-1 max-w-[100px] flex flex-col items-center gap-1.5">
                  {entry ? (
                    <>
                      <div className="w-10 h-10 rounded-xl border-2 border-ink bg-ink flex items-center justify-center shrink-0">
                        <span className="display text-lg text-cream-50 leading-none">
                          {entry.name.trim().charAt(0) || '?'}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold text-ink text-center line-clamp-1 w-full">
                        {entry.name}
                      </span>
                    </>
                  ) : (
                    <div className="w-10 h-10" />
                  )}
                  <div
                    className={`w-full ${heightClass} ${entry ? colorClass : 'bg-cream-100'} border-2 border-ink rounded-t-lg flex items-start justify-center pt-1`}
                  >
                    <span className="display text-xl text-ink leading-none">{entry ? place : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 10 list */}
      <div className="space-y-2 tnum">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-3 flex items-center gap-3">
              <div className="w-8 h-7 rounded-md bg-slate-200 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded bg-slate-200 animate-pulse" />
                <div className="h-2.5 w-1/3 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="h-7 w-8 rounded-md bg-slate-200 animate-pulse shrink-0" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="card p-8 text-center space-y-2">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-ink">No rankings yet</p>
            <p className="text-xs text-slate-500">Be the first to collect a stamp and claim the top spot.</p>
          </div>
        ) : (
          entries.map(entry => (
            <div
              key={entry.visitor_id}
              className={`card p-3 flex items-center gap-3 ${
                entry.is_you ? 'bg-brand-50 border-brand-500' : 'bg-white'
              }`}
            >
              <span className="display text-2xl text-slate-300 w-8 text-center shrink-0">
                {entry.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {medal(entry.rank)}
                  <span className="font-extrabold text-ink text-sm truncate">
                    {entry.name}
                    {entry.is_you && <span className="text-brand-600"> (you)</span>}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mono">
                  {entry.stamps} stamps{entry.votes > 0 ? ` · ${entry.votes} votes` : ''}
                  {metric !== 'stamps' ? ` · ${entry.points} pts` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="display text-2xl text-brand-600">
                  {metric === 'points' ? entry.points : entry.stamps}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Link href="/passport" className="btn flex-1 bg-white text-ink py-2.5 flex items-center justify-center gap-1.5 text-xs">
          <Ticket className="w-4 h-4 text-brand-600" /> My passport
        </Link>
        <Link href="/scan" className="btn flex-1 bg-brand-500 text-white py-2.5 flex items-center justify-center gap-1.5 text-xs">
          Scan a booth <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
