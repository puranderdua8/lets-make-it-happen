'use client';

import { useActionState } from 'react';

import { createEvent, updateEvent } from '@/actions/events';
import type { ActionState, ApiEvent } from '@/lib/types';

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

export function EventForm({ event }: { event?: ApiEvent }) {
  const action = event ? updateEvent.bind(null, event._id) : createEvent;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input id="title" name="title" required defaultValue={event?.title} className={inputClass} />
      </div>
      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={event?.description}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className={labelClass}>
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={event?.date}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="time" className={labelClass}>
            Time
          </label>
          <input
            id="time"
            name="time"
            type="time"
            required
            defaultValue={event?.time}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="location" className={labelClass}>
          Location <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="location"
          name="location"
          defaultValue={event?.location}
          placeholder="Online"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? 'Saving…' : event ? 'Save changes' : 'Create event'}
      </button>
    </form>
  );
}
