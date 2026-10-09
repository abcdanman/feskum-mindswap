'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminAnalytics, getCheckpoints } from '@/lib/supabase';
import { ArrowLeft, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export default function AdminExportPage() {
  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const exportBoothVisitsCSV = async () => {
    setExporting(true);
    const analytics = await getAdminAnalytics();
    const checkpoints = await getCheckpoints();
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
    setSuccessMsg('Booth Visits CSV downloaded! Open in Google Sheets.');
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
    setSuccessMsg('Speaker Votes CSV downloaded! Open in Google Sheets.');
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
      {/* HEADER */}
      <div className="flex items-center gap-2">
        <Link href="/admin" className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold text-white font-display">Data Export for Google Sheets</h1>
          <p className="text-xs text-slate-400">Export database analytics to CSV format</p>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-5 border border-brand-500/30 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Google Sheets Compatible Export</h3>
            <p className="text-xs text-slate-400">Instant one-click CSV download for event reporting.</p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-bounce">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={exportBoothVisitsCSV}
            disabled={exporting}
            className="w-full p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/50 flex items-center justify-between text-left transition-all group"
          >
            <div>
              <h4 className="font-bold text-white text-xs group-hover:text-brand-300">Booth Visits & Ratings CSV</h4>
              <p className="text-[11px] text-slate-400">Visitor IDs, booth ratings (1-5 stars), timestamp & reviews</p>
            </div>
            <Download className="w-4 h-4 text-brand-400 shrink-0" />
          </button>

          <button
            onClick={exportSpeakerVotesCSV}
            disabled={exporting}
            className="w-full p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 flex items-center justify-between text-left transition-all group"
          >
            <div>
              <h4 className="font-bold text-white text-xs group-hover:text-purple-300">UM Talk Speaker Votes CSV</h4>
              <p className="text-[11px] text-slate-400">People Choice vote counts per speaker</p>
            </div>
            <Download className="w-4 h-4 text-purple-400 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
