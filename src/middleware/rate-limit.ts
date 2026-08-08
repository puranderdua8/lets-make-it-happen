import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { config } from '../config';
import { getRedis } from '../redis';

const passthrough: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

/**
 * Resolves a rate-limit key for the client. Under serverless-http (Netlify
 * Functions), the request is synthesized from the Lambda event rather than a
 * real socket, so req.ip can come back undefined even with trust proxy on —
 * falling through to Express's default keyGenerator would then bucket every
 * client together. Netlify sets x-nf-client-connection-ip to the true client
 * IP; x-forwarded-for and req.ip cover every other environment.
 */
function clientKey(req: Request): string {
  const ip =
    req.ip ??
    (req.headers['x-nf-client-connection-ip'] as string | undefined) ??
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim();
  // ipKeyGenerator normalizes IPv6 addresses (which have many equivalent
  // textual forms) so varying representation can't bypass the limit.
  return ip ? ipKeyGenerator(ip) : 'unknown';
}

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
    keyGenerator: clientKey,
    // trust proxy is deliberately permissive (Netlify/LB in front), and the
    // key may fall back to a non-IP sentinel above — both are intentional,
    // so silence the library's validation warnings for them.
    validate: { trustProxy: false, ip: false },
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
