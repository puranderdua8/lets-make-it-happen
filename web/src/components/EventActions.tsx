'use client';

import { useActionState } from 'react';

import { cancelRegistration, deleteEvent, registerForEvent } from '@/actions/events';
import type { ActionState } from '@/lib/types';

function ActionError({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-red-700">
      {state.error}
    </p>
  );
}

export function RegisterButton({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(registerForEvent.bind(null, eventId), {});
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? 'Registering…' : 'Register for this event'}
      </button>
      <ActionError state={state} />
    </form>
  );
}

export function CancelRegistrationButton({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(cancelRegistration.bind(null, eventId), {});
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
      >
        {pending ? 'Cancelling…' : 'Cancel registration'}
      </button>
      <ActionError state={state} />
    </form>
  );
}

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(
    async (prev: ActionState) => deleteEvent(eventId),
    {},
  );
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm('Delete this event? This cannot be undone.')) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? 'Deleting…' : 'Delete event'}
      </button>
      <ActionError state={state} />
    </form>
  );
}
