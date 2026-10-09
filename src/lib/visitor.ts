'use client';

const VISITOR_ID_KEY = 'mindswap_visitor_id';
const VISITOR_NAME_KEY = 'mindswap_visitor_name';

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

export function getVisitorName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(VISITOR_NAME_KEY) || '';
}

export function setVisitorName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VISITOR_NAME_KEY, name.trim());
}
