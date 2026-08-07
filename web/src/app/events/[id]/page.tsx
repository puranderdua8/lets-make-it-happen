import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  CancelRegistrationButton,
  DeleteEventButton,
  RegisterButton,
} from '@/components/EventActions';
import { ApiError, apiFetchAuthed } from '@/lib/api';
import { getSession } from '@/lib/session';
import type { ApiEvent, ApiUser } from '@/lib/types';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let event: ApiEvent;
  try {
    ({ event } = await apiFetchAuthed<{ event: ApiEvent }>(
      `/events/${encodeURIComponent(id)}`,
    ));
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      notFound();
    }
    throw err;
  }

  const session = await getSession();
  const organizer = event.organizer as ApiUser;
  const participants = event.participants ?? [];
  const isOwner = session?.userId === organizer?._id;
  const isRegistered = participants.some((p) => p._id === session?.userId);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← All events
      </Link>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {event.date} at {event.time}
              {event.location ? ` · ${event.location}` : ''}
            </p>
            <p className="mt-1 text-sm text-slate-400">Organized by {organizer?.name}</p>
          </div>
          {isOwner && (
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/events/${event._id}/edit`}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Edit
              </Link>
              <DeleteEventButton eventId={event._id} />
            </div>
          )}
        </div>

        <p className="mt-4 whitespace-pre-line text-slate-700">{event.description}</p>

        <div className="mt-6">
          {isRegistered ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-green-700">✓ You are registered</span>
              <CancelRegistrationButton eventId={event._id} />
            </div>
          ) : (
            <RegisterButton eventId={event._id} />
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">
          Participants <span className="font-normal text-slate-400">({participants.length})</span>
        </h2>
        {participants.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No one has registered yet.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {participants.map((p) => (
              <li
                key={p._id}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
