import 'server-only';

import { redirect } from 'next/navigation';

import { getSession } from './session';

// Server-only: the browser never talks to the Express API directly.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const session = await getSession();

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(503, 'The event service is unavailable. Please try again shortly.');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (!res.ok) {
    const message =
      typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.';
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/**
 * Like apiFetch, but treats a 401 (missing/expired token) as "session over":
 * redirects to the login page. For use in server components rendering
 * protected pages.
 */
export async function apiFetchAuthed<T>(path: string, options: ApiOptions = {}): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect('/login');
    }
    throw err;
  }
}
