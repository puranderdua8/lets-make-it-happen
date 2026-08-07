import request from 'supertest';

import { createApp } from '../src/app';
import { sendEventRegistrationEmail } from '../src/services/email.service';

jest.mock('../src/services/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendEventRegistrationEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

const eventPayload = {
  title: 'TypeScript Meetup',
  description: 'Deep dive into TS 7',
  date: '2026-09-15',
  time: '18:30',
  location: 'Online',
};

async function registerUser(
  email: string,
  role: 'organizer' | 'attendee',
): Promise<{ token: string; id: string }> {
  const res = await request(app)
    .post('/register')
    .send({ name: email.split('@')[0], email, password: 'secret123', role });
  expect(res.status).toBe(201);
  return { token: res.body.token, id: res.body.user._id };
}

let organizer: { token: string; id: string };
let attendee: { token: string; id: string };

beforeEach(async () => {
  organizer = await registerUser('organizer@example.com', 'organizer');
  attendee = await registerUser('attendee@example.com', 'attendee');
});

async function createEvent(
  token: string = organizer.token,
  overrides: Partial<typeof eventPayload> = {},
): Promise<string> {
  const res = await request(app)
    .post('/events')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...eventPayload, ...overrides });
  expect(res.status).toBe(201);
  return res.body.event._id;
}

describe('authentication guard', () => {
  it('rejects requests without a token with 401', async () => {
    const res = await request(app).get('/events');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token with 401', async () => {
    const res = await request(app).get('/events').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });
});

describe('POST /events', () => {
  it('lets an organizer create an event', async () => {
    const res = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send(eventPayload);

    expect(res.status).toBe(201);
    expect(res.body.event).toMatchObject({
      title: eventPayload.title,
      date: eventPayload.date,
      time: eventPayload.time,
      organizer: organizer.id,
    });
  });

  it('forbids attendees from creating events (403)', async () => {
    const res = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${attendee.token}`)
      .send(eventPayload);

    expect(res.status).toBe(403);
  });

  it('rejects an invalid event payload with 400', async () => {
    const res = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ ...eventPayload, date: 'next tuesday' });

    expect(res.status).toBe(400);
  });
});

describe('GET /events', () => {
  it('lists events for any authenticated user', async () => {
    await createEvent();
    const res = await request(app)
      .get('/events')
      .set('Authorization', `Bearer ${attendee.token}`);

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.events[0].organizer.email).toBe('organizer@example.com');
  });

  it('paginates with page and limit and caps limit at 100', async () => {
    for (let i = 1; i <= 5; i++) {
      await createEvent(organizer.token, { title: `Event ${i}`, date: `2026-09-0${i}` });
    }

    const page1 = await request(app)
      .get('/events?page=1&limit=2')
      .set('Authorization', `Bearer ${attendee.token}`);
    expect(page1.status).toBe(200);
    expect(page1.body.events).toHaveLength(2);
    expect(page1.body).toMatchObject({ page: 1, limit: 2, total: 5 });
    expect(page1.body.events[0].title).toBe('Event 1');

    const page3 = await request(app)
      .get('/events?page=3&limit=2')
      .set('Authorization', `Bearer ${attendee.token}`);
    expect(page3.body.events).toHaveLength(1);
    expect(page3.body.events[0].title).toBe('Event 5');

    const capped = await request(app)
      .get('/events?limit=5000')
      .set('Authorization', `Bearer ${attendee.token}`);
    expect(capped.body.limit).toBe(100);
  });

  it('returns a single event with populated participants', async () => {
    const id = await createEvent();
    await request(app)
      .post(`/events/${id}/register`)
      .set('Authorization', `Bearer ${attendee.token}`);

    const res = await request(app)
      .get(`/events/${id}`)
      .set('Authorization', `Bearer ${attendee.token}`);

    expect(res.status).toBe(200);
    expect(res.body.event.title).toBe(eventPayload.title);
    expect(res.body.event.participants).toHaveLength(1);
    expect(res.body.event.participants[0].email).toBe('attendee@example.com');
  });

  it('returns 404 for an unknown event id', async () => {
    const res = await request(app)
      .get('/events/64b000000000000000000000')
      .set('Authorization', `Bearer ${attendee.token}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed event id', async () => {
    const res = await request(app)
      .get('/events/not-an-id')
      .set('Authorization', `Bearer ${attendee.token}`);

    expect(res.status).toBe(400);
  });
});

describe('PUT /events/:id', () => {
  it('lets the owning organizer update the event', async () => {
    const id = await createEvent();
    const res = await request(app)
      .put(`/events/${id}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ title: 'Renamed Meetup', time: '19:00' });

    expect(res.status).toBe(200);
    expect(res.body.event.title).toBe('Renamed Meetup');
    expect(res.body.event.time).toBe('19:00');
    expect(res.body.event.description).toBe(eventPayload.description);
  });

  it("forbids updating another organizer's event (403)", async () => {
    const id = await createEvent();
    const otherOrganizer = await registerUser('other@example.com', 'organizer');

    const res = await request(app)
      .put(`/events/${id}`)
      .set('Authorization', `Bearer ${otherOrganizer.token}`)
      .send({ title: 'Hijacked' });

    expect(res.status).toBe(403);
  });

  it('forbids attendees from updating events (403)', async () => {
    const id = await createEvent();
    const res = await request(app)
      .put(`/events/${id}`)
      .set('Authorization', `Bearer ${attendee.token}`)
      .send({ title: 'Hijacked' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /events/:id', () => {
  it('lets the owning organizer delete the event and cascades registrations', async () => {
    const id = await createEvent();
    await request(app)
      .post(`/events/${id}/register`)
      .set('Authorization', `Bearer ${attendee.token}`);

    const res = await request(app)
      .delete(`/events/${id}`)
      .set('Authorization', `Bearer ${organizer.token}`);
    expect(res.status).toBe(204);

    const list = await request(app)
      .get('/events')
      .set('Authorization', `Bearer ${organizer.token}`);
    expect(list.body.events).toHaveLength(0);

    const mine = await request(app)
      .get('/events/my/registrations')
      .set('Authorization', `Bearer ${attendee.token}`);
    expect(mine.body.events).toHaveLength(0);
  });

  it("forbids deleting another organizer's event (403)", async () => {
    const id = await createEvent();
    const otherOrganizer = await registerUser('other@example.com', 'organizer');

    const res = await request(app)
      .delete(`/events/${id}`)
      .set('Authorization', `Bearer ${otherOrganizer.token}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /events/:id/register', () => {
  it('registers the user and sends a confirmation email', async () => {
    const id = await createEvent();
    const res = await request(app)
      .post(`/events/${id}/register`)
      .set('Authorization', `Bearer ${attendee.token}`);

    expect(res.status).toBe(201);
    expect(res.body.registration).toMatchObject({ event: id, user: attendee.id });
    expect(sendEventRegistrationEmail).toHaveBeenCalledWith(
      'attendee@example.com',
      'attendee',
      expect.objectContaining({ title: eventPayload.title }),
    );
  });

  it('rejects duplicate registration with 409', async () => {
    const id = await createEvent();
    const auth = ['Authorization', `Bearer ${attendee.token}`] as const;

    await request(app).post(`/events/${id}/register`).set(...auth);
    const res = await request(app).post(`/events/${id}/register`).set(...auth);

    expect(res.status).toBe(409);
  });

  it('allows exactly one of two concurrent registrations (no race)', async () => {
    const id = await createEvent();
    const auth = ['Authorization', `Bearer ${attendee.token}`] as const;

    const [a, b] = await Promise.all([
      request(app).post(`/events/${id}/register`).set(...auth),
      request(app).post(`/events/${id}/register`).set(...auth),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);

    const detail = await request(app).get(`/events/${id}`).set(...auth);
    expect(detail.body.event.participants).toHaveLength(1);
  });

  it('returns 404 when registering for an unknown event', async () => {
    const res = await request(app)
      .post('/events/64b000000000000000000000/register')
      .set('Authorization', `Bearer ${attendee.token}`);

    expect(res.status).toBe(404);
  });
});

describe('GET /events/my/registrations', () => {
  it('lists only the events the user registered for', async () => {
    const id = await createEvent();
    await request(app)
      .post(`/events/${id}/register`)
      .set('Authorization', `Bearer ${attendee.token}`);

    const mine = await request(app)
      .get('/events/my/registrations')
      .set('Authorization', `Bearer ${attendee.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.events).toHaveLength(1);
    expect(mine.body.events[0]._id).toBe(id);

    const organizersOwn = await request(app)
      .get('/events/my/registrations')
      .set('Authorization', `Bearer ${organizer.token}`);
    expect(organizersOwn.body.events).toHaveLength(0);
  });
});

describe('DELETE /events/:id/register', () => {
  it('cancels an existing registration', async () => {
    const id = await createEvent();
    const auth = ['Authorization', `Bearer ${attendee.token}`] as const;

    await request(app).post(`/events/${id}/register`).set(...auth);
    const res = await request(app).delete(`/events/${id}/register`).set(...auth);

    expect(res.status).toBe(200);

    const detail = await request(app).get(`/events/${id}`).set(...auth);
    expect(detail.body.event.participants).toHaveLength(0);
  });

  it('returns 404 when the user is not registered', async () => {
    const id = await createEvent();
    const res = await request(app)
      .delete(`/events/${id}/register`)
      .set('Authorization', `Bearer ${attendee.token}`);

    expect(res.status).toBe(404);
  });
});
