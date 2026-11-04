'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from '@/components/Modal';
import { Share2, Download, Instagram, Loader2, FileText, Maximize2, X } from 'lucide-react';
import {
  SHARE_CARD_TEMPLATES,
  ShareCardData,
  ShareCardTemplateId,
  renderShareCard,
  canvasToBlob,
} from '@/lib/shareCard';
import { PassportPdfData, generatePassportPdf, passportPdfFileName } from '@/lib/passportPdf';

interface ShareCardModalProps {
  data: ShareCardData;
  pdfData?: PassportPdfData | null;
  onClose: () => void;
}

export default function ShareCardModal({ data, pdfData, onClose }: ShareCardModalProps) {
  const [templateId, setTemplateId] = useState<ShareCardTemplateId>(data.isComplete ? 'certificate' : 'scoreboard');
  const [rendering, setRendering] = useState(true);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxShareRef = useRef<HTMLButtonElement>(null);
  const lightboxSaveRef = useRef<HTMLButtonElement>(null);

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
    if (!fullPreviewOpen) return;
    lightboxCloseRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setFullPreviewOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      // Minimal focus trap — keep Tab cycling among the lightbox's own
      // three controls instead of leaking into the (visually hidden)
      // modal behind it.
      const items = [lightboxCloseRef.current, lightboxShareRef.current, lightboxSaveRef.current].filter(
        (el): el is HTMLButtonElement => Boolean(el)
      );
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault();
      if (event.shiftKey) {
        items[index <= 0 ? items.length - 1 : index - 1].focus();
      } else {
        items[index === items.length - 1 ? 0 : index + 1].focus();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [fullPreviewOpen]);

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

  const handleDownloadPdf = async () => {
    if (!pdfData || pdfBusy) return;
    setPdfBusy(true);
    try {
      const doc = await generatePassportPdf(pdfData);
      doc.save(passportPdfFileName(pdfData));
    } finally {
      setPdfBusy(false);
    }
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

        {/* Live preview — tap to see it full size before deciding to share/save */}
        <button
          type="button"
          onClick={() => setFullPreviewOpen(true)}
          disabled={rendering}
          aria-label="View full-size preview"
          className="relative mx-auto block w-full max-w-[220px] aspect-[9/16] rounded-xl overflow-hidden border-2 border-ink shadow-brut bg-cream-100 group disabled:cursor-default"
        >
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-cream-100/80">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin" aria-hidden="true" />
            </div>
          )}
          {!rendering && (
            <div className="absolute inset-0 flex items-end justify-center pb-2.5 bg-ink/0 group-hover:bg-ink/15 transition-colors">
              <span className="px-2.5 py-1 rounded-full bg-ink/80 text-cream-50 text-[10px] font-bold flex items-center gap-1 opacity-90">
                <Maximize2 className="w-3 h-3" aria-hidden="true" />
                Tap to view full size
              </span>
            </div>
          )}
        </button>

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

        {pdfData && (
          <div className="pt-3 border-t-2 border-ink/10 space-y-2">
            <p className="text-[10px] text-slate-500">Need something more formal? A one-page certificate, good for a CV or portfolio.</p>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfBusy}
              className="btn w-full py-2.5 bg-white border-2 border-ink disabled:opacity-50 text-ink text-xs flex items-center justify-center gap-1.5"
            >
              {pdfBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <FileText className="w-3.5 h-3.5" aria-hidden="true" />}
              {pdfBusy ? 'Preparing…' : 'Download PDF certificate'}
            </button>
          </div>
        )}
      </div>

      {fullPreviewOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] bg-ink animate-fadeIn overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-label="Full-size passport card preview"
            onMouseDown={event => {
              if (event.target === event.currentTarget) setFullPreviewOpen(false);
            }}
          >
            <button
              ref={lightboxCloseRef}
              type="button"
              onClick={() => setFullPreviewOpen(false)}
              aria-label="Close full-size preview"
              className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 text-cream-50 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-cream-50 focus-visible:outline-none"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            {canvasRef.current && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={canvasRef.current.toDataURL('image/png')}
                alt="Full-size preview of your passport share card"
                width={1080}
                height={1920}
                className="max-w-full max-h-[78dvh] w-auto h-auto rounded-2xl border-2 border-white/20 shadow-2xl"
              />
            )}
            <div className="flex gap-2 w-full max-w-xs">
              <button
                ref={lightboxShareRef}
                type="button"
                onClick={handleShare}
                className="btn flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white text-xs flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cream-50 focus-visible:outline-none"
              >
                {canShareFiles ? <Instagram className="w-3.5 h-3.5" aria-hidden="true" /> : <Share2 className="w-3.5 h-3.5" aria-hidden="true" />}
                {canShareFiles ? 'Share to Instagram' : 'Share'}
              </button>
              <button
                ref={lightboxSaveRef}
                type="button"
                onClick={handleDownload}
                className="btn px-4 py-3 bg-white/10 hover:bg-white/20 border-2 border-white/30 text-cream-50 text-xs flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cream-50 focus-visible:outline-none"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Save
              </button>
            </div>
          </div>,
          document.body
        )}
    </Modal>
  );
}
