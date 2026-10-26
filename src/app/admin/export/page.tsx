'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getAdminAnalytics, getCheckpoints } from '@/lib/supabase';
import { ArrowLeft, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export default function AdminExportPage() {
  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const exportBoothVisitsCSV = async () => {
    setExporting(true);
    const analytics = await getAdminAnalytics();
    const checkpoints = await getCheckpoints(true);
    const cpMap = new Map(checkpoints.map(c => [c.id, c]));

    let csvContent = 'Visitor ID,Checkpoint Name,Faculty,Rating,Review,Visited At\n';
    analytics.visits.forEach(v => {
      const cp = cpMap.get(v.checkpoint_id);
      const name = (cp?.name || 'Unknown').replace(/"/g, '""');
      const faculty = (cp?.faculty || 'Unknown').replace(/"/g, '""');
      const review = (v.review || '').replace(/"/g, '""');
      csvContent += `"${v.visitor_id}","${name}","${faculty}",${v.rating},"${review}","${v.visited_at}"\n`;
    });

    downloadCSV(csvContent, 'MindSwap_2026_Booth_Visits.csv');
    setExporting(false);
    setSuccessMsg('Booth Visits CSV downloaded.');
  };

  const exportSpeakerVotesCSV = async () => {
    setExporting(true);
    const analytics = await getAdminAnalytics();
    let csvContent = 'Speaker ID,Speaker Name,Faculty / Org,Session Title,Total Votes\n';

    analytics.speakers.forEach(s => {
      const name = s.name.replace(/"/g, '""');
      const org = s.organisation.replace(/"/g, '""');
      const session = s.session_title.replace(/"/g, '""');
      csvContent += `"${s.id}","${name}","${org}","${session}",${s.vote_count || 0}\n`;
    });

    downloadCSV(csvContent, 'MindSwap_2026_Speaker_Votes.csv');
    setExporting(false);
    setSuccessMsg('Speaker Votes CSV downloaded.');
  };

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2">
        <Link href="/admin" className="p-2 rounded-xl bg-white text-ink border-2 border-ink shadow-brut">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="display text-2xl text-ink leading-none">Export data</h1>
          <p className="text-[11px] text-slate-500">CSV downloads for Google Sheets</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 border-2 border-ink text-emerald-700 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-ink text-sm">One-click CSV export</h3>
            <p className="text-xs text-slate-500">Instant downloads for event reporting.</p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border-2 border-ink text-emerald-700 text-xs font-bold text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={exportBoothVisitsCSV}
            disabled={exporting}
            className="btn w-full p-4 bg-white flex items-center justify-between text-left"
          >
            <div>
              <h4 className="font-bold text-ink text-xs">Booth Visits & Ratings CSV</h4>
              <p className="text-[11px] text-slate-500">Visitor IDs, ratings, timestamps & reviews</p>
            </div>
            <Download className="w-4 h-4 text-brand-600 shrink-0" />
          </button>

          <button
            onClick={exportSpeakerVotesCSV}
            disabled={exporting}
            className="btn w-full p-4 bg-white flex items-center justify-between text-left"
          >
            <div>
              <h4 className="font-bold text-ink text-xs">UM Talk Speaker Votes CSV</h4>
              <p className="text-[11px] text-slate-500">People Choice vote counts per speaker</p>
            </div>
            <Download className="w-4 h-4 text-purple-600 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
