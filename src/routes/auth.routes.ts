import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config';
import { HttpError } from '../errors';
import { authLimiter } from '../middleware/rate-limit';
import { USER_ROLES, UserModel, type UserDocument, type UserRole } from '../models/user.model';
import { dispatchEmail } from '../queues/email.queue';

const BCRYPT_ROUNDS = 10;

function signToken(user: UserDocument): string {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.id,
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export const authRouter = Router();

authRouter.post('/register', authLimiter, async (req, res) => {
  const { name, email, password, role } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim() === '') {
    throw new HttpError(400, 'name is required');
  }
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, 'A valid email is required');
  }
  if (typeof password !== 'string' || password.length < 6) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }
  if (role !== undefined && !USER_ROLES.includes(role as never)) {
    throw new HttpError(400, `role must be one of: ${USER_ROLES.join(', ')}`);
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, 'A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await UserModel.create({
    name,
    email,
    passwordHash,
    role: role as UserRole | undefined,
  });

  await dispatchEmail({ type: 'welcome', to: user.email, name: user.name });

  res.status(201).json({ user: user.toJSON(), token: signToken(user) });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'email and password are required');
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  res.json({ user: user.toJSON(), token: signToken(user) });
});
