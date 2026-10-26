'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getCheckpoints, saveCheckpoint, deleteCheckpoint, uploadImage } from '@/lib/supabase';
import { Checkpoint } from '@/lib/types';
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
  'w-full p-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink text-sm focus:outline-none focus:bg-white';

export default function AdminBoothsPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedBooth, setSelectedBooth] = useState<Checkpoint | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBooth, setEditingBooth] = useState<Partial<Checkpoint>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooths();
  }, []);

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
    setEditingBooth({ is_active: true, category: 'Exhibition', location: 'Marquee Tent, High Impact Research Building' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (booth: Checkpoint) => {
    setEditingBooth({ ...booth });
    setError('');
    setShowModal(true);
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
    setSaving(true);

    const payload: Partial<Checkpoint> = {
      ...editingBooth,
      description: editingBooth.description || 'Interactive showcase at the Laluan Aspirasi exhibition.',
      qr_token: editingBooth.qr_token || genToken(editingBooth.name),
      is_active: editingBooth.is_active ?? true,
    };

    const { data, error: saveError } = await saveCheckpoint(payload);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    const isNew = !editingBooth.id;
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
          <Link href="/admin" className="p-2 rounded-xl bg-white text-ink border-2 border-ink shadow-brut">
            <ArrowLeft className="w-4 h-4" />
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
      <div className="grid grid-cols-1 gap-3">
        {checkpoints.map(booth => (
          <div key={booth.id} className="card p-4 flex items-center justify-between gap-3">
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
                  {booth.is_active === false && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                      Inactive
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-ink text-sm leading-snug line-clamp-1">{booth.name}</h3>
                <p className="text-[11px] text-slate-500 truncate">{booth.faculty} • {booth.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleSelectBooth(booth)}
                className="btn px-2.5 py-1.5 bg-white text-ink text-xs flex items-center gap-1"
                aria-label={`Show QR code for ${booth.name}`}
                title="View QR"
              >
                <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={() => openEdit(booth)}
                className="btn p-1.5 bg-white text-ink"
                aria-label={`Edit ${booth.name}`}
                title="Edit"
              >
                <Edit3 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => handleDelete(booth)}
                className="btn p-1.5 bg-rose-50 text-rose-600"
                aria-label={`Delete ${booth.name}`}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* QR MODAL */}
      {selectedBooth && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm card p-6 text-center space-y-4 relative">
            <button
              onClick={() => setSelectedBooth(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="sticker bg-brand-500 text-white text-[9px]">Booth QR signage</span>
              <h3 className="display text-2xl text-ink mt-3 leading-none">{selectedBooth.name}</h3>
              <p className="text-xs text-brand-600 font-bold mt-1">{selectedBooth.faculty}</p>
            </div>

            <div className="w-56 h-56 mx-auto p-3 bg-white rounded-2xl border-2 border-ink flex items-center justify-center">
              <img src={qrDataUrl} alt={`QR code for ${selectedBooth.name}`} width={224} height={224} className="w-full h-full object-contain" />
            </div>

            <p className="text-[11px] text-slate-500 mono">/checkpoint/{selectedBooth.qr_token}</p>

            <a
              href={qrDataUrl}
              download={`QR_${selectedBooth.qr_token}.png`}
              className="btn w-full py-3 bg-ink text-cream-50 flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" /> Download PNG
            </a>
          </div>
        </div>
      )}

      {/* EDIT/ADD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-sm card p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="display text-2xl text-ink leading-none">
              {editingBooth.id ? 'Edit booth' : 'New booth'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="eyebrow text-slate-500 block mb-1">Booth Name</label>
                <input
                  type="text"
                  required
                  value={editingBooth.name || ''}
                  onChange={e => setEditingBooth({ ...editingBooth, name: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="eyebrow text-slate-500 block mb-1">Faculty / Organisation</label>
                <input
                  type="text"
                  required
                  value={editingBooth.faculty || ''}
                  onChange={e => setEditingBooth({ ...editingBooth, faculty: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="eyebrow text-slate-500 block mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={editingBooth.category || ''}
                    onChange={e => setEditingBooth({ ...editingBooth, category: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="eyebrow text-slate-500 block mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={editingBooth.location || ''}
                    onChange={e => setEditingBooth({ ...editingBooth, location: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="eyebrow text-slate-500 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingBooth.description || ''}
                  onChange={e => setEditingBooth({ ...editingBooth, description: e.target.value })}
                  className={`${inputCls} resize-none`}
                  placeholder="What will visitors see at this booth?"
                />
              </div>

              {/* Image */}
              <div>
                <label className="eyebrow text-slate-500 block mb-1">Booth Photo</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-cream-100 shrink-0 border-2 border-ink">
                    {editingBooth.image_url ? (
                      <img src={editingBooth.image_url} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="btn w-full py-2 bg-white text-ink text-xs flex items-center justify-center gap-1.5"
                    >
                      {uploading ? (
                        <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" /> Upload photo
                        </>
                      )}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleImageFile(e.target.files?.[0] || null)}
                    />
                    <input
                      type="url"
                      placeholder="…or paste an image URL"
                      value={editingBooth.image_url || ''}
                      onChange={e => setEditingBooth({ ...editingBooth, image_url: e.target.value })}
                      className={`${inputCls} !text-[11px]`}
                    />
                  </div>
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-cream-100 border-2 border-ink cursor-pointer">
                <span className="text-xs font-bold text-ink">Active (visible to visitors)</span>
                <input
                  type="checkbox"
                  checked={editingBooth.is_active ?? true}
                  onChange={e => setEditingBooth({ ...editingBooth, is_active: e.target.checked })}
                  className="w-4 h-4 accent-brand-500"
                />
              </label>

              {editingBooth.qr_token && (
                <div className="space-y-1.5">
                  <p className="text-[10px] mono text-slate-500">
                    QR token: <span className="text-ink font-bold">{editingBooth.qr_token}</span>
                  </p>
                  {editingBooth.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        handleSelectBooth(editingBooth as Checkpoint);
                      }}
                      className="btn w-full py-2 bg-white text-ink text-xs flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" /> View QR / download PNG
                    </button>
                  )}
                </div>
              )}

              {error && (
                <p className="text-[11px] font-bold text-brand-700 bg-brand-50 border-2 border-brand-500 rounded-xl px-3 py-2 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="btn w-full py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm flex items-center justify-center gap-2 uppercase"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save booth
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                A unique QR token is generated automatically — no technical input needed.
              </p>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
