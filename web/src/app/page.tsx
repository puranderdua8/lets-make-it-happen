import Link from 'next/link';

import { apiFetchAuthed } from '@/lib/api';
import { getSession } from '@/lib/session';
import type { ApiUser, EventListResponse } from '@/lib/types';

const PAGE_SIZE = 12;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [session, data] = await Promise.all([
    getSession(),
    apiFetchAuthed<EventListResponse>(`/events?page=${page}&limit=${PAGE_SIZE}`),
  ]);
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upcoming events</h1>
        {session?.role === 'organizer' && (
          <Link
            href="/events/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            New event
          </Link>
        )}
      </div>

      {data.events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No events yet.
          {session?.role === 'organizer' && ' Create the first one!'}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.events.map((event) => {
            const organizer = event.organizer as ApiUser;
            return (
              <li key={event._id}>
                <Link
                  href={`/events/${event._id}`}
                  className="block h-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
                >
                  <h2 className="font-semibold text-slate-900">{event.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {event.date} at {event.time}
                    {event.location ? ` · ${event.location}` : ''}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{event.description}</p>
                  <p className="mt-3 text-xs text-slate-400">by {organizer?.name ?? 'Unknown'}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={`/?page=${page - 1}`} className="text-indigo-600 hover:underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-slate-300">← Previous</span>
          )}
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/?page=${page + 1}`} className="text-indigo-600 hover:underline">
              Next →
            </Link>
          ) : (
            <span className="text-slate-300">Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
