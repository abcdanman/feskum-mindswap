import { LeaderboardDay } from './types';

export const EVENT_TIME_ZONE = 'Asia/Kuala_Lumpur';

export const EVENT_DAYS = [
  { key: 'day1' as const, label: 'Day 1', shortLabel: '13 Nov', date: '2026-11-13' },
  { key: 'day2' as const, label: 'Day 2', shortLabel: '14 Nov', date: '2026-11-14' },
];

export function getEventDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function getEventDayForDate(now = new Date()): LeaderboardDay {
  const today = getEventDateKey(now);
  return EVENT_DAYS.find(day => day.date === today)?.key ?? 'all';
}

export function getDefaultLeaderboardDay(now = new Date()): LeaderboardDay {
  return getEventDayForDate(now);
}

export function getLeaderboardDayRange(day: LeaderboardDay): { start: string; end: string } | null {
  if (day === 'all') return null;
  const startDate = day === 'day1' ? '2026-11-13' : '2026-11-14';
  const endDate = day === 'day1' ? '2026-11-14' : '2026-11-15';
  return {
    start: new Date(`${startDate}T00:00:00+08:00`).toISOString(),
    end: new Date(`${endDate}T00:00:00+08:00`).toISOString(),
  };
}

export function getLeaderboardDayLabel(day: LeaderboardDay): string {
  if (day === 'all') return 'All days';
  return EVENT_DAYS.find(item => item.key === day)?.shortLabel ?? 'All days';
}
