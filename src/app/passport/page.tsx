'use client';

import React, { useEffect, useState } from 'react';
import { getOrInitVisitorId } from '@/lib/visitor';
import { getCheckpoints, getVisitorVisits, getRewardSetting, getVisitorRewardStatus, unlockVisitorReward } from '@/lib/supabase';
import { Checkpoint, BoothVisit, RewardSetting, VisitorReward } from '@/lib/types';
import StampCard from '@/components/StampCard';
import RewardModal from '@/components/RewardModal';
import { Ticket, Trophy, QrCode, Trophy as TrophyIcon, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PassportPage() {
  const [visitorId, setVisitorId] = useState<string>('');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [visits, setVisits] = useState<BoothVisit[]>([]);
  const [rewardSetting, setRewardSetting] = useState<RewardSetting | null>(null);
  const [visitorReward, setVisitorReward] = useState<VisitorReward | null>(null);
  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    async function loadPassportData() {
      const id = getOrInitVisitorId();
      setVisitorId(id);

      const [cList, vList, rSetting] = await Promise.all([
        getCheckpoints(),
        getVisitorVisits(id),
        getRewardSetting(),
      ]);

      setCheckpoints(cList);
      setVisits(vList);
      setRewardSetting(rSetting);

      const threshold = rSetting?.stamp_threshold || 8;
      if (vList.length >= threshold) {
        let rewardStatus = await getVisitorRewardStatus(id);
        if (!rewardStatus) {
          rewardStatus = await unlockVisitorReward(id);
        }
        setVisitorReward(rewardStatus);
      }
    }

    loadPassportData();
  }, []);

  const completedCount = visits.length;
  const threshold = rewardSetting?.stamp_threshold || 8;
  const totalBooths = checkpoints.length;
  const isUnlocked = completedCount >= threshold;
  const progressPercent = Math.min(Math.round((completedCount / threshold) * 100), 100);

  const visitsMap = new Map<string, BoothVisit>();
  visits.forEach(v => visitsMap.set(v.checkpoint_id, v));

  const filteredCheckpoints = checkpoints.filter(c => {
    const isDone = visitsMap.has(c.id);
    if (filter === 'completed') return isDone;
    if (filter === 'pending') return !isDone;
    return true;
  });

  const filters: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: checkpoints.length },
    { key: 'completed', label: 'Collected', count: completedCount },
    { key: 'pending', label: 'Pending', count: checkpoints.length - completedCount },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* PASSPORT HEADER */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-brand-500 border-2 border-ink flex items-center justify-center text-white shadow-brut">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="display text-2xl text-ink leading-none">Digital passport</h1>
              <p className="text-[11px] text-slate-500">Laluan Aspirasi @ FESKUM 2026</p>
            </div>
          </div>

          <div className="text-right">
            <span className="eyebrow text-slate-500 block">Stamps</span>
            <span className="mono text-xl font-bold text-brand-600">
              {completedCount} <span className="text-slate-400 font-normal text-sm">/ {totalBooths}</span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-cream-200 h-4 rounded-full overflow-hidden border-2 border-ink">
            <div
              className="bg-brand-500 h-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
            <span>{completedCount} of {threshold} required for reward</span>
            <span className="mono tnum">{progressPercent}%</span>
          </div>
        </div>

        {/* Stamp slots meter */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Array.from({ length: threshold }).map((_, i) => {
            const filled = i < completedCount;
            return (
              <span
                key={i}
                aria-hidden="true"
                className={`w-7 h-7 rounded-lg border-2 border-ink flex items-center justify-center ${
                  filled ? 'bg-emerald-500 text-white' : 'bg-cream-100 text-slate-300'
                }`}
              >
                {filled ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold tnum">{i + 1}</span>}
              </span>
            );
          })}
        </div>

        {/* Reward Status Banner */}
        {isUnlocked && (
          <div className="p-4 rounded-xl bg-gold-400 border-2 border-ink flex items-center justify-between animate-pulseGlow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink text-gold-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="display text-lg text-ink leading-none">Reward unlocked!</h4>
                <p className="text-[11px] text-ink/70">Show your badge at the HIR Helpdesk.</p>
              </div>
            </div>

            <button
              onClick={() => setShowRewardModal(true)}
              className="px-3.5 py-2 rounded-xl bg-ink text-cream-50 font-extrabold text-xs shrink-0"
            >
              Show badge
            </button>
          </div>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border-2 border-ink shadow-brut text-xs font-bold">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                filter === f.key ? 'bg-ink text-cream-50' : 'text-slate-500 hover:text-ink'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <Link
          href="/leaderboard"
          className="p-2.5 rounded-2xl bg-white border-2 border-ink shadow-brut text-ink hover:bg-cream-100"
          title="Leaderboard"
        >
          <TrophyIcon className="w-4 h-4 text-gold-500" />
        </Link>
      </div>

      {/* STAMPS GRID */}
      <div className="grid grid-cols-1 gap-3">
        {filteredCheckpoints.map((checkpoint, idx) => (
          <StampCard
            key={checkpoint.id}
            checkpoint={checkpoint}
            visit={visitsMap.get(checkpoint.id)}
            index={idx}
          />
        ))}

        {filteredCheckpoints.length === 0 && (
          <div className="text-center py-12 card p-6 space-y-2">
            {checkpoints.length === 0 ? (
              <>
                <QrCode className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-ink text-sm">No booths published yet</h4>
                <p className="text-xs text-slate-500">Check back once the exhibition floor opens.</p>
              </>
            ) : (
              <>
                <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-ink text-sm">
                  {filter === 'completed' ? 'No stamps yet' : 'All booths collected'}
                </h4>
                <p className="text-xs text-slate-500">
                  {filter === 'completed'
                    ? 'Scan a booth QR to start filling your passport.'
                    : 'Every booth has been stamped. Legendary.'}
                </p>
                <Link
                  href={filter === 'completed' ? '/scan' : '/leaderboard'}
                  className="btn inline-flex items-center gap-1.5 mt-2 px-3.5 py-2 bg-brand-500 text-white text-xs"
                >
                  {filter === 'completed' ? (
                    <>
                      <QrCode className="w-3.5 h-3.5" /> Scan a booth
                    </>
                  ) : (
                    <>
                      <Trophy className="w-3.5 h-3.5" /> View leaderboard
                    </>
                  )}
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* REWARD MODAL POPUP */}
      {showRewardModal && rewardSetting && visitorReward && (
        <RewardModal
          rewardSetting={rewardSetting}
          visitorReward={visitorReward}
          visitorId={visitorId}
          onClose={() => setShowRewardModal(false)}
        />
      )}
    </div>
  );
}
