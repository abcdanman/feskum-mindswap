'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ticket, Compass, MapPin, Calendar, ArrowRight, QrCode, ScanLine, Star, Gift, Trophy } from 'lucide-react';
import BoothThumb from '@/components/BoothThumb';
import { getOrInitVisitorId, getVisitorIdentity } from '@/lib/visitor';
import { getVisitorVisits, getCheckpoints, getRewardSetting } from '@/lib/supabase';
import { Checkpoint, RewardSetting } from '@/lib/types';

export default function HomePage() {
  const [stampCount, setStampCount] = useState<number>(0);
  const [partnerCount, setPartnerCount] = useState<number>(0);
  const [totalBooths, setTotalBooths] = useState<number>(12);
  const [requiredBoothCount, setRequiredBoothCount] = useState<number>(0);
  const [partnerBoothCount, setPartnerBoothCount] = useState<number>(0);
  const [rewardSetting, setRewardSetting] = useState<RewardSetting | null>(null);
  const [featuredBooths, setFeaturedBooths] = useState<Checkpoint[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    async function loadData() {
      const visitorId = getOrInitVisitorId();
      const visits = await getVisitorVisits(visitorId);
      const checkpoints = await getCheckpoints();
      const setting = await getRewardSetting();

      const checkpointMap = new Map(checkpoints.map(c => [c.id, c]));
      const requiredVisits = visits.filter(
        v => (checkpointMap.get(v.checkpoint_id)?.booth_type ?? 'required') !== 'partner'
      );
      const partnerBooths = checkpoints.filter(c => c.booth_type === 'partner');
      const requiredBooths = checkpoints.filter(c => c.booth_type !== 'partner');

      setStampCount(requiredVisits.length);
      setPartnerCount(visits.length - requiredVisits.length);
      setTotalBooths(checkpoints.length);
      setRequiredBoothCount(requiredBooths.length);
      setPartnerBoothCount(partnerBooths.length);
      setRewardSetting(setting);
      setFeaturedBooths((requiredBooths.length > 0 ? requiredBooths : checkpoints).slice(0, 3));
      setName(getVisitorIdentity().name.split(' ')[0] || 'delegate');
    }
    loadData();
  }, []);

  const threshold = rewardSetting?.stamp_threshold || 8;
  const progressPercent = Math.min(Math.round((stampCount / threshold) * 100), 100);
  const unlocked = stampCount >= threshold;

  const actions = [
    {
      href: '/exhibition',
      label: 'Booths',
      sub: `${requiredBoothCount} required${partnerBoothCount > 0 ? ` · ${partnerBoothCount} partner` : ''}`,
      icon: Compass,
      accent: 'bg-blue-500',
    },
    { href: '/leaderboard', label: 'Leaderboard', sub: 'Live standings', icon: Trophy, accent: 'bg-gold-500' },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* HERO */}
      <div className="relative card p-5 bg-ink text-cream-50 overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="sticker bg-brand-500 text-white text-[9px] shrink-0">Laluan Aspirasi</span>
          <span className="eyebrow text-cream-200/70">FESKUM 2026</span>
        </div>

        <p className="eyebrow text-brand-400 mb-1.5">Welcome, {name}.</p>
        <h1 className="display text-5xl text-cream-50 leading-[0.9]">
          Kemuncak<br /><span className="text-brand-400">Aspirasi!</span>
        </h1>
        <p className="text-xs text-cream-200/80 mt-2.5 leading-relaxed">
          Explore faculty booths. Collect stamps. Vote for your favourite.
        </p>

        <div className="pt-4 mt-4 border-t-2 border-cream-50/15 space-y-2.5 text-[11px] text-cream-100 font-semibold">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-snug">Marquee Tent, High Impact Research Building</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-400 shrink-0" aria-hidden="true" /> 13–14 Nov 2026
            </span>
            <span aria-hidden="true" className="text-cream-50/30">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-brand-400 shrink-0" aria-hidden="true" /> Free entry
            </span>
          </div>
        </div>
      </div>

      {/* PASSPORT WIDGET */}
      <div className="card p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-slate-500 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-brand-600" /> Digital Passport
          </span>
          <span className="mono tnum text-sm font-bold text-brand-600">
            {stampCount} / {threshold}
          </span>
        </div>

        <div className="w-full bg-cream-200 h-4 rounded-full overflow-hidden border-2 border-ink">
          <div className="bg-brand-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500 font-medium">
            {unlocked ? 'Reward unlocked!' : `${Math.max(threshold - stampCount, 0)} more required stamps`}
            {partnerCount > 0 && <span className="text-slate-400"> · {partnerCount} partner</span>}
          </span>
          <Link href="/passport" className="text-xs font-extrabold text-brand-600 hover:text-brand-700 flex items-center gap-1 uppercase">
            Open <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ACTION GRID */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="card card-hover p-4 flex flex-col justify-between h-32 group"
            >
              <div className={`w-10 h-10 rounded-xl ${action.accent} border-2 border-ink flex items-center justify-center text-white`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="display text-lg text-ink leading-none group-hover:text-brand-600 transition-colors">
                  {action.label}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">{action.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* SCAN CTA */}
      <Link href="/scan" className="card card-hover p-4 flex items-center justify-between bg-brand-500 border-ink">
        <div className="flex items-center gap-3 text-white">
          <ScanLine className="w-7 h-7" />
          <div>
            <h3 className="display text-xl leading-none">Scan a booth</h3>
            <p className="text-[11px] text-white/80">Open the camera to collect a stamp</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-white" />
      </Link>

      {/* HOW IT WORKS */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="display text-xl text-ink leading-none">How it works</h3>
          <span className="eyebrow text-slate-400">3 steps</span>
        </div>
        <div className="flex items-center gap-1">
          {[
            { n: '01', t: 'Scan QR', s: 'Point phone camera', icon: ScanLine, accent: 'bg-brand-500' },
            { n: '02', t: 'Rate booth', s: 'Give 1–5 stars', icon: Star, accent: 'bg-gold-500' },
            { n: '03', t: 'Redeem', s: 'Claim at helpdesk', icon: Gift, accent: 'bg-emerald-600' },
          ].map((step, i, arr) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.n}>
                <div className="flex-1 flex flex-col items-center text-center gap-1.5">
                  <div className={`relative w-11 h-11 rounded-xl ${step.accent} border-2 border-ink flex items-center justify-center text-white shadow-brut`}>
                    <Icon className="w-5 h-5" />
                    <span className="absolute -top-2 -left-2 bg-ink text-cream-50 text-[9px] font-bold rounded-md px-1 py-0.5 leading-none">
                      {step.n}
                    </span>
                  </div>
                  <p className="text-[11px] font-extrabold text-ink leading-none">{step.t}</p>
                  <p className="text-[9px] text-slate-500 leading-tight">{step.s}</p>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 -mt-5" aria-hidden="true" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* FEATURED BOOTHS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="display text-xl text-ink leading-none">Featured booths</h3>
          <Link href="/exhibition" className="text-xs font-extrabold text-brand-600 uppercase">
            All {totalBooths} →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {featuredBooths.map(booth => (
            <Link
              key={booth.id}
              href="/exhibition"
              className="card card-hover overflow-hidden group"
            >
              <div className="relative h-24 border-b-2 border-ink overflow-hidden">
                <BoothThumb src={booth.image_url} alt={booth.name} iconClassName="w-8 h-8" className="group-hover:scale-105 transition-transform duration-300" />
                <span className="absolute bottom-1.5 left-1.5 sticker bg-ink text-cream-50 text-[8px] max-w-[80%] truncate">{booth.category}</span>
                <QrCode className="absolute top-1.5 right-1.5 w-4 h-4 text-white drop-shadow" />
              </div>
              <div className="p-2.5">
                <h4 className="font-extrabold text-ink text-[11px] group-hover:text-brand-600 transition-colors line-clamp-2 leading-tight">{booth.name}</h4>
                <p className="text-[10px] text-brand-600 font-bold truncate mt-0.5">{booth.faculty}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
