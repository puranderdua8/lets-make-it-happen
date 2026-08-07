import type { Metadata } from 'next';
import Link from 'next/link';

import { logout } from '@/actions/auth';
import { getSession } from '@/lib/session';

import './globals.css';

export const metadata: Metadata = {
  title: "Let's Make It Happen",
  description: 'Browse, organize, and join virtual events',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold text-indigo-700">
                Let&apos;s Make It Happen
              </Link>
              {session && (
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <Link href="/" className="hover:text-slate-900">
                    Events
                  </Link>
                  <Link href="/my-registrations" className="hover:text-slate-900">
                    My registrations
                  </Link>
                  {session.role === 'organizer' && (
                    <Link href="/events/new" className="hover:text-slate-900">
                      New event
                    </Link>
                  )}
                </div>
              )}
            </div>
            {session ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-700">{session.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    session.role === 'organizer'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {session.role}
                </span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                  >
                    Log out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <Link href="/login" className="text-slate-700 hover:text-slate-900">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
                >
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
