import { Router } from 'express';
import { isValidObjectId } from 'mongoose';

import { HttpError } from '../errors';
import { authenticate, requireOrganizer } from '../middleware/auth';
import { EventModel, type EventDocument } from '../models/event.model';
import { RegistrationModel } from '../models/registration.model';
import { UserModel } from '../models/user.model';
import { dispatchEmail } from '../queues/email.queue';
import { cacheGet, cacheInvalidate, cacheSet } from '../services/cache.service';

const POPULATE_FIELDS = 'name email role';
const CACHE_TTL_SECONDS = 30;
const LIST_CACHE_PREFIX = 'events:list:';
const DETAIL_CACHE_PREFIX = 'events:id:';
const MAX_PAGE_SIZE = 100;

async function findEventOrThrow(id: string): Promise<EventDocument> {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, 'Invalid event id');
  }
  const event = await EventModel.findById(id);
  if (!event) {
    throw new HttpError(404, 'Event not found');
  }
  return event;
}

function assertOwnEvent(event: EventDocument, userId: string): void {
  if (event.organizer.toString() !== userId) {
    throw new HttpError(403, 'You can only manage events you organize');
  }
}

interface EventBody {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
}

export const eventRouter = Router();

eventRouter.use(authenticate);

eventRouter.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || 20));

  const cacheKey = `${LIST_CACHE_PREFIX}${page}:${limit}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const [events, total] = await Promise.all([
    EventModel.find()
      .sort({ date: 1, time: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('organizer', POPULATE_FIELDS)
      .lean(),
    EventModel.countDocuments(),
  ]);

  const body = { events, page, limit, total };
  await cacheSet(cacheKey, body, CACHE_TTL_SECONDS);
  res.json(body);
});

// Must be declared before '/:id' so 'my' is not parsed as an event id.
eventRouter.get('/my/registrations', async (req, res) => {
  const registrations = await RegistrationModel.find({ user: req.user!.id })
    .populate({
      path: 'event',
      populate: { path: 'organizer', select: POPULATE_FIELDS },
    })
    .lean();

  const events = registrations
    .map((r) => r.event as unknown as { date?: string; time?: string } | null)
    .filter((e) => e !== null)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  res.json({ events });
});

eventRouter.get('/:id', async (req, res) => {
  const id = String(req.params.id);
  const cacheKey = `${DETAIL_CACHE_PREFIX}${id}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const event = await findEventOrThrow(id);
  await event.populate({ path: 'organizer', select: POPULATE_FIELDS });
  const registrations = await RegistrationModel.find({ event: id })
    .populate('user', POPULATE_FIELDS)
    .lean();

  const body = {
    event: { ...event.toJSON(), participants: registrations.map((r) => r.user) },
  };
  await cacheSet(cacheKey, body, CACHE_TTL_SECONDS);
  res.json(body);
});

eventRouter.post('/', requireOrganizer, async (req, res) => {
  // Field validation (required fields, date/time format) is enforced by the schema.
  const { title, description, date, time, location } = (req.body ?? {}) as EventBody;
  const event = await EventModel.create({
    title,
    description,
    date,
    time,
    location,
    organizer: req.user!.id,
  });

  await cacheInvalidate(LIST_CACHE_PREFIX);
  res.status(201).json({ event });
});

eventRouter.put('/:id', requireOrganizer, async (req, res) => {
  const event = await findEventOrThrow(String(req.params.id));
  assertOwnEvent(event, req.user!.id);

  const { title, description, date, time, location } = (req.body ?? {}) as EventBody;
  if (title !== undefined) event.set('title', title);
  if (description !== undefined) event.set('description', description);
  if (date !== undefined) event.set('date', date);
  if (time !== undefined) event.set('time', time);
  if (location !== undefined) event.set('location', location);
  await event.save();

  await cacheInvalidate(LIST_CACHE_PREFIX, `${DETAIL_CACHE_PREFIX}${event.id}`);
  res.json({ event });
});

eventRouter.delete('/:id', requireOrganizer, async (req, res) => {
  const event = await findEventOrThrow(String(req.params.id));
  assertOwnEvent(event, req.user!.id);

  await event.deleteOne();
  await RegistrationModel.deleteMany({ event: event.id });

  await cacheInvalidate(LIST_CACHE_PREFIX, `${DETAIL_CACHE_PREFIX}${event.id}`);
  res.status(204).end();
});

eventRouter.post('/:id/register', async (req, res) => {
  const event = await findEventOrThrow(String(req.params.id));
  const userId = req.user!.id;

  let registration;
  try {
    // Single atomic insert; the unique {event, user} index makes concurrent
    // duplicate registrations impossible instead of racily checked.
    registration = await RegistrationModel.create({ event: event.id, user: userId });
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
      throw new HttpError(409, 'You are already registered for this event');
    }
    throw err;
  }

  const user = await UserModel.findById(userId);
  if (user) {
    await dispatchEmail({
      type: 'event-registration',
      to: user.email,
      name: user.name,
      event: { title: event.title, date: event.date, time: event.time },
    });
  }

  await cacheInvalidate(`${DETAIL_CACHE_PREFIX}${event.id}`);
  res.status(201).json({ message: 'Registered for event', registration });
});

eventRouter.delete('/:id/register', async (req, res) => {
  const event = await findEventOrThrow(String(req.params.id));
  const { deletedCount } = await RegistrationModel.deleteOne({
    event: event.id,
    user: req.user!.id,
  });
  if (deletedCount === 0) {
    throw new HttpError(404, 'You are not registered for this event');
  }

  await cacheInvalidate(`${DETAIL_CACHE_PREFIX}${event.id}`);
  res.json({ message: 'Registration cancelled' });
});
