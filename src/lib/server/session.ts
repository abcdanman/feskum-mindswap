import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const VISITOR_COOKIE = 'mindswap_visitor';
const ADMIN_COOKIE = 'mindswap_admin';
const VISITOR_TTL = 60 * 60 * 24 * 30;
const ADMIN_TTL = 60 * 60 * 12;

type SessionKind = 'visitor' | 'admin';

interface SessionPayload {
  kind: SessionKind;
  sub: string;
  iat: number;
  exp: number;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is not configured.');
  }
  return secret;
}

function encode(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return `v1.${body}.${signature}`;
}

function decode(token: string | undefined, kind: SessionKind): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const [, body, signature] = parts;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (payload.kind !== kind) return null;
    if (!payload.sub || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: Boolean(process.env.VERCEL),
    path: '/',
    maxAge,
  };
}

export function getVisitorId(request: NextRequest): string | null {
  return decode(request.cookies.get(VISITOR_COOKIE)?.value, 'visitor')?.sub ?? null;
}

export function setVisitorCookie(response: NextResponse, visitorId: string): void {
  const now = Math.floor(Date.now() / 1000);
  response.cookies.set(
    VISITOR_COOKIE,
    encode({ kind: 'visitor', sub: visitorId, iat: now, exp: now + VISITOR_TTL }),
    cookieOptions(VISITOR_TTL)
  );
}

export function clearVisitorCookie(response: NextResponse): void {
  response.cookies.set(VISITOR_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
}

export function hasAdminSession(request: NextRequest): boolean {
  return Boolean(decode(request.cookies.get(ADMIN_COOKIE)?.value, 'admin'));
}

export function setAdminCookie(response: NextResponse): void {
  const now = Math.floor(Date.now() / 1000);
  response.cookies.set(
    ADMIN_COOKIE,
    encode({ kind: 'admin', sub: 'admin', iat: now, exp: now + ADMIN_TTL }),
    cookieOptions(ADMIN_TTL)
  );
}

export function clearAdminCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
}

export function constantTimeEqual(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function verifyAdminPasscode(input: string): boolean {
  return constantTimeEqual(input, process.env.ADMIN_PASSCODE);
}

export function verifyStaffCode(input: string): boolean {
  return constantTimeEqual(input, process.env.STAFF_SCAN_CODE);
}
