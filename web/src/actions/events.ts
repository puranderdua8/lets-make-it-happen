'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ApiError, apiFetch } from '@/lib/api';
import type { ActionState, ApiEvent } from '@/lib/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

interface EventFields {
  title: string;
  description: string;
  date: string;
  time: string;
  location?: string;
}

function readEventFields(formData: FormData): EventFields | { error: string } {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const date = String(formData.get('date') ?? '').trim();
  const time = String(formData.get('time') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();

  if (title.length === 0) return { error: 'Enter a title' };
  if (description.length === 0) return { error: 'Enter a description' };
  if (!DATE_RE.test(date)) return { error: 'Enter a valid date (YYYY-MM-DD)' };
  if (!TIME_RE.test(time)) return { error: 'Enter a valid time (HH:MM)' };

  return { title, description, date, time, location: location || undefined };
}

function toActionError(err: unknown, fallback: string): ActionState {
  if (err instanceof ApiError) {
    if (err.status === 401) redirect('/login');
    return { error: err.message };
  }
  return { error: fallback };
}

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = readEventFields(formData);
  if ('error' in fields) return fields;

  let event: ApiEvent;
  try {
    ({ event } = await apiFetch<{ event: ApiEvent }>('/events', {
      method: 'POST',
      body: fields,
    }));
  } catch (err) {
    return toActionError(err, 'Could not create the event. Please try again.');
  }

  revalidatePath('/');
  redirect(`/events/${event._id}`);
}

export async function updateEvent(
  eventId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fields = readEventFields(formData);
  if ('error' in fields) return fields;

  try {
    await apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: 'PUT', body: fields });
  } catch (err) {
    return toActionError(err, 'Could not update the event. Please try again.');
  }

  revalidatePath('/');
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function deleteEvent(eventId: string): Promise<ActionState> {
  try {
    await apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
  } catch (err) {
    return toActionError(err, 'Could not delete the event. Please try again.');
  }

  revalidatePath('/');
  redirect('/');
}

export async function registerForEvent(
  eventId: string,
  _prev: ActionState,
): Promise<ActionState> {
  try {
    await apiFetch(`/events/${encodeURIComponent(eventId)}/register`, { method: 'POST' });
  } catch (err) {
    return toActionError(err, 'Could not register for the event. Please try again.');
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath('/my-registrations');
  return {};
}

export async function cancelRegistration(
  eventId: string,
  _prev: ActionState,
): Promise<ActionState> {
  try {
    await apiFetch(`/events/${encodeURIComponent(eventId)}/register`, { method: 'DELETE' });
  } catch (err) {
    return toActionError(err, 'Could not cancel the registration. Please try again.');
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath('/my-registrations');
  return {};
}
