'use client';

import React, { useState } from 'react';
import { Speaker } from '@/lib/types';
import { Clock, ThumbsUp, CheckCircle2, User, Building, Calendar } from 'lucide-react';
import Modal from '@/components/Modal';

interface SpeakerCardProps {
  speaker: Speaker;
  hasVoted: boolean;
  onVote: (speakerId: string) => Promise<void>;
}

export default function SpeakerCard({ speaker, hasVoted, onVote }: SpeakerCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVoted || isSubmitting) return;
    setIsSubmitting(true);
    await onVote(speaker.id);
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="card card-hover p-4 flex flex-col justify-between group">
        <div>
          {/* Header Time Badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ink text-cream-50 text-[11px] font-mono font-bold">
              <Clock className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
              {speaker.session_time}
            </span>
            <span className="text-[10px] text-slate-500 font-bold mono px-2 py-0.5 rounded bg-cream-100 border-2 border-ink/10">
              {speaker.session_date}
            </span>
          </div>

          {/* Speaker Profile Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-cream-100 shrink-0 border-2 border-ink">
              {speaker.photo_url ? (
                <img
                  src={speaker.photo_url}
                  alt={speaker.name}
                  width={64}
                  height={64}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-cream-200 text-slate-500">
                  <User className="w-6 h-6" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h4 className="display text-lg text-ink leading-tight group-hover:text-brand-600 transition-colors">
                {speaker.name}
              </h4>
              <p className="text-xs text-brand-600 font-bold">{speaker.position}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="truncate">{speaker.organisation}</span>
              </p>
            </div>
          </div>

          {/* Session Topic */}
          <div className="p-3 rounded-xl bg-cream-100 border-2 border-ink/10 mb-4">
            <span className="eyebrow text-slate-400 block mb-0.5">Session topic</span>
            <p className="text-xs font-bold text-ink line-clamp-2">&quot;{speaker.session_title}&quot;</p>
          </div>
        </div>

        {/* Footer Vote Action */}
        <div className="pt-3 border-t-2 border-ink/10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowBioModal(true)}
            className="text-xs font-extrabold text-brand-600 hover:text-brand-700 uppercase tracking-wide"
          >
            Profile →
          </button>

          <button
            type="button"
            onClick={handleVote}
            disabled={hasVoted || isSubmitting}
            aria-label={hasVoted ? `Voted for ${speaker.name}` : `Vote for ${speaker.name}`}
            className={`btn flex items-center gap-1.5 px-3 py-1.5 text-xs ${
              hasVoted ? 'bg-cream-200 text-slate-400 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-600 text-white'
            }`}
          >
            {hasVoted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Voted</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Vote</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bio Modal */}
      {showBioModal && (
        <Modal onClose={() => setShowBioModal(false)} labelledBy="speaker-bio-title">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-cream-100 shrink-0 border-2 border-ink">
                {speaker.photo_url ? (
                  <img
                    src={speaker.photo_url}
                    alt={speaker.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-cream-200 text-slate-500">
                    <User className="w-6 h-6" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 id="speaker-bio-title" className="display text-xl text-ink leading-none">{speaker.name}</h3>
                <p className="text-xs text-brand-600 font-bold mt-1">{speaker.position}</p>
                <p className="text-xs text-slate-500">{speaker.organisation}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cream-100 border-2 border-ink/10 mb-4 space-y-1">
              <span className="eyebrow text-slate-400">Scheduled session</span>
              <p className="text-xs font-bold text-ink">&quot;{speaker.session_title}&quot;</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-500" aria-hidden="true" /> {speaker.session_time}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-brand-500" aria-hidden="true" /> {speaker.session_date}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <h5 className="eyebrow text-slate-500 mb-1">Biography</h5>
              <p className="text-sm text-slate-600 leading-relaxed">{speaker.bio}</p>
            </div>

            <button
              type="button"
              onClick={handleVote}
              disabled={hasVoted || isSubmitting}
              className={`btn w-full py-3 flex items-center justify-center gap-2 text-sm ${
                hasVoted ? 'bg-cream-200 text-slate-400' : 'bg-brand-500 hover:bg-brand-600 text-white'
              }`}
            >
              {hasVoted ? <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" /> : <ThumbsUp className="w-4 h-4" aria-hidden="true" />}
              {hasVoted ? 'You voted for this speaker' : 'Cast People Choice vote'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
