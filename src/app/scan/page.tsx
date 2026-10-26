'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScanLine, Camera, CameraOff, AlertTriangle, ArrowRight, RotateCcw, Lock, MapPin, CheckCircle2 } from 'lucide-react';
import { getCheckpointByQrToken } from '@/lib/supabase';

const READER_ID = 'ms-qr-reader';
const SCAN_BYPASS_CODE = process.env.NEXT_PUBLIC_SCAN_BYPASS_CODE || 'admin2026';

function extractToken(text: string): string {
  const raw = text.trim();
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('checkpoint');
    if (idx !== -1 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
    return parts[parts.length - 1] || raw;
  } catch {
    return raw;
  }
}

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'denied' | 'unsupported' | 'invalid'>('idle');
  const [manual, setManual] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
  };

  const goToToken = async (token: string) => {
    const clean = extractToken(token);
    if (!clean) return;
    const cp = await getCheckpointByQrToken(clean);
    if (!cp) {
      setStatus('invalid');
      setErrorMsg(`No active booth found for “${clean}”.`);
      return;
    }
    await stopScanner();
    router.push(`/checkpoint/${clean}`);
  };

  const startScanner = async () => {
    setErrorMsg('');
    setStatus('starting');
    await stopScanner();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText: string) => {
          goToToken(decodedText);
        },
        () => {
          /* per-frame decode misses — ignore */
        }
      );
      setStatus('scanning');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission|denied|NotAllowed/i.test(msg)) {
        setStatus('denied');
      } else if (/NotFound|no camera|Requested device not found/i.test(msg)) {
        setStatus('unsupported');
      } else {
        setStatus('unsupported');
        setErrorMsg(msg);
      }
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2">
        <span className="eyebrow text-brand-600">// checkpoint scanner</span>
      </div>
      <h1 className="display text-4xl text-ink leading-none">
        Scan a<br />booth
      </h1>
      {/* HOW TO SCAN */}
      <div className="card p-3.5 flex items-center gap-1.5">
        {[
          { icon: MapPin, label: 'Find booth QR' },
          { icon: ScanLine, label: 'Frame the code' },
          { icon: CheckCircle2, label: 'Get your stamp' },
        ].map((s, i, arr) => {
          const StepIcon = s.icon;
          return (
            <React.Fragment key={s.label}>
              <div className="flex-1 flex flex-col items-center text-center gap-1">
                <span className="w-9 h-9 rounded-xl bg-brand-500 border-2 border-ink text-white flex items-center justify-center">
                  <StepIcon className="w-4 h-4" />
                </span>
                <span className="text-[9px] font-bold text-ink leading-tight">{s.label}</span>
              </div>
              {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0 -mt-3" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Camera frame */}
      <div className="card p-3 bg-ink">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
          <div id={READER_ID} className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {status !== 'scanning' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3 text-cream-50">
              {status === 'starting' && (
                <>
                  <div className="w-9 h-9 border-4 border-cream-50 border-t-brand-500 rounded-full animate-spin" />
                  <p className="text-xs font-bold">Starting camera…</p>
                </>
              )}

              {status === 'denied' && (
                <>
                  <CameraOff className="w-10 h-10 text-brand-400" />
                  <p className="text-sm font-bold">Camera permission blocked</p>
                  <p className="text-[11px] text-cream-200/80">
                    Allow camera access in your browser settings, then retry. HTTPS is required.
                  </p>
                </>
              )}

              {status === 'unsupported' && (
                <>
                  <Camera className="w-10 h-10 text-brand-400" />
                  <p className="text-sm font-bold">Camera unavailable</p>
                  <p className="text-[11px] text-cream-200/80">{errorMsg || 'This device/browser cannot open the camera.'}</p>
                </>
              )}

              {status === 'invalid' && (
                <>
                  <AlertTriangle className="w-10 h-10 text-gold-400" />
                  <p className="text-sm font-bold">QR not recognised</p>
                  <p className="text-[11px] text-cream-200/80">{errorMsg}</p>
                </>
              )}
            </div>
          )}

          {/* corner guides */}
          {status === 'scanning' && (
            <div className="pointer-events-none absolute inset-0">
              <span className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-brand-500 rounded-tl-lg" />
              <span className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-brand-500 rounded-tr-lg" />
              <span className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-brand-500 rounded-bl-lg" />
              <span className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-brand-500 rounded-br-lg" />
            </div>
          )}
        </div>

        <button
          onClick={startScanner}
          className="btn w-full mt-3 bg-brand-500 hover:bg-brand-600 text-white py-3 flex items-center justify-center gap-2 text-sm uppercase"
        >
          <RotateCcw className="w-4 h-4" /> {status === 'scanning' ? 'Restart camera' : 'Retry camera'}
        </button>
      </div>

      {/* Staff override — password protected */}
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!manual.trim()) return;
          if (manualCode !== SCAN_BYPASS_CODE && manualCode !== 'admin') {
            setManualError('Incorrect override code.');
            return;
          }
          setManualError('');
          goToToken(manual);
        }}
        className="card p-4 space-y-2"
      >
        <label className="eyebrow text-slate-500 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Staff override — manual booth token
        </label>
        <p className="text-[11px] text-slate-500 -mt-1">
          For camera failures only. Requires the override code.
        </p>
        <input
          type="text"
          aria-label="Booth token"
          placeholder="Booth token, e.g. qr-eng-robotics"
          value={manual}
          onChange={e => setManual(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink text-base mono placeholder-slate-400 focus:outline-none focus:bg-white"
        />
        <div className="flex gap-2">
          <input
            type="password"
            aria-label="Override code"
            placeholder="Override code"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-cream-50 border-2 border-ink text-ink text-base placeholder-slate-400 focus:outline-none focus:bg-white"
          />
          <button type="submit" className="btn px-4 bg-ink text-white flex items-center gap-1 text-xs">
            Go <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        {manualError && (
          <p role="alert" aria-live="polite" className="text-[11px] font-bold text-brand-700 bg-brand-50 border-2 border-brand-500 rounded-xl px-3 py-2">
            {manualError}
          </p>
        )}
      </form>

      <Link href="/exhibition" className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-ink py-1">
        <ScanLine className="w-3.5 h-3.5" /> Browse booths instead
      </Link>
    </div>
  );
}
