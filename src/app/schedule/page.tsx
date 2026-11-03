'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Radio, Clock } from 'lucide-react';
import { SCHEDULE, getCurrentAgenda, formatScheduleTime, ScheduleItem } from '@/lib/schedule';
import { getDefaultLeaderboardDay } from '@/lib/event';

const DAY_TABS: { key: 'day1' | 'day2'; label: string }[] = [
  { key: 'day1', label: 'Day 1 · 13 Nov' },
  { key: 'day2', label: 'Day 2 · 14 Nov' },
];

export default function SchedulePage() {
  const [day, setDay] = useState<'day1' | 'day2'>('day1');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const defaultDay = getDefaultLeaderboardDay();
    if (defaultDay === 'day1' || defaultDay === 'day2') setDay(defaultDay);
    setNow(new Date());
    // Refresh the "happening now" highlight every minute without a full poll.
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { current, next } = now ? getCurrentAgenda(now) : { current: null, next: null };
  const items = SCHEDULE.filter(i => i.day === day);

  const isPast = (item: ScheduleItem) => {
    if (!current) return false;
    if (item.day !== current.day) return item.day === 'day1' && current.day === 'day2';
    return item.time < current.time;
  };
  const isCurrent = (item: ScheduleItem) => current?.day === item.day && current?.time === item.time;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <span className="eyebrow text-brand-600">// tentative</span>
        <h1 className="display text-4xl text-ink leading-none">Programme</h1>
        <p className="text-xs text-slate-500 mt-1">Subject to change on the day — follow announcements on the main screen.</p>
      </div>

      {/* HAPPENING NOW */}
      <div className="card p-4 bg-ink text-cream-50">
        {current ? (
          <div className="flex items-start gap-3">
            <span className="relative flex h-3 w-3 mt-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <span className="eyebrow text-emerald-400">Happening now</span>
              <h2 className="font-extrabold text-sm leading-snug mt-0.5">{current.title}</h2>
              <p className="text-[11px] text-cream-200/70 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" aria-hidden="true" /> {current.location}
              </p>
            </div>
          </div>
        ) : next ? (
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-cream-200/60 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <span className="eyebrow text-cream-200/60">Up next</span>
              <h2 className="font-extrabold text-sm leading-snug mt-0.5">{next.title}</h2>
              <p className="text-[11px] text-cream-200/70 mt-0.5">
                {formatScheduleTime(next.time)} · {next.location}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-cream-200/60 shrink-0" aria-hidden="true" />
            <p className="text-xs text-cream-200/80">That&apos;s a wrap — see you next time!</p>
          </div>
        )}
      </div>

      {/* DAY TABS */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border-2 border-ink shadow-brut text-xs font-bold">
        {DAY_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setDay(tab.key)}
            aria-pressed={day === tab.key}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-colors ${
              day === tab.key ? 'bg-ink text-cream-50' : 'text-slate-500 hover:text-ink'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" /> {tab.label}
          </button>
        ))}
      </div>

      {/* TIMELINE */}
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={`${item.day}-${item.time}`}
            className={`card p-3.5 flex items-start gap-3 ${
              isCurrent(item)
                ? 'bg-emerald-50 border-emerald-500'
                : isPast(item)
                ? 'opacity-50'
                : 'bg-white'
            }`}
          >
            <span className="mono text-xs font-bold text-brand-600 bg-cream-100 border-2 border-ink/10 rounded-lg px-2 py-1 shrink-0 tnum">
              {formatScheduleTime(item.time)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-ink">{item.title}</p>
                {isCurrent(item) && (
                  <span className="sticker bg-emerald-500 text-white text-[8px]">Live</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" /> {item.location}
                {item.detail && <span className="text-slate-400"> · {item.detail}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
