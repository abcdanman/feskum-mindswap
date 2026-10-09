'use client';

import React, { useEffect, useState } from 'react';
import { getSpeakers, hasVisitorVoted, submitSpeakerVote } from '@/lib/supabase';
import { Speaker } from '@/lib/types';
import { getOrInitVisitorId } from '@/lib/visitor';
import SpeakerCard from '@/components/SpeakerCard';
import { Mic, ThumbsUp, Calendar, CheckCircle2, Award, Sparkles } from 'lucide-react';

export default function TalksPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [visitorId, setVisitorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('11 Nov 2026');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadTalks() {
      const id = getOrInitVisitorId();
      setVisitorId(id);

      const [spkList, voted] = await Promise.all([
        getSpeakers(),
        hasVisitorVoted(id)
      ]);

      setSpeakers(spkList);
      setHasVoted(voted);
    }

    loadTalks();
  }, []);

  const handleVote = async (speakerId: string) => {
    const res = await submitSpeakerVote(visitorId, speakerId);
    if (res.success) {
      setHasVoted(true);
      setMessage({ text: '🎉 Thank you! Your People Choice vote has been recorded.', type: 'success' });
      // Refresh speakers
      const updated = await getSpeakers();
      setSpeakers(updated);
    } else {
      setMessage({ text: res.message || 'Already voted.', type: 'error' });
    }

    setTimeout(() => setMessage(null), 4000);
  };

  const filteredSpeakers = speakers.filter(s => s.session_date === selectedDate || !s.session_date);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER BANNER */}
      <div className="glass-card rounded-3xl p-5 border border-purple-500/30 bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 space-y-3 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white font-display">UM Talk Live</h1>
            <p className="text-xs text-slate-400">16 Inspiring Speakers • Laluan Aspirasi Main Stage</p>
          </div>
        </div>

        {/* PEOPLE CHOICE VOTING BADGE */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-white text-xs">People&apos;s Choice Award 2026</h4>
              <p className="text-[10px] text-slate-400">Vote for your most inspiring speaker session!</p>
            </div>
          </div>
          {hasVoted ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Voted
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 shrink-0">
              1 Vote Available
            </span>
          )}
        </div>
      </div>

      {/* NOTIFICATION MESSAGE */}
      {message && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold text-center animate-bounce ${
            message.type === 'success'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-rose-500/20 border border-rose-500 text-rose-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* DATE SELECTOR TABS */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedDate('11 Nov 2026')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
            selectedDate === '11 Nov 2026'
              ? 'bg-purple-500 text-slate-950 border-purple-400 shadow-md shadow-purple-500/20'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 inline mr-1" /> Day 1 (11 Nov)
        </button>
        <button
          onClick={() => setSelectedDate('12 Nov 2026')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
            selectedDate === '12 Nov 2026'
              ? 'bg-purple-500 text-slate-950 border-purple-400 shadow-md shadow-purple-500/20'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 inline mr-1" /> Day 2 (12 Nov)
        </button>
      </div>

      {/* SPEAKER TIMELINE CARDS */}
      <div className="grid grid-cols-1 gap-3">
        {filteredSpeakers.map((speaker) => (
          <SpeakerCard
            key={speaker.id}
            speaker={speaker}
            hasVoted={hasVoted}
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );
}
