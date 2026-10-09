'use client';

import React from 'react';
import Link from 'next/link';
import { Checkpoint, BoothVisit } from '@/lib/types';
import { Award, CheckCircle2, QrCode, Star, MapPin } from 'lucide-react';

interface StampCardProps {
  checkpoint: Checkpoint;
  visit?: BoothVisit;
  index: number;
}

export default function StampCard({ checkpoint, visit, index }: StampCardProps) {
  const isCompleted = Boolean(visit);

  return (
    <div
      className={`relative group rounded-2xl p-4 transition-all duration-300 ${
        isCompleted
          ? 'bg-white border-2 border-emerald-500/50 shadow-md shadow-emerald-500/5'
          : 'bg-white border border-slate-200/80 shadow-sm opacity-90 hover:opacity-100 hover:border-brand-500/40'
      }`}
    >
      {/* Number Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          #{String(index + 1).padStart(2, '0')}
        </span>
        <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200 truncate max-w-[140px]">
          {checkpoint.category}
        </span>
      </div>

      {/* Booth Title & Details */}
      <h4 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 mb-1 group-hover:text-brand-600 transition-colors font-display">
        {checkpoint.name}
      </h4>
      <p className="text-xs text-brand-600 font-bold mb-2">{checkpoint.faculty}</p>
      
      <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-3">
        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">{checkpoint.location}</span>
      </div>

      {/* Completed Stamp Badge or Scan QR Button */}
      {isCompleted ? (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= (visit?.rating || 5)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold shadow-sm animate-stamp-bump">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>COLLECTED</span>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 italic">Not collected yet</span>
          <Link
            href={`/checkpoint/${checkpoint.qr_token}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </Link>
        </div>
      )}
    </div>
  );
}
