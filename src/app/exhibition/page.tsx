'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCheckpoints, getVisitorVisits } from '@/lib/supabase';
import { Checkpoint, BoothVisit } from '@/lib/types';
import { getOrInitVisitorId } from '@/lib/visitor';
import { Compass, Search, MapPin, QrCode, CheckCircle2, Star, ChevronRight } from 'lucide-react';

export default function ExhibitionPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBooth, setSelectedBooth] = useState<Checkpoint | null>(null);

  useEffect(() => {
    async function loadData() {
      const visitorId = getOrInitVisitorId();
      const [cList, vList] = await Promise.all([
        getCheckpoints(),
        getVisitorVisits(visitorId)
      ]);
      setCheckpoints(cList);
      setVisitedSet(new Set(vList.map(v => v.checkpoint_id)));
    }
    loadData();
  }, []);

  const categories = ['All', ...Array.from(new Set(checkpoints.map(c => c.category)))];

  const filteredBooths = checkpoints.filter(booth => {
    const matchesSearch =
      booth.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booth.faculty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booth.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || booth.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white font-display flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-400" /> Laluan Aspirasi Exhibition
          </h1>
          <p className="text-xs text-slate-400">Explore UM faculty booths & interactive showcases</p>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
          {checkpoints.length} Booths
        </span>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search booth name, faculty, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-400"
        />
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* BOOTHS LIST */}
      <div className="grid grid-cols-1 gap-3">
        {filteredBooths.map((booth) => {
          const isVisited = visitedSet.has(booth.id);
          return (
            <div
              key={booth.id}
              className="glass-card glass-card-hover rounded-2xl p-4 border border-slate-800 flex flex-col justify-between group"
            >
              <div className="flex items-start gap-3.5 mb-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700 relative">
                  <img src={booth.image_url || ''} alt={booth.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  {isVisited && (
                    <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20 truncate">
                      {booth.category}
                    </span>
                    {isVisited && (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> STAMPED
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-white text-sm leading-tight line-clamp-1 group-hover:text-brand-300 transition-colors">
                    {booth.name}
                  </h3>
                  <p className="text-xs text-brand-400 font-medium">{booth.faculty}</p>
                  
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {booth.location}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                {booth.description}
              </p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => setSelectedBooth(booth)}
                  className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-0.5"
                >
                  View Details <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <Link
                  href={`/checkpoint/${booth.qr_token}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan Checkpoint</span>
                </Link>
              </div>
            </div>
          );
        })}

        {filteredBooths.length === 0 && (
          <div className="text-center py-12 glass-card rounded-2xl border border-slate-800 p-6 space-y-2">
            <Compass className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="font-bold text-white text-sm">No exhibition booths match your query</h4>
            <p className="text-xs text-slate-400">Try adjusting your search terms or category selection.</p>
          </div>
        )}
      </div>

      {/* BOOTH DETAILS MODAL */}
      {selectedBooth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm glass-card rounded-3xl p-6 border border-brand-500/30 shadow-2xl relative">
            <button
              onClick={() => setSelectedBooth(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              ✕
            </button>

            <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 border border-slate-700 relative">
              <img src={selectedBooth.image_url || ''} alt={selectedBooth.name} className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-brand-300 text-[10px] font-bold uppercase tracking-wider border border-white/10">
                {selectedBooth.category}
              </span>
            </div>

            <h3 className="font-extrabold text-white text-lg leading-tight font-display mb-1">{selectedBooth.name}</h3>
            <p className="text-xs text-brand-400 font-bold mb-2">{selectedBooth.faculty}</p>

            <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-4 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
              <span>{selectedBooth.location}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              {selectedBooth.description}
            </p>

            <Link
              href={`/checkpoint/${selectedBooth.qr_token}`}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-400 hover:from-brand-500 hover:to-brand-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
            >
              <QrCode className="w-4 h-4" /> Go To Checkpoint & Collect Stamp
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
