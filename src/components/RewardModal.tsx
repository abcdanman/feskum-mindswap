'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { VisitorReward, RewardSetting } from '@/lib/types';

interface RewardModalProps {
  rewardSetting: RewardSetting;
  visitorReward: VisitorReward;
  visitorId: string;
  onClose: () => void;
}

export default function RewardModal({ rewardSetting, visitorReward, visitorId, onClose }: RewardModalProps) {
  useEffect(() => {
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 }
    });
  }, []);

  const isClaimed = visitorReward.status === 'claimed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 border-2 border-amber-400 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Gift Icon */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 p-0.5 shadow-lg shadow-amber-400/30 animate-bounce">
          <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
            <Gift className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-extrabold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" /> REWARD UNLOCKED
        </span>

        <h3 className="font-extrabold text-slate-900 text-xl mb-2 font-display">
          {rewardSetting.title}
        </h3>

        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          {rewardSetting.description}
        </p>

        {/* Claim Status Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Redemption Status</span>
            {isClaimed ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center gap-1 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> CLAIMED
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs flex items-center gap-1 border border-amber-300">
                READY TO REDEEM
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold uppercase">Show this to DTC Helpdesk Staff</span>
            <div className="mt-1 p-2.5 rounded-xl bg-white border border-slate-300 flex items-center justify-between shadow-sm">
              <span className="text-xs font-mono font-extrabold text-brand-600 truncate max-w-[200px]">
                ID: {visitorId}
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20 transition-all"
        >
          Got It, Thanks!
        </button>
      </div>
    </div>
  );
}
