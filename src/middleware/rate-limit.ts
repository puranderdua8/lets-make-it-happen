import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { config } from '../config';
import { getRedis } from '../redis';

const passthrough: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

function makeLimiter(prefix: string, windowMs: number, max: number): RequestHandler {
  if (config.rateLimit.disabled) {
    return passthrough;
  }

  const redis = getRedis();
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
    // Redis-backed counters are shared across all API instances; without
    // Redis, fall back to the default per-process in-memory store.
    store: redis
      ? new RedisStore({
          prefix,
          sendCommand: (command, ...args) => redis.call(command, ...args) as never,
        })
      : undefined,
  });
}

/** Strict limit for bcrypt-heavy auth endpoints (per IP). */
export const authLimiter = makeLimiter('rl:auth:', 60_000, config.rateLimit.authMax);

/** Lax safety-net limit for everything else (per IP). */
export const globalLimiter = makeLimiter('rl:global:', 60_000, config.rateLimit.globalMax);
