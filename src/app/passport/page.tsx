'use client';

import React, { useEffect, useState } from 'react';
import { getOrInitVisitorId } from '@/lib/visitor';
import { getCheckpoints, getVisitorVisits, getRewardSetting, getVisitorRewardStatus, unlockVisitorReward } from '@/lib/supabase';
import { Checkpoint, BoothVisit, RewardSetting, VisitorReward } from '@/lib/types';
import StampCard from '@/components/StampCard';
import RewardModal from '@/components/RewardModal';
import { Ticket, Trophy, QrCode } from 'lucide-react';
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

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* PASSPORT HEADER */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 font-display lowercase">digital passport.</h1>
              <p className="text-xs text-slate-500">Laluan Aspirasi @ FESKUM 2026</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block">Stamps</span>
            <span className="text-xl font-mono font-extrabold text-brand-600">
              {completedCount} <span className="text-slate-400 font-normal text-sm">/ {totalBooths}</span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-brand-500 h-full rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
            <span>{completedCount} of {threshold} required for reward</span>
            <span>{progressPercent}% Complete</span>
          </div>
        </div>

        {/* Reward Status Banner */}
        {isUnlocked && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between animate-pulseGlow shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-amber-900 text-xs uppercase tracking-wider">🎉 REWARD UNLOCKED!</h4>
                <p className="text-[11px] text-amber-800">Show your reward badge at the DTC Helpdesk.</p>
              </div>
            </div>

            <button
              onClick={() => setShowRewardModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs shadow-md hover:bg-amber-400 transition-all shrink-0"
            >
              Show Badge
            </button>
          </div>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 text-xs font-bold shadow-sm">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All ({checkpoints.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === 'completed' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Collected ({completedCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Pending ({checkpoints.length - completedCount})
          </button>
        </div>

        <Link
          href="/checkpoint/qr-eng-robotics"
          className="p-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 border border-slate-200 shadow-sm"
          title="Scan QR Demo"
        >
          <QrCode className="w-4 h-4 text-brand-600" />
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
