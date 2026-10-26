'use client';

const VISITOR_ID_KEY = 'mindswap_visitor_id';
const VISITOR_NAME_KEY = 'mindswap_visitor_name';
const VISITOR_MATRIC_KEY = 'mindswap_visitor_matric';
const VISITOR_FACULTY_KEY = 'mindswap_visitor_faculty';
const VISITOR_SHOW_KEY = 'mindswap_visitor_show';

export interface VisitorIdentity {
  name: string;
  matric: string;
  faculty: string;
  showOnLeaderboard: boolean;
  complete: boolean;
}

function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    try {
      return window.crypto.randomUUID();
    } catch {
      // Fallback if blocked
    }
  }
  return 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9) + '-' + Math.random().toString(36).substring(2, 9);
}

export function getOrInitVisitorId(): string {
  if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateUUID();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export function setVisitorId(visitorId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VISITOR_ID_KEY, visitorId);
}

export function getVisitorIdentity(): VisitorIdentity {
  if (typeof window === 'undefined') {
    return { name: '', matric: '', faculty: '', showOnLeaderboard: true, complete: false };
  }
  const name = localStorage.getItem(VISITOR_NAME_KEY) || '';
  const matric = localStorage.getItem(VISITOR_MATRIC_KEY) || '';
  const faculty = localStorage.getItem(VISITOR_FACULTY_KEY) || '';
  const showRaw = localStorage.getItem(VISITOR_SHOW_KEY);
  const showOnLeaderboard = showRaw === null ? true : showRaw === 'true';
  return {
    name,
    matric,
    faculty,
    showOnLeaderboard,
    complete: Boolean(name && faculty),
  };
}

export function setVisitorIdentity(identity: {
  name: string;
  matric: string;
  faculty: string;
  showOnLeaderboard?: boolean;
}): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VISITOR_NAME_KEY, identity.name.trim());
  localStorage.setItem(VISITOR_MATRIC_KEY, identity.matric.trim());
  localStorage.setItem(VISITOR_FACULTY_KEY, identity.faculty.trim());
  localStorage.setItem(VISITOR_SHOW_KEY, String(identity.showOnLeaderboard ?? true));
}

export function isIdentityComplete(): boolean {
  return getVisitorIdentity().complete;
}

// ---- Back-compat helpers (used by Header) ----
export function getVisitorName(): string {
  if (typeof window === 'undefined') return '';
  return getVisitorIdentity().name;
}

export function setVisitorName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VISITOR_NAME_KEY, name.trim());
}

export function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Visitor';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
