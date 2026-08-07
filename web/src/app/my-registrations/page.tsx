import Link from 'next/link';

import { apiFetchAuthed } from '@/lib/api';
import type { ApiEvent, ApiUser } from '@/lib/types';

export default async function MyRegistrationsPage() {
  const { events } = await apiFetchAuthed<{ events: ApiEvent[] }>('/events/my/registrations');

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">My registrations</h1>

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          You haven&apos;t registered for any events yet.{' '}
          <Link href="/" className="text-indigo-600 hover:underline">
            Browse events
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const organizer = event.organizer as ApiUser;
            return (
              <li key={event._id}>
                <Link
                  href={`/events/${event._id}`}
                  className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-slate-900">{event.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {event.date} at {event.time}
                        {event.location ? ` · ${event.location}` : ''} · by{' '}
                        {organizer?.name ?? 'Unknown'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      Registered
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
