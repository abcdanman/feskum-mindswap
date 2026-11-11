'use client';

import React, { useEffect, useState } from 'react';
import { getOrInitVisitorId, getVisitorIdentity } from '@/lib/visitor';
import { getCheckpoints, getVisitorVisits, getRewardSetting, getVisitorRewardStatus, unlockVisitorReward, getVisitorRank } from '@/lib/supabase';
import { Checkpoint, BoothVisit, RewardSetting, VisitorReward, RankingMetric } from '@/lib/types';
import StampCard from '@/components/StampCard';
import RewardModal from '@/components/RewardModal';
import ShareCardModal from '@/components/ShareCardModal';
import BoothStamp from '@/components/BoothStamp';
import { ShareCardData } from '@/lib/shareCard';
import { PassportPdfData } from '@/lib/passportPdf';
import { Ticket, Trophy, QrCode, Trophy as TrophyIcon, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function PassportPage() {
  const [visitorId, setVisitorId] = useState<string>('');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [visits, setVisits] = useState<BoothVisit[]>([]);
  const [rewardSetting, setRewardSetting] = useState<RewardSetting | null>(null);
  const [visitorReward, setVisitorReward] = useState<VisitorReward | null>(null);
  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareCardData, setShareCardData] = useState<ShareCardData | null>(null);
  const [pdfData, setPdfData] = useState<PassportPdfData | null>(null);
  const [shareLoading, setShareLoading] = useState<boolean>(false);
  const [identity, setIdentity] = useState<{ name: string; username: string | null }>({ name: '', username: null });

  useEffect(() => {
    async function loadPassportData() {
      const id = getOrInitVisitorId();
      setVisitorId(id);
      const localIdentity = getVisitorIdentity();
      setIdentity({ name: localIdentity.name, username: localIdentity.username || null });

      const [cList, vList, rSetting] = await Promise.all([
        getCheckpoints(),
        getVisitorVisits(id),
        getRewardSetting(),
      ]);

      setCheckpoints(cList);
      setVisits(vList);
      setRewardSetting(rSetting);

      const threshold = rSetting?.stamp_threshold || 8;
      const requiredCount = vList.filter(v => v.checkpoint?.booth_type !== 'partner').length;
      if (requiredCount >= threshold) {
        let rewardStatus = await getVisitorRewardStatus(id);
        if (!rewardStatus) {
          rewardStatus = await unlockVisitorReward(id);
        }
        if (rewardStatus) setVisitorReward(rewardStatus);
      }
    }

    loadPassportData();
  }, []);

  const threshold = rewardSetting?.stamp_threshold || 8;
  const checkpointMap = new Map(checkpoints.map(c => [c.id, c]));
  const requiredVisits = visits.filter(
    v => (checkpointMap.get(v.checkpoint_id)?.booth_type ?? 'required') !== 'partner'
  );
  const partnerCheckpoints = checkpoints.filter(c => c.booth_type === 'partner');
  const sortedRequiredVisits = [...requiredVisits].sort(
    (a, b) => new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime()
  );
  const completedRequired = requiredVisits.length;
  const completedPartner = visits.length - completedRequired;
  const partnerTrailComplete =
    partnerCheckpoints.length > 0 && completedPartner >= partnerCheckpoints.length;
  const isUnlocked = completedRequired >= threshold;
  const progressPercent = Math.min(Math.round((completedRequired / threshold) * 100), 100);

  const visitsMap = new Map<string, BoothVisit>();
  visits.forEach(v => visitsMap.set(v.checkpoint_id, v));

  const filteredCheckpoints = checkpoints.filter(c => {
    const isDone = visitsMap.has(c.id);
    if (filter === 'completed') return isDone;
    if (filter === 'pending') return !isDone;
    return true;
  });

  const handleOpenShare = async () => {
    setShareLoading(true);
    const identity = getVisitorIdentity();
    const metric = (rewardSetting?.ranking_metric || 'points') as RankingMetric;
    const rank = visitorId ? await getVisitorRank(visitorId, metric, 'all') : null;
    const sortedBooths = visits
      .filter(v => v.checkpoint)
      .map(v => ({ name: v.checkpoint!.name, faculty: v.checkpoint!.faculty, visitedAt: v.visited_at }))
      .sort((a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime());
    setShareCardData({
      name: identity.name || 'Visitor',
      username: identity.username || null,
      stamps: completedRequired,
      threshold,
      partnerStamps: completedPartner,
      totalBooths: checkpoints.length,
      rank: rank?.rank || null,
      totalRanked: rank?.total || null,
      points: rank?.entry?.points ?? null,
      isComplete: isUnlocked,
      booths: sortedBooths,
    });
    setPdfData({
      name: identity.name || 'Visitor',
      username: identity.username || null,
      stamps: completedRequired,
      threshold,
      totalBooths: checkpoints.length,
      rank: rank?.rank || null,
      totalRanked: rank?.total || null,
      points: rank?.entry?.points ?? null,
      isComplete: isUnlocked,
      booths: sortedBooths,
    });
    setShareLoading(false);
    setShowShareModal(true);
  };

  const filters: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: checkpoints.length },
    { key: 'completed', label: 'Collected', count: visits.length },
    { key: 'pending', label: 'Pending', count: checkpoints.length - visits.length },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* PASSPORT HEADER — ink cover, matching the Passport share card's look */}
      <div className="card p-5 bg-ink text-cream-50 space-y-4 relative overflow-hidden">
        <div className="absolute inset-3 border border-gold-500/30 rounded-xl pointer-events-none" aria-hidden="true" />

        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-full border-2 border-gold-500 flex items-center justify-center text-gold-400 shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="display text-3xl text-gold-400 leading-none">Digital Passport</h1>
            <p className="text-[11px] text-cream-50/55 uppercase tracking-wide">Innovation Passport · FESKUM 2026</p>
          </div>
        </div>

        {/* Bio line — same three-column layout as the Passport share card */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gold-500/25">
          <div className="min-w-0">
            <span className="block mono text-[9.5px] text-cream-50/50 uppercase tracking-wide">Holder</span>
            <span className="block font-bold text-sm text-cream-50 truncate">{identity.name || 'Visitor'}</span>
          </div>
          <div className="min-w-0">
            <span className="block mono text-[9.5px] text-cream-50/50 uppercase tracking-wide">Stamps</span>
            <span className="block font-bold text-sm text-cream-50">{completedRequired} / {threshold}</span>
            {partnerCheckpoints.length > 0 && (
              <span className="block text-[9px] text-cream-50/45">+{completedPartner} external</span>
            )}
          </div>
          <div className="min-w-0">
            <span className="block mono text-[9.5px] text-cream-50/50 uppercase tracking-wide">Handle</span>
            <span className="block font-bold text-sm text-cream-50 truncate">{identity.username ? `@${identity.username}` : '—'}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-cream-50/10 h-4 rounded-full overflow-hidden border-2 border-gold-500/40">
            <div
              className="bg-gold-400 h-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-cream-50/60 font-semibold px-0.5">
            <span>{completedRequired} of {threshold} required for reward</span>
            <span className="mono tnum">{progressPercent}%</span>
          </div>
        </div>

        {/* Stamp meter — the actual booths you've visited, in order, same
           ink-stamp visual as the share card and the checkpoint success
           screen, not a generic numbered square. */}
        <div className="flex flex-wrap gap-2 justify-center pt-1">
          {Array.from({ length: threshold }).map((_, i) => {
            const visit = sortedRequiredVisits[i];
            const stampedCheckpoint = visit ? checkpointMap.get(visit.checkpoint_id) : null;
            return stampedCheckpoint ? (
              <BoothStamp
                key={stampedCheckpoint.id}
                faculty={stampedCheckpoint.faculty}
                name={stampedCheckpoint.name}
                seed={stampedCheckpoint.id}
                size={54}
              />
            ) : (
              <BoothStamp key={`open-${i}`} faculty="" name="" seed={String(i)} filled={false} placeholder={`${i + 1}`} size={54} tone="dark" />
            );
          })}
        </div>

        {/* Reward Status Banner */}
        {isUnlocked && (
          <div className="p-4 rounded-xl bg-gold-400 border-2 border-ink flex items-center justify-between gap-2 animate-pulseGlow">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-ink text-gold-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="display text-lg text-ink leading-none">Reward unlocked!</h4>
                <p className="text-[11px] text-ink/70">Show your badge at the HIR Helpdesk.</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleOpenShare}
                disabled={shareLoading}
                aria-label="Share your progress"
                className="p-2.5 rounded-xl bg-ink text-gold-400 disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowRewardModal(true)}
                className="px-3.5 py-2 rounded-xl bg-ink text-cream-50 font-extrabold text-xs"
              >
                Show badge
              </button>
            </div>
          </div>
        )}

        {/* Share CTA — before the reward unlocks there's nothing to "show",
           but there's already progress worth bragging about. */}
        {!isUnlocked && completedRequired > 0 && (
          <button
            onClick={handleOpenShare}
            disabled={shareLoading}
            className="w-full p-3 rounded-xl bg-cream-100 border-2 border-ink flex items-center justify-between gap-2 disabled:opacity-60 hover:bg-cream-200 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-ink">
              <Share2 className="w-4 h-4 text-brand-600" aria-hidden="true" />
              Share your progress
            </span>
            <span className="text-[10px] text-slate-500">{completedRequired}/{threshold} stamped →</span>
          </button>
        )}
      </div>

      {partnerCheckpoints.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-slate-500">External trail</span>
            <span className="mono text-sm font-bold text-brand-600">
              {completedPartner} / {partnerCheckpoints.length}
            </span>
          </div>
          <div className="w-full bg-cream-200 h-3 rounded-full overflow-hidden border-2 border-ink">
            <div
              className="bg-gold-400 h-full transition-all duration-700"
              style={{ width: `${partnerCheckpoints.length ? Math.round((completedPartner / partnerCheckpoints.length) * 100) : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Optional bonus stops · +5 points each
            {partnerTrailComplete ? ' · trail complete +10!' : ''}
          </p>
        </div>
      )}

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

      {showShareModal && shareCardData && (
        <ShareCardModal data={shareCardData} pdfData={pdfData} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}
