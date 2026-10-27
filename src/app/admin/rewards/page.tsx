'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getRewardSetting,
  saveRewardSetting,
  getVisitorRewardStatus,
  claimVisitorReward,
  getVisitorVisits,
  findVisitorByUsername,
} from '@/lib/supabase';
import { RewardSetting, VisitorReward, RankingMetric, AdminAnalyticsVisitor } from '@/lib/types';
import { Gift, ShieldCheck, CheckCircle2, ArrowLeft, Save, Search, UserCheck, AlertTriangle, Trophy } from 'lucide-react';

const inputCls =
  'w-full p-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink text-sm focus:outline-none focus:bg-white';

export default function AdminRewardsPage() {
  const [rewardSetting, setRewardSetting] = useState<RewardSetting | null>(null);
  const [thresholdInput, setThresholdInput] = useState<number>(8);
  const [titleInput, setTitleInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');
  const [metricInput, setMetricInput] = useState<RankingMetric>('points');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Helpdesk Redemption State
  const [searchVisitorId, setSearchVisitorId] = useState<string>('');
  const [searchedReward, setSearchedReward] = useState<VisitorReward | null>(null);
  const [visitorStampCount, setVisitorStampCount] = useState<number>(0);
  const [searchDone, setSearchDone] = useState<boolean>(false);
  const [searchedVisitor, setSearchedVisitor] = useState<AdminAnalyticsVisitor | null>(null);
  const [searchedVisitorId, setSearchedVisitorId] = useState<string>('');
  const [staffName, setStaffName] = useState<string>('HIR Helpdesk Staff A');
  const [claimMsg, setClaimMsg] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const setting = await getRewardSetting();
    setRewardSetting(setting);
    setThresholdInput(setting.stamp_threshold);
    setTitleInput(setting.title);
    setDescInput(setting.description);
    setMetricInput((setting.ranking_metric || 'points') as RankingMetric);
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await saveRewardSetting({
      stamp_threshold: thresholdInput,
      title: titleInput,
      description: descInput,
      ranking_metric: metricInput,
    });
    if (error) {
      alert(`Save failed: ${error}`);
      return;
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLookupVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchVisitorId.trim().replace(/^@+/, '');
    if (!query) return;

    const found = await findVisitorByUsername(query);
    const visitorId = found?.id || query;
    const [reward, visits] = await Promise.all([
      getVisitorRewardStatus(visitorId),
      getVisitorVisits(visitorId),
    ]);
    const requiredCount = visits.filter(v => v.checkpoint?.booth_type !== 'partner').length;

    setSearchedVisitor(found);
    setSearchedVisitorId(visitorId);
    setSearchedReward(reward);
    setVisitorStampCount(requiredCount);
    setSearchDone(true);
    setClaimMsg('');
  };

  const handleClaim = async () => {
    if (!searchedVisitorId) return;
    const updated = await claimVisitorReward(searchedVisitorId, staffName);
    if (updated) {
      setSearchedReward(updated);
      setClaimMsg('Souvenir marked as CLAIMED.');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center gap-2">
        <Link href="/admin" className="p-2 rounded-xl bg-white text-ink border-2 border-ink shadow-brut">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="display text-2xl text-ink leading-none">Helpdesk</h1>
          <p className="text-[11px] text-slate-500">Redeem prizes & configure rewards / ranking</p>
        </div>
      </div>

      {/* HELPDESK REDEMPTION */}
      <div className="card p-5 space-y-4 bg-gold-400/10">
        <div className="flex items-center gap-2.5 border-b-2 border-ink/10 pb-3">
          <div className="w-10 h-10 rounded-xl bg-gold-400 border-2 border-ink flex items-center justify-center text-ink">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-ink text-sm">Prize claim tool</h2>
            <p className="text-[11px] text-slate-500">Look up by @username or Visitor ID</p>
          </div>
        </div>

        <form onSubmit={handleLookupVisitor} className="flex gap-2">
          <input
            type="text"
            placeholder="@username or Visitor ID…"
            value={searchVisitorId}
            onChange={e => setSearchVisitorId(e.target.value)}
            className={`${inputCls} flex-1 mono !text-xs`}
          />
          <button type="submit" className="btn px-4 bg-gold-400 text-ink flex items-center gap-1 text-xs shrink-0">
            <Search className="w-4 h-4" /> Verify
          </button>
        </form>

        {searchDone && (
          <div className="p-4 rounded-xl bg-white border-2 border-ink space-y-3">
            {searchedVisitor && (
              <div className="p-2.5 rounded-xl bg-cream-100 border-2 border-ink/10">
                <p className="text-xs font-bold text-ink">
                  {searchedVisitor.display_name || 'Visitor'}
                  {searchedVisitor.username && <span className="text-brand-600"> · @{searchedVisitor.username}</span>}
                </p>
                {searchedVisitor.student_id && (
                  <p className="text-[10px] mono text-slate-500">{searchedVisitor.student_id}</p>
                )}
              </div>
            )}
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">Required stamps collected</span>
              <span className="text-brand-600 mono text-sm">{visitorStampCount}</span>
            </div>

            {searchedReward ? (
              <div className="p-3 rounded-xl bg-cream-100 border-2 border-ink/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-semibold">Reward status</span>
                  {searchedReward.status === 'claimed' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border-2 border-ink">
                      CLAIMED
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border-2 border-ink">
                      READY
                    </span>
                  )}
                </div>

                {searchedReward.status === 'claimed' ? (
                  <p className="text-[11px] text-slate-500 italic">
                    Claimed {new Date(searchedReward.claimed_at || '').toLocaleString()} by {searchedReward.claimed_by_staff}
                  </p>
                ) : (
                  <div className="pt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Staff name / ID"
                      value={staffName}
                      onChange={e => setStaffName(e.target.value)}
                      className={`${inputCls} !text-xs`}
                    />
                    <button
                      onClick={handleClaim}
                      className="btn w-full py-2.5 bg-emerald-500 text-white text-xs flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" /> Mark prize claimed
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-50 border-2 border-ink text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Not eligible yet — needs {thresholdInput} required stamps.</span>
              </div>
            )}

            {claimMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs text-center border-2 border-ink">
                {claimMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* THRESHOLD + RANKING CONFIG */}
      <div className="card p-5 space-y-4">
        <h3 className="display text-xl text-ink leading-none flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-600" /> Settings
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
          <div>
            <label className="eyebrow text-slate-500 block mb-1">Required stamps for reward</label>
            <input
              type="number"
              min={1}
              max={20}
              value={thresholdInput}
              onChange={e => setThresholdInput(Number(e.target.value))}
              className={`${inputCls} mono`}
            />
          </div>

          <div>
            <label className="eyebrow text-slate-500 block mb-1 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-gold-500" /> Leaderboard ranking metric
            </label>
            <select
              value={metricInput}
              onChange={e => setMetricInput(e.target.value as RankingMetric)}
              className={inputCls}
            >
              <option value="stamps">Booth stamps collected</option>
              <option value="stamps_rating">Stamps, tie-broken by rating given</option>
              <option value="points">Points (required ×10 + partner ×5 + trail +10 + quiz +5/correct + votes ×25)</option>
            </select>
          </div>

          <div>
            <label className="eyebrow text-slate-500 block mb-1">Reward title</label>
            <input
              type="text"
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="eyebrow text-slate-500 block mb-1">Reward instructions</label>
            <textarea
              rows={2}
              value={descInput}
              onChange={e => setDescInput(e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>

          {savedSuccess && (
            <p className="text-xs text-emerald-600 font-bold text-center flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings updated
            </p>
          )}

          <button type="submit" className="btn w-full py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm flex items-center justify-center gap-1.5 uppercase">
            <Save className="w-4 h-4" /> Save settings
          </button>
        </form>
      </div>
    </div>
  );
}
