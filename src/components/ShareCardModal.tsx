'use client';

import React, { useEffect, useRef, useState } from 'react';
import Modal from '@/components/Modal';
import { Share2, Download, Instagram, Loader2 } from 'lucide-react';
import {
  SHARE_CARD_TEMPLATES,
  ShareCardData,
  ShareCardTemplateId,
  renderShareCard,
  canvasToBlob,
} from '@/lib/shareCard';

interface ShareCardModalProps {
  data: ShareCardData;
  onClose: () => void;
}

export default function ShareCardModal({ data, onClose }: ShareCardModalProps) {
  const [templateId, setTemplateId] = useState<ShareCardTemplateId>(data.isComplete ? 'certificate' : 'scoreboard');
  const [rendering, setRendering] = useState(true);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderShareCard(templateId, data, canvas).then(() => {
      if (!cancelled) setRendering(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.canShare) return;
    try {
      const probe = new File([new Uint8Array([0])], 'probe.png', { type: 'image/png' });
      setCanShareFiles(navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  const fileName = `mindswap-passport-${templateId}.png`;

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My MindSwap @ FESKUM 2026 passport',
          text: `${data.stamps}/${data.threshold} booths stamped at MindSwap @ FESKUM 2026 — Laluan Aspirasi!`,
        });
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
    }
    handleDownload();
  };

  return (
    <Modal onClose={onClose} labelledBy="share-card-title" panelClassName="max-w-md">
      <div className="p-5 space-y-4">
        <div>
          <h3 id="share-card-title" className="display text-2xl text-ink leading-none">Share your passport</h3>
          <p className="text-[11px] text-slate-500 mt-1">Pick a card, then share straight to Instagram or save it to your gallery.</p>
        </div>

        {/* Template picker */}
        <div className="grid grid-cols-3 gap-2">
          {SHARE_CARD_TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={`rounded-xl border-2 p-2 text-center transition-all ${
                templateId === t.id ? 'border-ink bg-cream-100 shadow-brut' : 'border-ink/15 hover:border-ink/40'
              }`}
            >
              <span
                className="block w-full aspect-[9/16] rounded-lg border-2 border-ink/20 mb-1.5"
                style={{ background: t.swatch }}
                aria-hidden="true"
              />
              <span className="text-[10px] font-extrabold text-ink block leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 -mt-2">{SHARE_CARD_TEMPLATES.find(t => t.id === templateId)?.blurb}</p>

        {/* Live preview */}
        <div className="relative mx-auto w-full max-w-[220px] aspect-[9/16] rounded-xl overflow-hidden border-2 border-ink shadow-brut bg-cream-100">
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-cream-100/80">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={rendering}
            className="btn flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs flex items-center justify-center gap-1.5"
          >
            {canShareFiles ? <Instagram className="w-3.5 h-3.5" aria-hidden="true" /> : <Share2 className="w-3.5 h-3.5" aria-hidden="true" />}
            {canShareFiles ? 'Share to Instagram' : 'Share'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={rendering}
            className="btn px-4 py-3 bg-white border-2 border-ink disabled:opacity-50 text-ink text-xs flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Save
          </button>
        </div>
        {!canShareFiles && (
          <p className="text-[10px] text-slate-400 text-center">
            Saved to your device — open Instagram and share it as a Story or post from your gallery.
          </p>
        )}
      </div>
    </Modal>
  );
}
