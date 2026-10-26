'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { VisitorReward, RewardSetting } from '@/lib/types';
import Modal from '@/components/Modal';

interface RewardModalProps {
  rewardSetting: RewardSetting;
  visitorReward: VisitorReward;
  visitorId: string;
  onClose: () => void;
}

export default function RewardModal({ rewardSetting, visitorReward, visitorId, onClose }: RewardModalProps) {
  useEffect(() => {
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
  }, []);

  const isClaimed = visitorReward.status === 'claimed';

  return (
    <Modal onClose={onClose} labelledBy="reward-title" panelClassName="border-gold-500">
      <div className="p-6 text-center">
        {/* Celebration Gift Icon */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gold-400 border-2 border-ink flex items-center justify-center shadow-brut animate-bounce">
          <Gift className="w-10 h-10 text-ink" aria-hidden="true" />
        </div>

        <span className="sticker bg-gold-400 text-ink text-[10px] mb-2">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Reward unlocked
        </span>

        <h3 id="reward-title" className="display text-2xl text-ink mb-2 mt-2">{rewardSetting.title}</h3>

        <p className="text-xs text-slate-600 mb-6 leading-relaxed">{rewardSetting.description}</p>

        {/* Claim Status Card */}
        <div className="p-4 rounded-xl bg-cream-100 border-2 border-ink mb-6 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-slate-500">Redemption status</span>
            {isClaimed ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center gap-1 border-2 border-ink">
                <CheckCircle2 className="w-3 h-3" /> CLAIMED
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-gold-400 text-ink font-extrabold text-[10px] flex items-center gap-1 border-2 border-ink">
                READY
              </span>
            )}
          </div>

          <div className="pt-2 border-t-2 border-ink/10">
            <span className="eyebrow text-slate-500">Show this to HIR Helpdesk staff</span>
            <div className="mt-1 p-2.5 rounded-lg bg-white border-2 border-ink flex items-center justify-between">
              <span className="text-xs mono font-bold text-brand-600 truncate max-w-[200px] select-all">
                ID: {visitorId}
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn w-full py-3 bg-gold-400 hover:bg-gold-500 text-ink text-sm uppercase"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}
