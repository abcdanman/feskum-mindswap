'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ticket, Compass, Mic, Sparkles, MapPin, Calendar, Award, QrCode, ArrowRight } from 'lucide-react';
import { getOrInitVisitorId } from '@/lib/visitor';
import { getVisitorVisits, getCheckpoints, getRewardSetting } from '@/lib/supabase';
import { Checkpoint, RewardSetting } from '@/lib/types';

export default function HomePage() {
  const [stampCount, setStampCount] = useState<number>(0);
  const [totalBooths, setTotalBooths] = useState<number>(12);
  const [rewardSetting, setRewardSetting] = useState<RewardSetting | null>(null);
  const [featuredBooths, setFeaturedBooths] = useState<Checkpoint[]>([]);

  useEffect(() => {
    async function loadData() {
      const visitorId = getOrInitVisitorId();
      const visits = await getVisitorVisits(visitorId);
      const checkpoints = await getCheckpoints();
      const setting = await getRewardSetting();

      setStampCount(visits.length);
      setTotalBooths(checkpoints.length);
      setRewardSetting(setting);
      setFeaturedBooths(checkpoints.slice(0, 3));
    }
    loadData();
  }, []);

  const progressPercent = Math.min(Math.round((stampCount / (rewardSetting?.stamp_threshold || 8)) * 100), 100);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* HERO MOODBOARD HEADER BANNER */}
      <div className="relative rounded-3xl p-6 bg-white border border-slate-200/80 shadow-md space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Kemuncak Aspirasi
          </span>
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
            FESKUM 2026
          </span>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display lowercase">
            event overview.
          </h1>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
            MindSwap is FESKUM 2026&apos;s flagship 2-day intellectual and interactive festival — transforming undergraduate innovation into shared national insight.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-700 font-semibold">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
            <span>11–12 November 2026</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="truncate">Central Marquee, DTC</span>
          </div>
        </div>

        {/* Quick Passport Widget */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="text-slate-900 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-brand-600" /> Digital Passport
            </span>
            <span className="text-brand-600 font-mono text-sm">{stampCount} / {rewardSetting?.stamp_threshold || 8} Stamps</span>
          </div>

          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-brand-500 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 font-medium">
              {stampCount >= (rewardSetting?.stamp_threshold || 8) ? '🎉 Reward Unlocked!' : `${(rewardSetting?.stamp_threshold || 8) - stampCount} more stamps to reward`}
            </span>
            <Link
              href="/passport"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Open Passport <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ACTION GRID NAVIGATION */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/passport"
          className="bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-32 group"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 group-hover:scale-105 transition-transform">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-brand-600 transition-colors font-display">Digital Passport</h3>
            <p className="text-[11px] text-slate-500">Track booth stamps</p>
          </div>
        </Link>

        <Link
          href="/exhibition"
          className="bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-32 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors font-display">Exhibition Booths</h3>
            <p className="text-[11px] text-slate-500">12 Faculty Checkpoints</p>
          </div>
        </Link>

        <Link
          href="/talks"
          className="bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-32 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-600 transition-colors font-display">UM Talk & Voting</h3>
            <p className="text-[11px] text-slate-500">16 Speaker Sessions</p>
          </div>
        </Link>

        <Link
          href="/checkpoint/qr-eng-robotics"
          className="bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-32 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-amber-700 transition-colors font-display">Demo Checkpoint</h3>
            <p className="text-[11px] text-slate-500">Simulate QR scan</p>
          </div>
        </Link>
      </div>

      {/* HOW IT WORKS / PASSPORT LOOP GUIDE */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5 font-display">
          <Award className="w-4 h-4 text-brand-600" /> Visitor Experience Loop
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-7 h-7 mx-auto mb-1.5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-extrabold">1</div>
            <p className="text-[11px] font-bold text-slate-900">Scan QR Code</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Use phone camera</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-7 h-7 mx-auto mb-1.5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-extrabold">2</div>
            <p className="text-[11px] font-bold text-slate-900">Rate Showcase</p>
            <p className="text-[9px] text-slate-500 mt-0.5">1-5 star review</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-7 h-7 mx-auto mb-1.5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-extrabold">3</div>
            <p className="text-[11px] font-bold text-slate-900">Claim Reward</p>
            <p className="text-[9px] text-slate-500 mt-0.5">At DTC Helpdesk</p>
          </div>
        </div>
      </div>

      {/* FEATURED BOOTHS CAROUSEL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm font-display">Featured Exhibition Checkpoints</h3>
          <Link href="/exhibition" className="text-xs font-bold text-brand-600 hover:text-brand-700">
            View All ({totalBooths}) →
          </Link>
        </div>

        <div className="space-y-2.5">
          {featuredBooths.map((booth) => (
            <Link
              key={booth.id}
              href={`/checkpoint/${booth.qr_token}`}
              className="bg-white hover:bg-slate-50 rounded-xl p-3 border border-slate-200/80 shadow-sm flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  <img src={booth.image_url || ''} alt={booth.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-brand-600 transition-colors line-clamp-1">{booth.name}</h4>
                  <p className="text-[10px] text-brand-600 font-bold">{booth.faculty}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 flex items-center gap-1">
                Scan <QrCode className="w-3.5 h-3.5 text-brand-600" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
