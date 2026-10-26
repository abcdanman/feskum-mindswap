'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getCheckpoints } from '@/lib/supabase';
import { Checkpoint } from '@/lib/types';
import { ArrowLeft, Printer } from 'lucide-react';

interface SheetEntry {
  booth: Checkpoint;
  qr: string;
}

export default function BoothQrSheetPage() {
  const [entries, setEntries] = useState<SheetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await getCheckpoints();
      const origin = window.location.origin;
      const withQr = await Promise.all(
        list.map(async booth => ({
          booth,
          qr: await QRCode.toDataURL(`${origin}/checkpoint/${booth.qr_token}`, {
            width: 400,
            margin: 1,
          }),
        }))
      );
      setEntries(withQr);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .qr-cell { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* TOOLBAR (screen only) */}
      <div className="no-print flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/booths"
            className="p-2 rounded-xl bg-white text-ink border-2 border-ink shadow-brut"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="display text-2xl text-ink leading-none">QR signage sheet</h1>
            <p className="text-[11px] text-slate-500">Print, cut out and place at each booth</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          disabled={loading || entries.length === 0}
          className="btn px-3 py-2 bg-brand-500 text-white text-xs flex items-center gap-1.5 disabled:opacity-60"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-ink border-t-brand-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-3">Generating QR codes…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-500 no-print">
          No active booths to print.
        </div>
      ) : (
        <div className="print-sheet grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4">
          {entries.map(({ booth, qr }) => (
            <div
              key={booth.id}
              className="qr-cell card p-4 text-center flex flex-col items-center gap-2 border-2 border-dashed border-ink/40"
            >
              <span className="eyebrow text-brand-600">{booth.category}</span>
              <h2 className="font-extrabold text-ink text-sm leading-snug">{booth.name}</h2>
              <p className="text-[11px] text-slate-500">{booth.faculty}</p>
              <div className="w-40 h-40 p-2 bg-white rounded-2xl border-2 border-ink flex items-center justify-center">
                <img src={qr} alt={`QR for ${booth.name}`} className="w-full h-full object-contain" />
              </div>
              <p className="text-[10px] mono text-slate-500">/checkpoint/{booth.qr_token}</p>
              <p className="text-[10px] text-slate-400">{booth.location}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
