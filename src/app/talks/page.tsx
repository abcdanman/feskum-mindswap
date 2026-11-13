'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSpeakers, getVotingStatus } from '@/lib/supabase';
import { Speaker, VotingStatus } from '@/lib/types';
import SpeakerCard from '@/components/SpeakerCard';
import { Mic, Calendar, Award, ArrowRight } from 'lucide-react';

export default function TalksPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [votingStatus, setVotingStatus] = useState<VotingStatus | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('13 Nov 2026');

  useEffect(() => {
    async function loadTalks() {
      const [spkList, status] = await Promise.all([getSpeakers(), getVotingStatus()]);
      setSpeakers(spkList);
      setVotingStatus(status);
    }
    loadTalks();
  }, []);

  // Some sessions are seeded with a combined "13-14 Nov 2026" date;
  // treat those as running on both days instead of hiding them.
  const filteredSpeakers = speakers.filter(s => {
    const date = s.session_date || '';
    if (!date) return true;
    if (date.includes('13-14')) return true;
    return date === selectedDate;
  });

  const days = [
    { value: '13 Nov 2026', label: 'Day 1 · 13 Nov' },
    { value: '14 Nov 2026', label: 'Day 2 · 14 Nov' },
  ];

  const votingOpen = Boolean(votingStatus?.is_active);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER BANNER */}
      <div className="card p-5 space-y-3 bg-brand-500 border-ink text-white">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/15 border-2 border-white/30 flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h1 className="display text-2xl leading-none">UM Talk Live</h1>
            <p className="text-[11px] text-white/80">
              {speakers.length} speakers · Kemuncak Aspirasi Main Stage
            </p>
          </div>
        </div>

        {/* PEOPLE'S CHOICE ENTRY POINT — a live button once voting opens,
            otherwise just an informational header with no call to action. */}
        {votingOpen ? (
          <Link
            href="/talks/vote"
            className="p-3.5 rounded-xl bg-white/10 border-2 border-white/25 flex items-center justify-between hover:bg-white/15 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-gold-300 shrink-0" aria-hidden="true" />
              <div>
                <h4 className="font-bold text-xs">{votingStatus?.title || "People's Choice Award"}</h4>
                <p className="text-[10px] text-white/70">Vote for your favourite — tap to open</p>
              </div>
            </div>
            <span className="sticker bg-gold-400 text-ink text-[9px] flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform">
              Vote now <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </span>
          </Link>
        ) : (
          <div className="p-3.5 rounded-xl bg-white/10 border-2 border-white/25 flex items-center gap-2.5">
            <Award className="w-5 h-5 text-gold-300 shrink-0" aria-hidden="true" />
            <div>
              <h4 className="font-bold text-xs">People&apos;s Choice Award 2026</h4>
              <p className="text-[10px] text-white/70">Opens once judges announce the top 3 finalists</p>
            </div>
          </div>
        )}
      </div>

      {/* DATE SELECTOR TABS */}
      <div className="flex items-center gap-2">
        {days.map(day => (
          <button
            key={day.value}
            onClick={() => setSelectedDate(day.value)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors border-2 border-ink ${
              selectedDate === day.value ? 'bg-brand-500 text-white' : 'bg-white text-slate-600'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1" /> {day.label}
          </button>
        ))}
      </div>

      {/* SPEAKER TIMELINE CARDS — read-only listing, no voting here */}
      <div className="grid grid-cols-1 gap-3">
        {filteredSpeakers.map(speaker => (
          <SpeakerCard key={speaker.id} speaker={speaker} />
        ))}

        {filteredSpeakers.length === 0 && (
          <div className="text-center py-12 card p-6 space-y-2">
            <Mic className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-ink text-sm">No sessions for this day yet</h4>
            <p className="text-xs text-slate-500">Check the other day or come back closer to the event.</p>
            <button
              onClick={() => setSelectedDate(days.find(d => d.value !== selectedDate)?.value || selectedDate)}
              className="btn inline-flex items-center gap-1.5 mt-2 px-3.5 py-2 bg-brand-500 text-white text-xs"
            >
              <Calendar className="w-3.5 h-3.5" /> See the other day
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
