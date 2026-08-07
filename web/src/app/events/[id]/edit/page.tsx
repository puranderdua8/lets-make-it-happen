import { notFound, redirect } from 'next/navigation';

import { EventForm } from '@/components/EventForm';
import { ApiError, apiFetchAuthed } from '@/lib/api';
import { getSession } from '@/lib/session';
import type { ApiEvent, ApiUser } from '@/lib/types';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
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
  if (session?.userId !== organizer?._id) {
    redirect(`/events/${event._id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">Edit event</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <EventForm event={event} />
      </div>
    </div>
  );
}
