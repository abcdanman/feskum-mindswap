import { EVENT_TIME_ZONE } from './event';

export interface ScheduleItem {
  day: 'day1' | 'day2';
  /** 24h "HH:MM" in venue local time. */
  time: string;
  title: string;
  location: string;
  detail?: string;
}

// Tentative programme — public-facing subset of the full cue sheet (times
// and sessions attendees care about; internal PIC/crew assignments are
// left out since this page is for visitors, not staff).
export const SCHEDULE: ScheduleItem[] = [
  { day: 'day1', time: '09:00', title: 'Doors open · Booth exhibition begins', location: 'Faculty Booth Zone' },
  { day: 'day1', time: '09:30', title: 'Guest talks: WWF Malaysia & Teach For Malaysia', location: 'Main Hall' },
  { day: 'day1', time: '10:00', title: 'UM Talks — Round 1 (14 students)', location: 'Main Hall', detail: '10 minutes each' },
  { day: 'day1', time: '12:25', title: 'Round 1 ends · Top 4 announced', location: 'Main Hall' },
  { day: 'day1', time: '12:30', title: 'Alumni guest speaker: Mr Goh Chee Yong', location: 'Main Hall' },
  { day: 'day1', time: '12:50', title: 'Lunch break (Friday prayers)', location: 'Main Hall', detail: 'Resumes 2:30 PM' },
  { day: 'day1', time: '15:30', title: 'MindSwap Opening Ceremony', location: 'Main Hall' },
  { day: 'day1', time: '15:40', title: 'Day 1 keynote speaker', location: 'Main Hall' },
  { day: 'day1', time: '15:55', title: 'UM Talks — Semi-Finals (4 students)', location: 'Main Hall', detail: '10 minutes each' },
  { day: 'day1', time: '16:30', title: 'Semi-Finals end', location: 'Main Hall' },
  { day: 'day1', time: '16:35', title: 'VIP walkabout through faculty booths', location: 'Faculty Booth Zone' },
  { day: 'day1', time: '17:00', title: 'Day 1 closing', location: 'Main Hall' },
  { day: 'day1', time: '18:00', title: 'Marquee tent closes', location: 'Marquee Tent' },

  { day: 'day2', time: '09:00', title: 'Doors open · Booths reopen', location: 'Marquee Tent' },
  { day: 'day2', time: '11:00', title: 'Grand finalists announced · VIP booth tour', location: 'Faculty Booth Zone' },
  { day: 'day2', time: '11:15', title: 'Jeopardy game with Day 2 VIPs', location: 'Main Hall' },
  { day: 'day2', time: '12:00', title: 'UM Talks — Grand Final (2 students)', location: 'Main Hall', detail: 'All booths close for this session' },
  { day: 'day2', time: '12:25', title: 'Day 2 closing speaker: Dr Stefanie Pillai', location: 'Main Hall' },
  { day: 'day2', time: '12:45', title: 'MindSwap Closing Ceremony & Awards', location: 'Main Hall', detail: 'Best Faculty Booth · UM Talks Champion · People’s Choice' },
  { day: 'day2', time: '13:30', title: 'MindSwap @ FESKUM 2026 ends', location: 'Main Hall' },
  { day: 'day2', time: '14:00', title: 'Marquee tent closes', location: 'Marquee Tent' },
];

const EVENT_DATE: Record<'day1' | 'day2', string> = {
  day1: '2026-11-13',
  day2: '2026-11-14',
};

function toDate(day: 'day1' | 'day2', time: string): Date {
  return new Date(`${EVENT_DATE[day]}T${time}:00+08:00`);
}

/** The item currently "live" right now, if any, plus what's up next. */
export function getCurrentAgenda(now = new Date()): { current: ScheduleItem | null; next: ScheduleItem | null } {
  const sorted = [...SCHEDULE].sort((a, b) => toDate(a.day, a.time).getTime() - toDate(b.day, b.time).getTime());
  let current: ScheduleItem | null = null;
  let next: ScheduleItem | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const start = toDate(sorted[i].day, sorted[i].time);
    if (start.getTime() <= now.getTime()) {
      current = sorted[i];
    } else {
      next = sorted[i];
      break;
    }
  }
  return { current, next };
}

export function formatScheduleTime(time: string): string {
  const date = new Date(`2026-01-01T${time}:00+08:00`);
  return new Intl.DateTimeFormat('en-MY', { timeZone: EVENT_TIME_ZONE, hour: 'numeric', minute: '2-digit' }).format(date);
}
