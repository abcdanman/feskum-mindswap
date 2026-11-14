'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSpeakers, getVotingStatus, hasVisitorVoted, submitSpeakerVote } from '@/lib/supabase';
import { Speaker, VotingStatus } from '@/lib/types';
import { getOrInitVisitorId } from '@/lib/visitor';
import { isDay2Speaker } from '@/lib/event';
import SpeakerCard from '@/components/SpeakerCard';
import { Award, ArrowLeft, Clock } from 'lucide-react';

export default function PeoplesChoiceVotePage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [votingStatus, setVotingStatus] = useState<VotingStatus | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [visitorId, setVisitorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function load() {
      const id = getOrInitVisitorId();
      setVisitorId(id);
      const [spkList, status, voted] = await Promise.all([getSpeakers(), getVotingStatus(), hasVisitorVoted(id)]);
      setSpeakers(spkList);
      setVotingStatus(status);
      setHasVoted(voted);
      setLoading(false);
    }
    load();
  }, []);

  const handleVote = async (speakerId: string) => {
    const res = await submitSpeakerVote(visitorId, speakerId);
    if (res.success) {
      setHasVoted(true);
      setMessage({ text: 'Thank you! Your People’s Choice vote has been recorded.', type: 'success' });
    } else {
      setMessage({ text: res.message || 'Could not record your vote.', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  // Eligible pool is whoever presents on Day 2 — the shortlist that moved
  // forward from Day 1, not just the judges' top 3.
  const eligibleSpeakers = speakers.filter(s => isDay2Speaker(s.session_date));

  return (
    <div className="space-y-4 animate-fadeIn">
      <Link href="/talks" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-ink">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to UM Talk
      </Link>

      <div className="card p-5 space-y-1 bg-brand-500 border-ink text-white">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/15 border-2 border-white/30 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-gold-300" aria-hidden="true" />
          </div>
          <div>
            <h1 className="display text-2xl leading-none">{votingStatus?.title || "People's Choice Award"}</h1>
            <p className="text-[11px] text-white/80 mt-1">
              {votingStatus?.description || 'Vote for your favourite speaker from the Day 2 lineup.'}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3 rounded-2xl text-xs font-bold text-center border-2 border-ink ${
            message.type === 'success' ? 'bg-emerald-400 text-ink' : 'bg-rose-100 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-ink border-t-brand-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : !votingStatus?.is_active ? (
        <div className="text-center py-12 card p-6 space-y-2">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" aria-hidden="true" />
          <h4 className="font-bold text-ink text-sm">Voting isn&apos;t open yet</h4>
          <p className="text-xs text-slate-500">
            This opens once the Day 2 lineup is confirmed. Check back soon.
          </p>
          <Link
            href="/talks"
            className="btn inline-flex items-center gap-1.5 mt-2 px-3.5 py-2 bg-brand-500 text-white text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to speakers
          </Link>
        </div>
      ) : eligibleSpeakers.length === 0 ? (
        <div className="text-center py-12 card p-6 space-y-2">
          <Award className="w-10 h-10 text-slate-300 mx-auto" aria-hidden="true" />
          <h4 className="font-bold text-ink text-sm">No one eligible to vote for yet</h4>
          <p className="text-xs text-slate-500">Check back once the finalists are announced.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {eligibleSpeakers.map(speaker => (
            <SpeakerCard key={speaker.id} speaker={speaker} hasVoted={hasVoted} onVote={handleVote} votable />
          ))}
        </div>
      )}
    </div>
  );
}
