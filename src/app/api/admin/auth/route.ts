import { NextRequest, NextResponse } from 'next/server';
import {
  clearAdminCookie,
  hasAdminSession,
  setAdminCookie,
  verifyAdminPasscode,
} from '@/lib/server/session';

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function clientKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

export async function GET(request: NextRequest) {
  return json({ authenticated: hasAdminSession(request) });
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  if (isRateLimited(key)) {
    return json({ error: 'Too many attempts. Wait a minute and try again.' }, 429);
  }

  let passcode = '';
  try {
    const body = await request.json();
    passcode = typeof body?.passcode === 'string' ? body.passcode : '';
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  if (!passcode || !verifyAdminPasscode(passcode)) {
    return json({ error: 'Invalid passcode.' }, 401);
  }

  attempts.delete(key);
  const response = json({ authenticated: true });
  setAdminCookie(response);
  return response;
}

export async function DELETE() {
  const response = json({ authenticated: false });
  clearAdminCookie(response);
  return response;
}
