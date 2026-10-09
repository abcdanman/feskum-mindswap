'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getCheckpoints, saveCheckpoint } from '@/lib/supabase';
import { Checkpoint } from '@/lib/types';
import { QrCode, Plus, Download, Edit3, CheckCircle2, ArrowLeft, X, Save } from 'lucide-react';

export default function AdminBoothsPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedBooth, setSelectedBooth] = useState<Checkpoint | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Form State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBooth, setEditingBooth] = useState<Partial<Checkpoint>>({});

  useEffect(() => {
    loadBooths();
  }, []);

  async function loadBooths() {
    const list = await getCheckpoints();
    setCheckpoints(list);
  }

  const handleSelectBooth = async (booth: Checkpoint) => {
    setSelectedBooth(booth);
    const host = window.location.origin;
    const url = `${host}/checkpoint/${booth.qr_token}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCheckpoint(editingBooth);
    setShowModal(false);
    loadBooths();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold text-white font-display">Booth & QR Management</h1>
            <p className="text-xs text-slate-400">Manage exhibition booths & generate printable QR signage</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingBooth({});
            setShowModal(true);
          }}
          className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" /> Add Booth
        </button>
      </div>

      {/* BOOTHS LIST */}
      <div className="grid grid-cols-1 gap-3">
        {checkpoints.map((booth) => (
          <div
            key={booth.id}
            className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between"
          >
            <div className="min-w-0 flex-1 pr-3">
              <span className="text-[10px] uppercase font-bold text-brand-300 px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20">
                {booth.category}
              </span>
              <h3 className="font-bold text-white text-sm mt-1 leading-snug truncate">{booth.name}</h3>
              <p className="text-xs text-brand-400">{booth.faculty} • {booth.location}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">Token: {booth.qr_token}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleSelectBooth(booth)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1"
              >
                <QrCode className="w-3.5 h-3.5" /> View QR
              </button>

              <button
                onClick={() => {
                  setEditingBooth(booth);
                  setShowModal(true);
                }}
                className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* QR MODAL */}
      {selectedBooth && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm glass-card rounded-3xl p-6 border border-brand-500/30 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedBooth(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Official Booth QR Signage
              </span>
              <h3 className="font-extrabold text-white text-lg font-display mt-1">{selectedBooth.name}</h3>
              <p className="text-xs text-brand-400 font-medium">{selectedBooth.faculty}</p>
            </div>

            {/* QR CODE CONTAINER */}
            <div className="w-56 h-56 mx-auto p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-brand-500">
              <img src={qrDataUrl} alt="Booth QR Code" className="w-full h-full object-contain" />
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              Target URL: /checkpoint/{selectedBooth.qr_token}
            </p>

            <a
              href={qrDataUrl}
              download={`QR_${selectedBooth.qr_token}.png`}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
            >
              <Download className="w-4 h-4" /> Download Printable Signage PNG
            </a>
          </div>
        </div>
      )}

      {/* EDIT/ADD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm glass-card rounded-3xl p-6 border border-brand-500/30 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-white text-lg font-display">
              {editingBooth.id ? 'Edit Booth' : 'Create New Booth'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Booth Name</label>
                <input
                  type="text"
                  required
                  value={editingBooth.name || ''}
                  onChange={(e) => setEditingBooth({ ...editingBooth, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Faculty / Organisation</label>
                <input
                  type="text"
                  required
                  value={editingBooth.faculty || ''}
                  onChange={(e) => setEditingBooth({ ...editingBooth, faculty: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={editingBooth.category || ''}
                  onChange={(e) => setEditingBooth({ ...editingBooth, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={editingBooth.location || ''}
                  onChange={(e) => setEditingBooth({ ...editingBooth, location: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">QR Token (Unique URL Identifier)</label>
                <input
                  type="text"
                  required
                  value={editingBooth.qr_token || ''}
                  onChange={(e) => setEditingBooth({ ...editingBooth, qr_token: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-brand-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-brand-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 mt-2"
              >
                <Save className="w-4 h-4" /> Save Booth
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
