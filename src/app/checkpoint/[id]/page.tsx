'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { getOrInitVisitorId } from '@/lib/visitor';
import { getCheckpointByQrToken, getVisitorVisits, submitBoothRating, submitBoothQuiz, getRewardSetting } from '@/lib/supabase';
import { Checkpoint, BoothVisit, RewardSetting } from '@/lib/types';
import { QUIZ_MAX_QUESTIONS } from '@/lib/scoring';
import { Star, CheckCircle2, Ticket, ArrowLeft, MapPin, Sparkles, AlertCircle, Send, QrCode, HelpCircle } from 'lucide-react';
import BoothThumb from '@/components/BoothThumb';

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
  const [requiredVisitsCount, setRequiredVisitsCount] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Array<number | null>>([]);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [quizMessage, setQuizMessage] = useState('');

  useEffect(() => {
    async function loadCheckpoint() {
      setLoading(true);
      const id = getOrInitVisitorId();
      setVisitorId(id);

      const [cp, visits, rSetting] = await Promise.all([
        getCheckpointByQrToken(qrToken),
        getVisitorVisits(id),
        getRewardSetting(),
      ]);

      setCheckpoint(cp);
      setRewardSetting(rSetting);
      setRequiredVisitsCount(visits.filter(v => v.checkpoint?.booth_type !== 'partner').length);
      setQuizAnswers(Array(Math.min(cp?.quiz?.length || 0, QUIZ_MAX_QUESTIONS)).fill(null));

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
      if (checkpoint.booth_type !== 'partner') {
        setRequiredVisitsCount(prev => prev + 1);
      }

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    } else {
      setErrorMsg(res.message || 'Failed to submit rating. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpoint || quizSubmitting) return;
    const questions = (checkpoint.quiz || []).slice(0, QUIZ_MAX_QUESTIONS);
    if (quizAnswers.length !== questions.length || quizAnswers.some(answer => answer === null)) {
      setQuizError('Answer every question to submit.');
      return;
    }

    setQuizSubmitting(true);
    setQuizError('');
    const res = await submitBoothQuiz(visitorId, checkpoint.id, questions, quizAnswers);
    if (res.success && res.visit) {
      setExistingVisit(res.visit);
      if (successStamp) setSuccessStamp(res.visit);
      setQuizMessage(`${res.correct}/${res.total} correct · +${res.points} pts`);
      if (res.correct > 0) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.65 } });
      }
    } else {
      setQuizError(res.message || 'Could not save your quiz. Try again.');
    }
    setQuizSubmitting(false);
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-12 h-12 border-4 border-ink border-t-brand-500 rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Validating QR checkpoint...</p>
      </div>
    );
  }

  if (!checkpoint) {
    return (
      <div className="py-12 card p-6 text-center space-y-4 border-rose-300">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border-2 border-ink">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="display text-2xl text-ink">Invalid checkpoint</h2>
          <p className="text-xs text-slate-500 mt-1">This booth QR code does not exist or has expired.</p>
        </div>
        <Link href="/exhibition" className="btn inline-flex items-center gap-2 px-4 py-2.5 bg-white text-ink text-xs">
          <ArrowLeft className="w-4 h-4" /> View all booths
        </Link>
      </div>
    );
  }

  const isCompleted = Boolean(existingVisit || successStamp);
  const activeVisit = successStamp || existingVisit;
  const isPartner = checkpoint.booth_type === 'partner';
  const quizQuestions = (checkpoint.quiz || []).slice(0, QUIZ_MAX_QUESTIONS);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* NAVIGATION BACK */}
      <Link
        href="/passport"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Passport
      </Link>

      {/* STEP INDICATOR: Scanned → Rate → Stamped */}
      <div className="card p-3.5 flex items-center">
        {[
          { icon: QrCode, label: 'Scanned', done: true, active: false },
          { icon: Star, label: 'Rate', done: false, active: !isCompleted },
          { icon: CheckCircle2, label: 'Stamped', done: isCompleted, active: false },
        ].map((s, i, arr) => {
          const StepIcon = s.icon;
          return (
            <React.Fragment key={s.label}>
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center ${
                    s.done ? 'bg-emerald-500 text-white' : s.active ? 'bg-brand-500 text-white' : 'bg-cream-100 text-slate-400'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded-full ${s.done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* BOOTH HEADER HERO CARD */}
      <div className="card p-5 space-y-4">
        <div className="w-full h-44 rounded-2xl overflow-hidden border-2 border-ink relative">
          <BoothThumb src={checkpoint.image_url} alt={checkpoint.name} iconClassName="w-12 h-12" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          <span className="absolute top-3 left-3 sticker bg-ink text-cream-50 text-[9px]">{checkpoint.category}</span>
          <span className={`absolute top-3 right-3 sticker text-[9px] ${isPartner ? 'bg-gold-400 text-ink' : 'bg-emerald-500 text-white'}`}>
            {isPartner ? 'Partner · +5' : 'Required · +10'}
          </span>
        </div>

        <div>
          <span className="eyebrow text-brand-600 block mb-0.5">{checkpoint.faculty}</span>
          <h1 className="display text-3xl text-ink leading-tight">{checkpoint.name}</h1>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 p-2 rounded-xl bg-cream-100 border-2 border-ink/10">
            <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
            <span>{checkpoint.location}</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">{checkpoint.description}</p>
      </div>

      {/* COMPLETED STAMP ALREADY COLLECTED VIEW */}
      {isCompleted ? (
        <div className="card p-6 border-emerald-300 text-center space-y-4 animate-stampBump">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-ink">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="sticker bg-emerald-400 text-ink text-[10px]">
              {isPartner ? 'Partner stamp collected' : 'Stamp collected'}
            </span>
            <h3 className="display text-2xl text-ink mt-2">
              {isPartner
                ? (successStamp ? 'Partner stamp collected!' : 'Partner stamp already collected')
                : (successStamp ? 'Congratulations!' : "You've already visited")}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {isPartner ? (
                <>This optional bonus stop is logged in your passport. Your souvenir still needs {rewardSetting?.stamp_threshold || 8} required faculty stamps.</>
              ) : (
                <>Your stamp for <span className="text-brand-600 font-bold">{checkpoint.faculty}</span> has been logged in your passport.</>
              )}
            </p>
          </div>

          {/* RATING DISPLAY */}
          <div className="p-3 rounded-xl bg-cream-100 border-2 border-ink/10 max-w-xs mx-auto space-y-1">
            <span className="eyebrow text-slate-500 block">Your rating</span>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= (activeVisit?.rating || 5) ? 'text-gold-400 fill-gold-400' : 'text-slate-200'}`}
                />
              ))}
            </div>
            {activeVisit?.review && (
              <p className="text-xs text-slate-600 italic pt-1 border-t-2 border-ink/10">&quot;{activeVisit.review}&quot;</p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-brand-50 border-2 border-ink flex items-center justify-between text-xs font-bold">
            <span className="text-ink">Required stamps</span>
            <span className="text-brand-700 mono">{requiredVisitsCount} / {rewardSetting?.stamp_threshold || 8}</span>
          </div>

          {isPartner && (
            <p className="text-[11px] text-slate-500">
              Partner bonus: +5 points per stamp. This booth does not count toward the 8-stamp souvenir.
            </p>
          )}

          {isPartner && quizQuestions.length > 0 && (
            <div className="p-4 rounded-xl bg-white border-2 border-ink text-left space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-600 shrink-0" aria-hidden="true" />
                <div>
                  <span className="eyebrow text-slate-500 block">Bonus quiz</span>
                  <p className="text-[11px] text-slate-500">Optional · +5 points per correct answer, max {QUIZ_MAX_QUESTIONS} questions.</p>
                </div>
              </div>

              {activeVisit?.quiz_completed_at ? (
                <div className="p-3 rounded-xl bg-cream-100 border-2 border-ink/10">
                  <p className="text-xs font-bold text-ink">
                    Quiz complete · {activeVisit.quiz_correct || 0}/{activeVisit.quiz_total || quizQuestions.length} correct
                  </p>
                  <p className="text-[11px] text-slate-500">
                    +{activeVisit.quiz_points || 0} leaderboard points
                  </p>
                  {quizMessage && <p className="text-[11px] text-emerald-700 font-bold mt-1">{quizMessage}</p>}
                </div>
              ) : (
                <form onSubmit={handleQuizSubmit} className="space-y-4">
                  {quizQuestions.map((question, questionIndex) => (
                    <fieldset key={question.id || questionIndex} className="space-y-2">
                      <legend className="text-xs font-bold text-ink">
                        {questionIndex + 1}. {question.question}
                      </legend>
                      <div className="space-y-1.5">
                        {question.options.map((option, optionIndex) => (
                          <label
                            key={optionIndex}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer text-xs ${
                              quizAnswers[questionIndex] === optionIndex
                                ? 'bg-brand-50 border-brand-500'
                                : 'bg-cream-50 border-ink/10'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`quiz-${questionIndex}`}
                              checked={quizAnswers[questionIndex] === optionIndex}
                              onChange={() => {
                                setQuizAnswers(prev => {
                                  const next = [...prev];
                                  next[questionIndex] = optionIndex;
                                  return next;
                                });
                              }}
                              className="accent-brand-500"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}

                  {quizError && (
                    <p role="alert" className="text-xs font-bold text-brand-700">{quizError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={quizSubmitting}
                    className="btn w-full py-2.5 bg-ink text-cream-50 text-xs flex items-center justify-center gap-2"
                  >
                    {quizSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><HelpCircle className="w-4 h-4" /> Submit quiz</>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          <Link href="/passport" className="btn w-full py-3 bg-brand-500 text-white text-sm flex items-center justify-center gap-2">
            <Ticket className="w-4 h-4" /> View passport & claim rewards
          </Link>
        </div>
      ) : (
        /* RATING & STAMP COLLECTION FORM */
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-ink/10 pb-3">
            <Sparkles className="w-5 h-5 text-gold-500" />
            <div>
              <h3 className="display text-xl text-ink leading-none">
                {isPartner ? 'Rate to collect partner stamp' : 'Rate to collect stamp'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isPartner
                  ? 'Optional bonus stop · +5 leaderboard points. Souvenir needs 8 required faculty stamps.'
                  : 'Your feedback helps crown the Best Faculty Booth!'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitRating} className="space-y-4">
            {/* STAR RATING SELECTOR */}
            <div>
              <label className="block eyebrow text-slate-500 text-center mb-2">
                How would you rate this showcase?
              </label>
              <div className="flex justify-center gap-2 p-3 rounded-2xl bg-cream-100 border-2 border-ink/10">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    aria-pressed={rating === star}
                    className="p-1 text-slate-300 hover:scale-125 transition-transform focus:outline-none"
                  >
                    <Star
                      aria-hidden="true"
                      className={`w-8 h-8 ${
                        star <= (hoverRating || rating)
                          ? 'text-gold-400 fill-gold-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* OPTIONAL REVIEW TEXT */}
            <div>
              <label htmlFor="booth-review" className="block text-xs font-semibold text-slate-600 mb-1">
                Quick review (optional)
              </label>
              <textarea
                id="booth-review"
                name="review"
                rows={2}
                placeholder="What impressed you about this booth?"
                value={review}
                onChange={e => setReview(e.target.value)}
                className="w-full p-3 rounded-xl bg-cream-50 border-2 border-ink text-ink placeholder-slate-400 text-base focus:outline-none focus:bg-white resize-none"
                maxLength={200}
              />
            </div>

            {errorMsg && (
              <div role="alert" aria-live="polite" className="p-3 rounded-xl bg-rose-50 border-2 border-ink text-rose-700 text-xs font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn w-full py-3.5 bg-brand-500 text-white text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit rating & collect stamp
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
