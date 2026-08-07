import 'server-only';

import { cookies } from 'next/headers';

import type { Role } from './types';

const TOKEN_COOKIE = 'token';
const DISPLAY_COOKIE = 'user_display';
const MAX_AGE_SECONDS = 60 * 60; // matches the backend's default JWT_EXPIRES_IN of 1h

export interface Session {
  token: string;
  userId: string;
  name: string;
  role: Role;
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
} as const;

export async function createSession(token: string, user: { name: string; role: Role }): Promise<void> {
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, cookieOptions);
  // Display-only data for the nav; authorization always re-checks the JWT
  // backend-side. httpOnly regardless — client JS has no need to read it.
  store.set(DISPLAY_COOKIE, JSON.stringify(user), cookieOptions);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  store.delete(DISPLAY_COOKIE);
}

/**
 * Reads the session from cookies. The JWT payload is decoded (not verified —
 * the backend verifies the signature on every proxied request) purely to get
 * the user id and role for UI decisions.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { sub?: string; role?: Role; exp?: number };
    if (!payload.sub || !payload.role) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    const displayRaw = store.get(DISPLAY_COOKIE)?.value;
    const display = displayRaw ? (JSON.parse(displayRaw) as { name?: string }) : {};

    return { token, userId: payload.sub, role: payload.role, name: display.name ?? 'User' };
  } catch {
    return null;
  }
}
