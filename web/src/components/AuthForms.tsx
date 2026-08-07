'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { login, register } from '@/actions/auth';
import type { ActionState } from '@/lib/types';

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';
const buttonClass =
  'w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60';

function ErrorNote({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {state.error}
    </p>
  );
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(login, {});

  return (
    <form action={action} className="space-y-4">
      <ErrorNote state={state} />
      {nextPath && <input type="hidden" name="next" value={nextPath} />}
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input id="password" name="password" type="password" required className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? 'Logging in…' : 'Log in'}
      </button>
      <p className="text-center text-sm text-slate-600">
        No account?{' '}
        <Link href="/register" className="text-indigo-600 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, {});

  return (
    <form action={action} className="space-y-4">
      <ErrorNote state={state} />
      <div>
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input id="name" name="name" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="role" className={labelClass}>
          I want to
        </label>
        <select id="role" name="role" className={inputClass} defaultValue="attendee">
          <option value="attendee">Attend events</option>
          <option value="organizer">Organize events</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
