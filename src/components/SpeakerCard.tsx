'use client';

import React, { useState } from 'react';
import { Speaker } from '@/lib/types';
import { Clock, ThumbsUp, CheckCircle2, User, Building, Calendar, X } from 'lucide-react';

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
      <div
        onClick={() => setShowBioModal(true)}
        className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
      >
        <div>
          {/* Header Time Badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-extrabold">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              {speaker.session_time}
            </span>
            <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
              {speaker.session_date}
            </span>
          </div>

          {/* Speaker Profile Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
              {speaker.photo_url ? (
                <img
                  src={speaker.photo_url}
                  alt={speaker.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500">
                  <User className="w-6 h-6" />
                </div>
              )}
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-brand-600 transition-colors font-display">
                {speaker.name}
              </h4>
              <p className="text-xs text-brand-600 font-bold">{speaker.position}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Building className="w-3.5 h-3.5 text-slate-400" /> {speaker.organisation}
              </p>
            </div>
          </div>

          {/* Session Topic */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
              Session Topic
            </span>
            <p className="text-xs font-bold text-slate-900 line-clamp-2">
              &quot;{speaker.session_title}&quot;
            </p>
          </div>
        </div>

        {/* Footer Vote Action */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setShowBioModal(true)}
            className="text-xs font-bold text-brand-600 hover:text-brand-700"
          >
            View Profile →
          </button>

          <button
            onClick={handleVote}
            disabled={hasVoted || isSubmitting}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              hasVoted
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20 active:scale-95'
            }`}
          >
            {hasVoted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Voted</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Vote Speaker</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bio Modal */}
      {showBioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setShowBioModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                <img src={speaker.photo_url || ''} alt={speaker.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg font-display">{speaker.name}</h3>
                <p className="text-xs text-brand-600 font-bold">{speaker.position}</p>
                <p className="text-xs text-slate-500">{speaker.organisation}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 mb-4 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Scheduled Session</span>
              <p className="text-xs font-bold text-slate-900">&quot;{speaker.session_title}&quot;</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-brand-500" /> {speaker.session_time}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-brand-500" /> {speaker.session_date}</span>
              </div>
            </div>

            <div className="mb-6">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Biography</h5>
              <p className="text-xs text-slate-600 leading-relaxed">{speaker.bio}</p>
            </div>

            <button
              onClick={handleVote}
              disabled={hasVoted || isSubmitting}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                hasVoted
                  ? 'bg-slate-100 text-slate-400 border border-slate-200'
                  : 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25'
              }`}
            >
              {hasVoted ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <ThumbsUp className="w-4 h-4" />}
              {hasVoted ? 'You Voted For This Speaker' : 'Cast People Choice Vote'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
