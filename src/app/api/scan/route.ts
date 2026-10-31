import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffCode } from '@/lib/server/session';

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

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

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  if (isRateLimited(key)) {
    return json({ error: 'Too many attempts. Wait a minute and try again.' }, 429);
  }

  let code = '';
  try {
    const body = await request.json();
    code = typeof body?.code === 'string' ? body.code : '';
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  if (!code || !verifyStaffCode(code)) {
    return json({ error: 'Incorrect override code.' }, 401);
  }
  attempts.delete(key);
  return json({ ok: true });
}
