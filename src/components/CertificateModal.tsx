'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Image as ImageIcon, Loader2, X } from 'lucide-react';
import {
  renderAppreciationCertificate,
  certificateCanvasToBlob,
  generateAppreciationCertificatePdf,
  appreciationCertificateFileName,
} from '@/lib/appreciationCertificate';

interface CertificateModalProps {
  name: string;
  onClose: () => void;
}

export default function CertificateModal({ name, onClose }: CertificateModalProps) {
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState<'pdf' | 'png' | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    let cancelled = false;
    setRendering(true);
    const canvas = canvasRef.current;
    if (canvas) {
      renderAppreciationCertificate(name, canvas).then(() => {
        if (!cancelled) setRendering(false);
      });
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', handleKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const handleDownloadPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy('pdf');
    try {
      const doc = generateAppreciationCertificatePdf(canvas);
      doc.save(appreciationCertificateFileName(name));
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy('png');
    try {
      const blob = await certificateCanvasToBlob(canvas);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = appreciationCertificateFileName(name).replace(/\.pdf$/, '.png');
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setBusy(null);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] bg-ink animate-fadeIn overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label="Certificate of appreciation preview"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close certificate preview"
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 text-cream-50 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-cream-50 focus-visible:outline-none"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>

      <div>
        <h3 className="display text-xl text-cream-50 text-center leading-none">Certificate of Appreciation</h3>
        <p className="text-[11px] text-cream-50/60 text-center mt-1">Good for LinkedIn or your portfolio.</p>
      </div>

      <div className="relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-ink">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/60">
            <Loader2 className="w-6 h-6 text-cream-50 animate-spin" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex gap-2 w-full max-w-xs">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={rendering || busy !== null}
          className="btn flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cream-50 focus-visible:outline-none"
        >
          {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <FileText className="w-3.5 h-3.5" aria-hidden="true" />}
          PDF
        </button>
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={rendering || busy !== null}
          className="btn flex-1 py-3 bg-white/10 hover:bg-white/20 border-2 border-white/30 disabled:opacity-50 text-cream-50 text-xs flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cream-50 focus-visible:outline-none"
        >
          {busy === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />}
          PNG
        </button>
      </div>
    </div>,
    document.body
  );
}
