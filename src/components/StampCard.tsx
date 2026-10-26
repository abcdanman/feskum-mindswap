'use client';

import React from 'react';
import Link from 'next/link';
import { Checkpoint, BoothVisit } from '@/lib/types';
import { CheckCircle2, QrCode, Star, MapPin } from 'lucide-react';

interface StampCardProps {
  checkpoint: Checkpoint;
  visit?: BoothVisit;
  index: number;
}

export default function StampCard({ checkpoint, visit, index }: StampCardProps) {
  const isCompleted = Boolean(visit);

  return (
    <div
      className={`relative group card card-hover p-4 ${
        isCompleted ? 'bg-emerald-50' : 'bg-white'
      }`}
    >
      {/* Number Badge */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <span className="display text-3xl text-slate-300 leading-none">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="sticker bg-brand-500 text-white text-[9px] truncate max-w-[150px]">
          {checkpoint.category}
        </span>
      </div>

      {/* Booth Title & Details */}
      <h4 className="display text-lg text-ink leading-tight line-clamp-2 mb-1 group-hover:text-brand-600 transition-colors">
        {checkpoint.name}
      </h4>
      <p className="text-xs text-brand-600 font-bold mb-2">{checkpoint.faculty}</p>

      <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-3">
        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">{checkpoint.location}</span>
      </div>

      {/* Completed Stamp Badge or Scan QR Button */}
      {isCompleted ? (
        <div className="pt-3 border-t-2 border-ink/10 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= (visit?.rating || 5) ? 'text-gold-500 fill-gold-500' : 'text-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold border-2 border-ink animate-stamp-bump">
            <CheckCircle2 className="w-3 h-3" />
            <span>STAMPED</span>
          </div>
        </div>
      ) : (
        <div className="pt-3 border-t-2 border-ink/10 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 italic">Not collected</span>
          <Link
            href="/scan"
            className="btn flex items-center gap-1.5 px-3 py-1.5 bg-ink hover:bg-brand-500 text-white text-xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </Link>
        </div>
      )}
    </div>
  );
}
