'use server';

import { redirect } from 'next/navigation';

import { ApiError, apiFetch } from '@/lib/api';
import { clearSession, createSession } from '@/lib/session';
import type { ActionState, AuthResponse } from '@/lib/types';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Only same-origin path redirects — prevents open-redirect via ?next=. */
function safeNextPath(raw: FormDataEntryValue | null): string {
  const value = typeof raw === 'string' ? raw : '';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address' };
  if (password.length === 0) return { error: 'Enter your password' };

  let auth: AuthResponse;
  try {
    auth = await apiFetch<AuthResponse>('/login', { method: 'POST', body: { email, password } });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Login failed. Please try again.' };
  }

  await createSession(auth.token, { name: auth.user.name, role: auth.user.role });
  redirect(safeNextPath(formData.get('next')));
}

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const role = String(formData.get('role') ?? 'attendee');

  if (name.length === 0) return { error: 'Enter your name' };
  if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters' };
  if (role !== 'organizer' && role !== 'attendee') return { error: 'Choose a valid role' };

  let auth: AuthResponse;
  try {
    auth = await apiFetch<AuthResponse>('/register', {
      method: 'POST',
      body: { name, email, password, role },
    });
  } catch (err) {
    return {
      error: err instanceof ApiError ? err.message : 'Registration failed. Please try again.',
    };
  }

  await createSession(auth.token, { name: auth.user.name, role: auth.user.role });
  redirect('/');
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect('/login');
}
