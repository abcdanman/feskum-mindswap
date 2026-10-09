'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRewardSetting, saveRewardSetting, getVisitorRewardStatus, claimVisitorReward, getVisitorVisits } from '@/lib/supabase';
import { RewardSetting, VisitorReward } from '@/lib/types';
import { Gift, ShieldCheck, CheckCircle2, ArrowLeft, Save, Search, UserCheck, AlertTriangle } from 'lucide-react';

export default function AdminRewardsPage() {
  const [rewardSetting, setRewardSetting] = useState<RewardSetting | null>(null);
  const [thresholdInput, setThresholdInput] = useState<number>(8);
  const [titleInput, setTitleInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Helpdesk Redemption State
  const [searchVisitorId, setSearchVisitorId] = useState<string>('');
  const [searchedReward, setSearchedReward] = useState<VisitorReward | null>(null);
  const [visitorStampCount, setVisitorStampCount] = useState<number>(0);
  const [searchDone, setSearchDone] = useState<boolean>(false);
  const [staffName, setStaffName] = useState<string>('DTC Helpdesk Staff A');
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
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveRewardSetting({
      stamp_threshold: thresholdInput,
      title: titleInput,
      description: descInput,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLookupVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVisitorId.trim()) return;

    const [reward, visits] = await Promise.all([
      getVisitorRewardStatus(searchVisitorId.trim()),
      getVisitorVisits(searchVisitorId.trim())
    ]);

    setSearchedReward(reward);
    setVisitorStampCount(visits.length);
    setSearchDone(true);
    setClaimMsg('');
  };

  const handleClaim = async () => {
    if (!searchVisitorId.trim()) return;
    const updated = await claimVisitorReward(searchVisitorId.trim(), staffName);
    if (updated) {
      setSearchedReward(updated);
      setClaimMsg('✓ Souvenir successfully marked as CLAIMED!');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center gap-2">
        <Link href="/admin" className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold text-white font-display">Reward Config & DTC Helpdesk</h1>
          <p className="text-xs text-slate-400">Configure stamp threshold & redeem visitor prizes</p>
        </div>
      </div>

      {/* STAFF HELPDESK REDEMPTION SCANNER */}
      <div className="glass-card rounded-3xl p-5 border-2 border-amber-500/40 bg-gradient-to-b from-slate-900 to-slate-950 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-white text-sm">DTC Helpdesk Prize Claim Tool</h2>
            <p className="text-[11px] text-slate-400">Enter or scan Visitor ID to verify eligibility</p>
          </div>
        </div>

        <form onSubmit={handleLookupVisitor} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste Visitor ID Token..."
              value={searchVisitorId}
              onChange={(e) => setSearchVisitorId(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
            >
              <Search className="w-4 h-4" /> Verify
            </button>
          </div>
        </form>

        {/* LOOKUP RESULT CARD */}
        {searchDone && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400">Total Booth Stamps Collected:</span>
              <span className="text-brand-300 font-mono text-sm">{visitorStampCount} Stamps</span>
            </div>

            {searchedReward ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold">Reward Status</span>
                  {searchedReward.status === 'claimed' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/30">
                      ALREADY CLAIMED
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      READY FOR REDEMPTION
                    </span>
                  )}
                </div>

                {searchedReward.status === 'claimed' ? (
                  <p className="text-[11px] text-slate-400 italic">
                    Claimed on {new Date(searchedReward.claimed_at || '').toLocaleString()} by {searchedReward.claimed_by_staff}
                  </p>
                ) : (
                  <div className="pt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Staff Name / ID"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                    <button
                      onClick={handleClaim}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <UserCheck className="w-4 h-4" /> MARK PRIZE AS CLAIMED
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>This visitor has not reached the required stamp threshold ({thresholdInput} stamps) yet.</span>
              </div>
            )}

            {claimMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs text-center animate-bounce">
                {claimMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* REWARD THRESHOLD CONFIG */}
      <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-4">
        <h3 className="font-extrabold text-white text-sm font-display flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-400" /> Reward Threshold Settings
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Required Stamps for Reward Unlock</label>
            <input
              type="number"
              min={1}
              max={20}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-brand-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Reward Title</label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Reward Instructions</label>
            <textarea
              rows={2}
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-400 resize-none"
            />
          </div>

          {savedSuccess && (
            <p className="text-xs text-emerald-400 font-bold text-center">
              ✓ Reward threshold updated successfully!
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Reward Settings
          </button>
        </form>
      </div>
    </div>
  );
}
