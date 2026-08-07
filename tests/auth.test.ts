import request from 'supertest';

import { createApp } from '../src/app';
import { sendWelcomeEmail } from '../src/services/email.service';

jest.mock('../src/services/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendEventRegistrationEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

const validUser = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'secret123',
  role: 'organizer',
};

describe('POST /register', () => {
  it('registers a user, returns a token, and sends a welcome email', async () => {
    const res = await request(app).post('/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'organizer',
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(sendWelcomeEmail).toHaveBeenCalledWith('alice@example.com', 'Alice');
  });

  it('defaults role to attendee', async () => {
    const res = await request(app)
      .post('/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('attendee');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/register').send(validUser);
    const res = await request(app).post('/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/register').send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid role with 400', async () => {
    const res = await request(app)
      .post('/register')
      .send({ ...validUser, role: 'admin' });
    expect(res.status).toBe(400);
  });

  it('rejects a short password with 400', async () => {
    const res = await request(app)
      .post('/register')
      .send({ ...validUser, password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /login', () => {
  beforeEach(async () => {
    await request(app).post('/register').send(validUser);
  });

  it('logs in with valid credentials and returns a token', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: validUser.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'nobody@example.com', password: 'secret123' });

    expect(res.status).toBe(401);
  });

  it('rejects a missing password with 400', async () => {
    const res = await request(app).post('/login').send({ email: validUser.email });
    expect(res.status).toBe(400);
  });
});
