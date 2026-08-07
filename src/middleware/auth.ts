import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config';
import { HttpError } from '../errors';
import type { UserRole } from '../models/user.model';

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing or malformed Authorization header');
  }

  try {
    const payload = jwt.verify(header.slice('Bearer '.length), config.jwtSecret) as jwt.JwtPayload;
    req.user = { id: String(payload.sub), role: payload.role as UserRole };
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  next();
}

export function requireOrganizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'organizer') {
    throw new HttpError(403, 'Only event organizers may perform this action');
  }
  next();
}
