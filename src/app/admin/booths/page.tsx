'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getCheckpoints, saveCheckpoint, deleteCheckpoint, uploadImage } from '@/lib/supabase';
import { Checkpoint, QuizQuestion } from '@/lib/types';
import Modal from '@/components/Modal';
import { QUIZ_MAX_QUESTIONS } from '@/lib/scoring';
import {
  QrCode,
  Plus,
  Download,
  Edit3,
  Trash2,
  ArrowLeft,
  X,
  Save,
  UploadCloud,
  ImageIcon,
  AlertTriangle,
  Printer,
} from 'lucide-react';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

function genToken(name: string): string {
  const slug = slugify(name) || 'booth';
  return `qr-${slug}-${Math.random().toString(36).slice(2, 6)}`;
}

const inputCls =
  'w-full p-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink text-sm focus:bg-white';

export default function AdminBoothsPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedBooth, setSelectedBooth] = useState<Checkpoint | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBooth, setEditingBooth] = useState<Partial<Checkpoint>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [initialBooth, setInitialBooth] = useState('');
  const [quizScrollTarget, setQuizScrollTarget] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooths();
  }, []);

  useEffect(() => {
    if (!quizScrollTarget) return;
    const target = document.getElementById(quizScrollTarget);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target?.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
    setQuizScrollTarget(null);
  }, [quizScrollTarget]);

  async function loadBooths() {
    const list = await getCheckpoints(true);
    setCheckpoints(list);
  }

  const handleSelectBooth = async (booth: Checkpoint) => {
    setSelectedBooth(booth);
    const url = `${window.location.origin}/checkpoint/${booth.qr_token}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const openNew = () => {
    const next: Partial<Checkpoint> = {
      is_active: true,
      booth_type: 'required',
      quiz: [],
      category: 'Exhibition',
      location: 'Marquee Tent, High Impact Research Building',
    };
    setEditingBooth(next);
    setInitialBooth(JSON.stringify(next));
    setError('');
    setShowModal(true);
  };

  const openEdit = (booth: Checkpoint) => {
    const next = { ...booth };
    setEditingBooth(next);
    setInitialBooth(JSON.stringify(next));
    setError('');
    setShowModal(true);
  };

  const isDirty = () => JSON.stringify(editingBooth) !== initialBooth;

  const requestClose = (afterClose?: () => void) => {
    if (isDirty() && !window.confirm('Discard unsaved booth changes?')) return;
    setShowModal(false);
    afterClose?.();
  };

  const quiz = editingBooth.quiz || [];

  const updateQuizQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setEditingBooth(prev => {
      const current = prev.quiz || [];
      return {
        ...prev,
        quiz: current.map((question, questionIndex) =>
          questionIndex === index ? { ...question, ...patch } : question
        ),
      };
    });
  };

  const addQuizQuestion = () => {
    const id = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setEditingBooth(prev => {
      const current = prev.quiz || [];
      if (current.length >= QUIZ_MAX_QUESTIONS) return prev;
      return {
        ...prev,
        quiz: [
          ...current,
          {
            id,
            question: '',
            options: ['', '', '', ''],
            correctIndex: 0,
          },
        ],
      };
    });
    setQuizScrollTarget(id);
  };

  const removeQuizQuestion = (index: number) => {
    setEditingBooth(prev => ({
      ...prev,
      quiz: (prev.quiz || []).filter((_, questionIndex) => questionIndex !== index),
    }));
  };

  const handleImageFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    const url = await uploadImage(file, 'booths');
    setUploading(false);
    if (!url) {
      setError('Image upload failed — make sure the “booth-images” storage bucket exists, or paste an image URL instead.');
      return;
    }
    setEditingBooth(prev => ({ ...prev, image_url: url }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!editingBooth.name || !editingBooth.faculty || !editingBooth.category || !editingBooth.location) {
      setError('Please fill in name, faculty, category and location.');
      return;
    }
    const boothQuiz = editingBooth.booth_type === 'partner' ? editingBooth.quiz || [] : [];
    if (boothQuiz.some(q => !q.question.trim() || q.options.some(option => !option.trim()))) {
      setError('Fill in every quiz question and all four options, or remove the empty question.');
      return;
    }
    setSaving(true);

    const payload: Partial<Checkpoint> = {
      ...editingBooth,
      description: editingBooth.description || 'Interactive showcase at the Laluan Aspirasi exhibition.',
      qr_token: editingBooth.qr_token || genToken(editingBooth.name),
      is_active: editingBooth.is_active ?? true,
      booth_type: editingBooth.booth_type || 'required',
      quiz: boothQuiz,
    };

    const { data, error: saveError } = await saveCheckpoint(payload);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    const isNew = !editingBooth.id;
    setInitialBooth(JSON.stringify(payload));
    setShowModal(false);
    loadBooths();
    if (isNew && data) {
      handleSelectBooth(data);
    }
  };

  const handleDelete = async (booth: Checkpoint) => {
    if (!confirm(`Delete “${booth.name}”? This cannot be undone.`)) return;
    const { error: delError } = await deleteCheckpoint(booth.id);
    if (delError) {
      alert(`Delete failed: ${delError}`);
      return;
    }
    setSelectedBooth(null);
    loadBooths();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white text-ink border-2 border-ink shadow-brut"
            aria-label="Back to admin overview"
            title="Back to admin overview"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="display text-2xl text-ink leading-none">Booths & QR</h1>
            <p className="text-[11px] text-slate-500">Add booths, upload photos, print QR signage</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/admin/booths/print"
            className="btn px-3 py-2 bg-white text-ink text-xs flex items-center gap-1.5"
            title="Printable QR sheet for all booths"
          >
            <Printer className="w-4 h-4" /> QR sheet
          </Link>
          <button onClick={openNew} className="btn px-3 py-2 bg-brand-500 text-white text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* BOOTHS LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {checkpoints.map(booth => (
          <div key={booth.id} className="card p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-cream-100 shrink-0 border-2 border-ink">
                {booth.image_url ? (
                  <img src={booth.image_url} alt={booth.name} width={56} height={56} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="eyebrow text-brand-600 truncate">{booth.category}</span>
                  {booth.booth_type === 'partner' && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gold-400 text-ink">
                      Partner
                    </span>
                  )}
                  {booth.is_active === false && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                      Inactive
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-ink text-sm leading-snug line-clamp-2">{booth.name}</h3>
                <p className="text-[11px] text-slate-500 truncate">{booth.faculty} • {booth.location}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 shrink-0">
              <button
                onClick={() => handleSelectBooth(booth)}
                className="btn w-10 h-10 bg-white text-ink flex items-center justify-center"
                aria-label={`Show QR code for ${booth.name}`}
                title="View QR"
              >
                <QrCode className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => openEdit(booth)}
                className="btn w-10 h-10 bg-white text-ink flex items-center justify-center"
                aria-label={`Edit ${booth.name}`}
                title="Edit booth"
              >
                <Edit3 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => handleDelete(booth)}
                className="btn w-10 h-10 bg-rose-50 text-rose-600 flex items-center justify-center"
                aria-label={`Delete ${booth.name}`}
                title="Delete booth"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* QR MODAL */}
      {selectedBooth && qrDataUrl && (
        <Modal
          onClose={() => setSelectedBooth(null)}
          labelledBy="booth-qr-title"
          closeLabel="Close QR code"
          panelClassName="!max-w-md p-6"
        >
          <div className="text-center space-y-4">
            <div>
              <span className="sticker bg-brand-500 text-white text-[9px]">Booth QR signage</span>
              <h3 id="booth-qr-title" className="display text-2xl text-ink mt-3 leading-none pr-8">
                {selectedBooth.name}
              </h3>
              <p className="text-xs text-brand-600 font-bold mt-1">{selectedBooth.faculty}</p>
            </div>

            <div className="w-56 h-56 mx-auto p-3 bg-white rounded-2xl border-2 border-ink flex items-center justify-center">
              <img
                src={qrDataUrl}
                alt={`QR code for ${selectedBooth.name}`}
                width={224}
                height={224}
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-[11px] text-slate-500 mono break-all">/checkpoint/{selectedBooth.qr_token}</p>

            <div className="grid grid-cols-1 gap-2">
              <a
                href={qrDataUrl}
                download={`QR_${selectedBooth.qr_token}.png`}
                className="btn w-full py-3 bg-ink text-cream-50 flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" aria-hidden="true" /> Download PNG
              </a>
              <button
                type="button"
                onClick={() => {
                  setSelectedBooth(null);
                  openEdit(selectedBooth);
                }}
                className="btn w-full py-2.5 bg-white text-ink text-xs flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" aria-hidden="true" /> Edit this booth
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT/ADD MODAL */}
      {showModal && (
        <Modal
          onClose={() => requestClose()}
          labelledBy="booth-form-title"
          closeLabel="Close booth editor"
          initialFocus="#booth-name"
          panelClassName="!max-w-3xl p-0 overflow-hidden"
        >
          <form onSubmit={handleSave} className="flex max-h-[90dvh] flex-col text-xs">
            <div className="shrink-0 border-b-2 border-ink/10 px-5 py-4 pr-14">
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="booth-form-title" className="display text-2xl text-ink leading-none">
                  {editingBooth.id ? 'Edit booth' : 'New booth'}
                </h3>
                {editingBooth.booth_type === 'partner' && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gold-400 text-ink">
                    Partner
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {editingBooth.id
                  ? 'Update booth details, quiz content and visitor visibility.'
                  : 'Create a required or partner booth. The QR token is generated on save.'}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              <div>
                <label htmlFor="booth-name" className="eyebrow text-slate-500 block mb-1">Booth Name</label>
                <input
                  id="booth-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="e.g. Robotics & Automation Lab"
                  value={editingBooth.name || ''}
                  onChange={e => setEditingBooth({ ...editingBooth, name: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="booth-faculty" className="eyebrow text-slate-500 block mb-1">Faculty / Organisation</label>
                <input
                  id="booth-faculty"
                  name="faculty"
                  type="text"
                  required
                  autoComplete="organization"
                  placeholder="e.g. Faculty of Engineering"
                  value={editingBooth.faculty || ''}
                  onChange={e => setEditingBooth({ ...editingBooth, faculty: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="booth-category" className="eyebrow text-slate-500 block mb-1">Category</label>
                  <input
                    id="booth-category"
                    name="category"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="e.g. Exhibition"
                    value={editingBooth.category || ''}
                    onChange={e => setEditingBooth({ ...editingBooth, category: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="booth-location" className="eyebrow text-slate-500 block mb-1">Location</label>
                  <input
                    id="booth-location"
                    name="location"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="e.g. Marquee Tent, HIR Building"
                    value={editingBooth.location || ''}
                    onChange={e => setEditingBooth({ ...editingBooth, location: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="booth-description" className="eyebrow text-slate-500 block mb-1">Description</label>
                <textarea
                  id="booth-description"
                  name="description"
                  rows={3}
                  autoComplete="off"
                  value={editingBooth.description || ''}
                  onChange={e => setEditingBooth({ ...editingBooth, description: e.target.value })}
                  className={`${inputCls} resize-y`}
                  placeholder="What will visitors see at this booth?"
                />
              </div>

              <div>
                <span className="eyebrow text-slate-500 block mb-1">Booth Type</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={(editingBooth.booth_type || 'required') === 'required'}
                    onClick={() => setEditingBooth({ ...editingBooth, booth_type: 'required', quiz: [] })}
                    className={`px-3 py-2.5 rounded-xl border-2 border-ink text-xs font-bold ${
                      (editingBooth.booth_type || 'required') === 'required'
                        ? 'bg-brand-500 text-white'
                        : 'bg-white text-ink'
                    }`}
                  >
                    Required
                  </button>
                  <button
                    type="button"
                    aria-pressed={editingBooth.booth_type === 'partner'}
                    onClick={() => setEditingBooth({ ...editingBooth, booth_type: 'partner' })}
                    className={`px-3 py-2.5 rounded-xl border-2 border-ink text-xs font-bold ${
                      editingBooth.booth_type === 'partner'
                        ? 'bg-gold-400 text-ink'
                        : 'bg-white text-ink'
                    }`}
                  >
                    Partner
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Partner booths give +5 points and never block the 8-stamp souvenir.
                </p>
              </div>

              {editingBooth.booth_type === 'partner' && (
                <div className="space-y-3 p-3 rounded-xl bg-amber-50 border-2 border-ink/10">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-slate-500">Bonus Quiz (Optional)</span>
                    <span className="text-[10px] mono text-slate-500">{quiz.length}/{QUIZ_MAX_QUESTIONS}</span>
                  </div>

                  {quiz.map((question, questionIndex) => (
                    <div key={question.id} id={question.id} className="space-y-2.5 p-3 rounded-xl bg-white border-2 border-ink/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Question {questionIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQuizQuestion(questionIndex)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          aria-label={`Remove question ${questionIndex + 1}`}
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <input
                        type="text"
                        aria-label={`Question ${questionIndex + 1} text`}
                        placeholder="Question text"
                        value={question.question}
                        onChange={e => updateQuizQuestion(questionIndex, { question: e.target.value })}
                        className={inputCls}
                      />
                      <div className="space-y-1.5">
                        {[0, 1, 2, 3].map(optionIndex => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-answer-${questionIndex}`}
                              checked={question.correctIndex === optionIndex}
                              onChange={() => updateQuizQuestion(questionIndex, { correctIndex: optionIndex })}
                              aria-label={`Mark option ${optionIndex + 1} correct`}
                              className="accent-brand-500 shrink-0"
                            />
                            <input
                              type="text"
                              aria-label={`Option ${optionIndex + 1}`}
                              placeholder={`Option ${optionIndex + 1}`}
                              value={question.options[optionIndex] || ''}
                              onChange={e => {
                                const options = [0, 1, 2, 3].map(i =>
                                  i === optionIndex ? e.target.value : question.options[i] || ''
                                );
                                updateQuizQuestion(questionIndex, { options });
                              }}
                              className={`${inputCls} !py-2`}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500">Select the radio button next to the correct answer.</p>
                    </div>
                  ))}

                  {quiz.length < QUIZ_MAX_QUESTIONS && (
                    <button
                      type="button"
                      onClick={addQuizQuestion}
                      className="btn w-full py-2 bg-white text-ink text-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add question
                    </button>
                  )}
                </div>
              )}

              <div>
                <span className="eyebrow text-slate-500 block mb-1">Booth Photo</span>
                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-cream-100 shrink-0 border-2 border-ink">
                    {editingBooth.image_url ? (
                      <img src={editingBooth.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="btn flex-1 py-2 bg-white text-ink text-xs flex items-center justify-center gap-1.5"
                      >
                        {uploading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" aria-hidden="true" /> Upload photo
                          </>
                        )}
                      </button>
                      {editingBooth.image_url && (
                        <button
                          type="button"
                          onClick={() => setEditingBooth({ ...editingBooth, image_url: '' })}
                          className="btn px-2.5 py-2 bg-rose-50 text-rose-600 text-xs"
                          aria-label="Remove booth photo"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleImageFile(e.target.files?.[0] || null)}
                    />
                    <input
                      type="url"
                      name="image_url"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="…or paste an image URL"
                      value={editingBooth.image_url || ''}
                      onChange={e => setEditingBooth({ ...editingBooth, image_url: e.target.value })}
                      className={`${inputCls} !text-[11px]`}
                    />
                  </div>
                </div>
              </div>

              <label htmlFor="booth-active" className="flex items-center justify-between p-3 rounded-xl bg-cream-100 border-2 border-ink cursor-pointer">
                <span className="text-xs font-bold text-ink">Active (visible to visitors)</span>
                <input
                  id="booth-active"
                  name="is_active"
                  type="checkbox"
                  checked={editingBooth.is_active ?? true}
                  onChange={e => setEditingBooth({ ...editingBooth, is_active: e.target.checked })}
                  className="w-5 h-5 accent-brand-500"
                />
              </label>

              {editingBooth.qr_token && (
                <div className="space-y-1.5 rounded-xl bg-cream-100 border-2 border-ink/10 p-3">
                  <p className="text-[10px] mono text-slate-500 break-all">
                    QR token: <span className="text-ink font-bold">{editingBooth.qr_token}</span>
                  </p>
                  {editingBooth.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isDirty() && !window.confirm('Discard unsaved booth changes and view the saved QR?')) return;
                        setShowModal(false);
                        handleSelectBooth(editingBooth as Checkpoint);
                      }}
                      className="btn w-full py-2 bg-white text-ink text-xs flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" aria-hidden="true" /> View QR / download PNG
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t-2 border-ink/10 bg-cream-50 px-5 py-3 space-y-2">
              {error && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-[11px] font-bold text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-3 py-2 flex items-start gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" /> {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => requestClose()}
                  className="btn flex-1 py-3 bg-white text-ink text-sm uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="btn flex-[1.4] py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm flex items-center justify-center gap-2 uppercase"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" aria-hidden="true" /> Save booth
                    </>
                  )}
                </button>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-500 text-center">
                A unique QR token is generated automatically — no technical input needed.
              </p>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
