'use client';

const VISITOR_ID_KEY = 'mindswap_visitor_id';
const VISITOR_NAME_KEY = 'mindswap_visitor_name';
const VISITOR_USERNAME_KEY = 'mindswap_visitor_username';
const VISITOR_MATRIC_KEY = 'mindswap_visitor_matric';
const VISITOR_FACULTY_KEY = 'mindswap_visitor_faculty';
const VISITOR_SHOW_KEY = 'mindswap_visitor_show';

export interface VisitorIdentity {
  name: string;
  username: string;
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
    return { name: '', username: '', matric: '', faculty: '', showOnLeaderboard: true, complete: false };
  }
  const name = localStorage.getItem(VISITOR_NAME_KEY) || '';
  const username = localStorage.getItem(VISITOR_USERNAME_KEY) || '';
  const matric = localStorage.getItem(VISITOR_MATRIC_KEY) || '';
  const faculty = localStorage.getItem(VISITOR_FACULTY_KEY) || '';
  const showRaw = localStorage.getItem(VISITOR_SHOW_KEY);
  const showOnLeaderboard = showRaw === null ? true : showRaw === 'true';
  return {
    name,
    username,
    matric,
    faculty,
    showOnLeaderboard,
    complete: Boolean(name && faculty && username),
  };
}

export function setVisitorIdentity(identity: {
  name: string;
  username: string;
  matric: string;
  faculty: string;
  showOnLeaderboard?: boolean;
}): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VISITOR_NAME_KEY, identity.name.trim());
  localStorage.setItem(VISITOR_USERNAME_KEY, identity.username.trim().toLowerCase());
  localStorage.setItem(VISITOR_MATRIC_KEY, identity.matric.trim());
  localStorage.setItem(VISITOR_FACULTY_KEY, identity.faculty.trim());
  localStorage.setItem(VISITOR_SHOW_KEY, String(identity.showOnLeaderboard ?? true));
}

export function isIdentityComplete(): boolean {
  return getVisitorIdentity().complete;
}

export interface VisitorSessionBootstrap {
  authenticated: boolean;
  visitorId?: string;
  identity?: VisitorIdentity;
}

export async function ensureVisitorSession(): Promise<VisitorSessionBootstrap> {
  if (typeof window === 'undefined') return { authenticated: false };
  const localIdentity = getVisitorIdentity();
  const localId = getOrInitVisitorId();
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        action: 'visitor.session',
        payload: {
          legacyId: localId,
          username: localIdentity.username,
          matric: localIdentity.matric,
        },
      }),
    });
    if (!response.ok) return { authenticated: false };
    const result = (await response.json()) as {
      authenticated?: boolean;
      visitorId?: string;
      identity?: {
        name: string;
        username: string;
        matric: string;
        faculty: string;
        showOnLeaderboard: boolean;
      };
    };
    if (!result.authenticated || !result.visitorId) return { authenticated: false };
    if (result.visitorId !== localId) setVisitorId(result.visitorId);
    if (result.identity) {
      setVisitorIdentity(result.identity);
      return {
        authenticated: true,
        visitorId: result.visitorId,
        identity: { ...result.identity, complete: Boolean(result.identity.name && result.identity.faculty && result.identity.username) },
      };
    }
    return { authenticated: true, visitorId: result.visitorId };
  } catch {
    return { authenticated: false };
  }
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

export function getVisitorUsername(): string {
  if (typeof window === 'undefined') return '';
  return getVisitorIdentity().username;
}

export function setVisitorUsername(username: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VISITOR_USERNAME_KEY, username.trim().toLowerCase());
}

export function getPublicDisplayName(displayName: string, username?: string | null): string {
  return username ? `@${username}` : maskName(displayName || 'Visitor');
}

export function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Visitor';
  if (parts.length === 1) {
    const name = parts[0];
    if (name.length <= 2) return `${name.charAt(0)}*`;
    return `${name.charAt(0)}${'*'.repeat(Math.max(1, name.length - 2))}${name.charAt(name.length - 1)}`;
  }
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
