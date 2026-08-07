import { redirect } from 'next/navigation';

import { EventForm } from '@/components/EventForm';
import { getSession } from '@/lib/session';

export default async function NewEventPage() {
  const session = await getSession();
  if (session?.role !== 'organizer') {
    redirect('/');
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">Create an event</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <EventForm />
      </div>
    </div>
  );
}
