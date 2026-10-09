'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { getOrInitVisitorId } from '@/lib/visitor';
import { getCheckpointByQrToken, getVisitorVisits, submitBoothRating, getRewardSetting } from '@/lib/supabase';
import { Checkpoint, BoothVisit, RewardSetting } from '@/lib/types';
import { Star, CheckCircle2, QrCode, Ticket, ArrowLeft, MapPin, Sparkles, AlertCircle, Send } from 'lucide-react';

export default function CheckpointPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const qrToken = resolvedParams.id;

  const [visitorId, setVisitorId] = useState<string>('');
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [existingVisit, setExistingVisit] = useState<BoothVisit | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [review, setReview] = useState<string>('');
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successStamp, setSuccessStamp] = useState<BoothVisit | null>(null);
  const [rewardSetting, setRewardSetting] = useState<RewardSetting | null>(null);
  const [totalVisitsCount, setTotalVisitsCount] = useState<number>(0);

  useEffect(() => {
    async function loadCheckpoint() {
      setLoading(true);
      const id = getOrInitVisitorId();
      setVisitorId(id);

      const [cp, visits, rSetting] = await Promise.all([
        getCheckpointByQrToken(qrToken),
        getVisitorVisits(id),
        getRewardSetting()
      ]);

      setCheckpoint(cp);
      setRewardSetting(rSetting);
      setTotalVisitsCount(visits.length);

      if (cp) {
        const found = visits.find(v => v.checkpoint_id === cp.id);
        if (found) {
          setExistingVisit(found);
        }
      }
      setLoading(false);
    }

    loadCheckpoint();
  }, [qrToken]);

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpoint || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');

    const res = await submitBoothRating(visitorId, checkpoint.id, rating, review);

    if (res.success && res.visit) {
      setSuccessStamp(res.visit);
      setExistingVisit(res.visit);
      setTotalVisitsCount(prev => prev + 1);

      // Trigger Confetti Celebration
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else {
      setErrorMsg(res.message || 'Failed to submit rating. Please try again.');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-12 h-12 border-4 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-medium">Validating QR Checkpoint...</p>
      </div>
    );
  }

  if (!checkpoint) {
    return (
      <div className="py-12 glass-card rounded-3xl p-6 text-center space-y-4 border border-rose-500/30">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Invalid Checkpoint</h2>
          <p className="text-xs text-slate-400 mt-1">This exhibition booth QR code does not exist or has expired.</p>
        </div>
        <Link
          href="/exhibition"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> View All Exhibition Booths
        </Link>
      </div>
    );
  }

  const isCompleted = Boolean(existingVisit || successStamp);
  const activeVisit = successStamp || existingVisit;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* NAVIGATION BACK */}
      <Link
        href="/passport"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Passport
      </Link>

      {/* BOOTH HEADER HERO CARD */}
      <div className="glass-card rounded-3xl p-5 border border-brand-500/30 bg-gradient-to-b from-slate-900 to-slate-950 space-y-4 shadow-xl">
        <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-700 relative">
          <img src={checkpoint.image_url || ''} alt={checkpoint.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
          
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-brand-300 text-[10px] font-extrabold uppercase tracking-wider border border-white/10">
            {checkpoint.category}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block mb-0.5">
            {checkpoint.faculty}
          </span>
          <h1 className="text-xl font-extrabold text-white font-display leading-tight">{checkpoint.name}</h1>
          
          <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
            <span>{checkpoint.location}</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {checkpoint.description}
        </p>
      </div>

      {/* COMPLETED STAMP ALREADY COLLECTED VIEW */}
      {isCompleted ? (
        <div className="glass-card rounded-3xl p-6 border-2 border-emerald-500/40 bg-emerald-950/20 text-center space-y-4 animate-stampBump shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold uppercase tracking-wider border border-emerald-500/30">
              ✓ STAMP COLLECTED!
            </span>
            <h3 className="text-lg font-extrabold text-white font-display mt-2">
              {successStamp ? 'Congratulations!' : "You've Already Visited This Booth"}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Your stamp for <span className="text-brand-300 font-bold">{checkpoint.faculty}</span> has been logged in your Digital Passport.
            </p>
          </div>

          {/* RATING DISPLAY */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 max-w-xs mx-auto space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Rating</span>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= (activeVisit?.rating || 5)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            {activeVisit?.review && (
              <p className="text-xs text-slate-300 italic pt-1 border-t border-slate-800">
                &quot;{activeVisit.review}&quot;
              </p>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between text-xs font-bold">
            <span className="text-white">Passport Progress</span>
            <span className="text-brand-300 font-mono">{totalVisitsCount} / {rewardSetting?.stamp_threshold || 8} Stamps</span>
          </div>

          <Link
            href="/passport"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-400 hover:from-brand-500 hover:to-brand-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all"
          >
            <Ticket className="w-4 h-4" /> View Passport & Claim Rewards
          </Link>
        </div>
      ) : (
        /* RATING & STAMP COLLECTION FORM */
        <div className="glass-card rounded-3xl p-6 border border-brand-500/40 bg-slate-900/90 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-white text-sm">Rate Booth to Collect Stamp</h3>
              <p className="text-[11px] text-slate-400">Your feedback helps crown the Best Faculty Booth!</p>
            </div>
          </div>

          <form onSubmit={handleSubmitRating} className="space-y-4">
            {/* STAR RATING SELECTOR */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 text-center mb-2">
                How would you rate this showcase?
              </label>
              <div className="flex justify-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-700 hover:scale-125 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* OPTIONAL REVIEW TEXT */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quick Review / Thoughts (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Tell us what impressed you about this booth..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-400 resize-none"
                maxLength={200}
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-500 via-teal-400 to-emerald-400 hover:from-brand-400 hover:to-emerald-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-brand-500/30 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> SUBMIT RATING & COLLECT STAMP
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
