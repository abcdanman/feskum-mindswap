'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCheckpoints, getVisitorVisits } from '@/lib/supabase';
import { Checkpoint, BoothVisit } from '@/lib/types';
import { getOrInitVisitorId } from '@/lib/visitor';
import { Compass, Search, MapPin, QrCode, CheckCircle2, ChevronRight, LayoutList, Map as MapIcon } from 'lucide-react';
import BoothThumb from '@/components/BoothThumb';
import Modal from '@/components/Modal';
import FloorPlanMap from '@/components/FloorPlanMap';

export default function ExhibitionPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [visits, setVisits] = useState<BoothVisit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBooth, setSelectedBooth] = useState<Checkpoint | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [typeFilter, setTypeFilter] = useState<'all' | 'required' | 'partner'>('all');

  useEffect(() => {
    async function loadData() {
      const visitorId = getOrInitVisitorId();
      const [cList, vList] = await Promise.all([
        getCheckpoints(),
        getVisitorVisits(visitorId),
      ]);
      setCheckpoints(cList);
      setVisits(vList);
    }
    loadData();
  }, []);

  const visitedSet = new Set(visits.map(v => v.checkpoint_id));
  const lastCheckpointId =
    [...visits].sort((a, b) =>
      (b.visited_at || '').localeCompare(a.visited_at || '')
    )[0]?.checkpoint_id ?? null;

  const categories = ['All', ...Array.from(new Set(checkpoints.map(c => c.category)))];

  const filteredBooths = checkpoints.filter(booth => {
    const matchesSearch =
      booth.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booth.faculty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booth.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || booth.category === selectedCategory;
    const matchesType = typeFilter === 'all' || (booth.booth_type || 'required') === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-3xl text-ink flex items-center gap-2">
            <Compass className="w-6 h-6 text-brand-600" aria-hidden="true" /> Booths
          </h1>
          <p className="text-xs text-slate-500">Explore faculty booths and interactive showcases</p>
        </div>
        <span className="sticker bg-brand-500 text-white text-[9px]">{checkpoints.length} Booths</span>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" aria-hidden="true" />
        <input
          type="search"
          name="booth-search"
          aria-label="Search booths"
          placeholder="Search booth, faculty or location…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border-2 border-ink text-ink placeholder-slate-400 text-base shadow-brut"
        />
      </div>

      {/* VIEW TOGGLE */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border-2 border-ink shadow-brut text-xs font-bold w-fit">
        <button
          type="button"
          onClick={() => setView('list')}
          aria-pressed={view === 'list'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors ${
            view === 'list' ? 'bg-ink text-cream-50' : 'text-slate-500 hover:text-ink'
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" aria-hidden="true" /> List
        </button>
        <button
          type="button"
          onClick={() => setView('map')}
          aria-pressed={view === 'map'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors ${
            view === 'map' ? 'bg-ink text-cream-50' : 'text-slate-500 hover:text-ink'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" aria-hidden="true" /> Map
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border-2 border-ink shadow-brut text-xs font-bold w-fit">
        {[
          { key: 'all' as const, label: 'All booths' },
          { key: 'required' as const, label: 'Required' },
          { key: 'partner' as const, label: 'Partner' },
        ].map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTypeFilter(item.key)}
            aria-pressed={typeFilter === item.key}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              typeFilter === item.key ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            aria-pressed={selectedCategory === cat}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border-2 border-ink ${
              selectedCategory === cat ? 'bg-brand-500 text-white' : 'bg-white text-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {view === 'map' ? (
        <FloorPlanMap
          checkpoints={filteredBooths}
          visitedIds={visitedSet}
          lastCheckpointId={lastCheckpointId}
          onSelect={setSelectedBooth}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredBooths.map(booth => {
            const isVisited = visitedSet.has(booth.id);
            return (
              <article key={booth.id} className="card card-hover overflow-hidden group flex flex-col">
                <button
                  type="button"
                  onClick={() => setSelectedBooth(booth)}
                  className="text-left w-full"
                  aria-label={`View details for ${booth.name}`}
                >
                  {/* Photo banner */}
                  <div className="relative h-32 border-b-2 border-ink overflow-hidden">
                    <BoothThumb src={booth.image_url} alt={booth.name} iconClassName="w-10 h-10" className="group-hover:scale-105 transition-transform duration-300" />
                    <span
                      className={`absolute top-2 left-2 sticker text-[9px] max-w-[68%] truncate ${
                        booth.booth_type === 'partner' ? 'bg-gold-400 text-ink' : 'bg-ink text-cream-50'
                      }`}
                    >
                      {booth.booth_type === 'partner' ? 'Partner · ' : ''}{booth.category}
                    </span>
                    {isVisited && (
                      <span className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full border-2 border-ink">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> STAMPED
                      </span>
                    )}
                  </div>

                  <div className="px-4 pt-4 flex flex-col">
                    <h3 className="font-extrabold text-ink text-sm leading-tight line-clamp-2 group-hover:text-brand-600 transition-colors">
                      {booth.name}
                    </h3>
                    <p className="text-xs text-brand-600 font-bold mt-0.5">
                      {booth.faculty}
                      {booth.booth_type === 'partner' && <span className="text-slate-500 font-semibold"> · bonus +5</span>}
                    </p>

                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-cream-100 border-2 border-ink/10 rounded-full px-2 py-0.5 mt-2 self-start max-w-full">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">{booth.location}</span>
                    </span>

                    <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                      {booth.description}
                    </p>
                  </div>
                </button>

                <div className="px-4 pb-4 pt-3 mt-auto flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedBooth(booth)}
                    className="text-xs font-bold text-slate-500 hover:text-ink flex items-center gap-0.5"
                  >
                    Details <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  <Link
                    href="/scan"
                    className="btn flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-xs"
                  >
                    <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Scan</span>
                  </Link>
                </div>
              </article>
            );
          })}

          {filteredBooths.length === 0 && (
            <div className="text-center py-12 card p-6 space-y-2">
              <Compass className="w-10 h-10 text-slate-300 mx-auto" aria-hidden="true" />
              <h4 className="font-bold text-ink text-sm">No booths match your query</h4>
              <p className="text-xs text-slate-500">Try adjusting your search or category.</p>
            </div>
          )}
        </div>
      )}

      {/* BOOTH DETAILS MODAL */}
      {selectedBooth && (
        <Modal onClose={() => setSelectedBooth(null)} labelledBy="booth-detail-title">
          <div className="p-6">
            <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 border-2 border-ink relative">
              <BoothThumb src={selectedBooth.image_url} alt={selectedBooth.name} iconClassName="w-12 h-12" />
              <span
                className={`absolute top-2 left-2 sticker text-[9px] ${
                  selectedBooth.booth_type === 'partner' ? 'bg-gold-400 text-ink' : 'bg-ink text-cream-50'
                }`}
              >
                {selectedBooth.booth_type === 'partner' ? 'Partner booth' : 'Required booth'} · {selectedBooth.category}
              </span>
            </div>

            <h3 id="booth-detail-title" className="display text-2xl text-ink leading-tight mb-1">
              {selectedBooth.name}
            </h3>
            <p className="text-xs text-brand-600 font-bold mb-2">{selectedBooth.faculty}</p>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-4 p-2 rounded-xl bg-cream-100 border-2 border-ink/10">
              <MapPin className="w-4 h-4 text-brand-600 shrink-0" aria-hidden="true" />
              <span>{selectedBooth.location}</span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              {selectedBooth.description}
            </p>

            {selectedBooth.booth_type === 'partner' && (
              <p className="text-[11px] text-slate-500 mb-4 p-2.5 rounded-xl bg-amber-50 border-2 border-ink/10">
                Optional partner booth · +5 leaderboard points. Does not count toward the 8-stamp souvenir.
              </p>
            )}

            <Link
              href="/scan"
              className="btn w-full py-3 bg-brand-500 text-white text-sm flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" aria-hidden="true" />
              {selectedBooth.booth_type === 'partner' ? ' Scan partner QR for bonus stamp' : ' Scan booth QR to collect stamp'}
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
