import { Redis } from 'ioredis';

import { config } from './config';

let client: Redis | undefined;

/**
 * Shared Redis client, created lazily and only when REDIS_URL is configured.
 * Callers must treat `undefined` as "Redis unavailable" and fall back to an
 * in-process alternative so the app (and tests) run without Redis.
 */
export function getRedis(): Redis | undefined {
  if (!config.redisUrl) {
    return undefined;
  }
  if (!client) {
    // maxRetriesPerRequest: null is required by BullMQ and makes commands
    // wait for reconnection instead of failing fast.
    client = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    client.on('error', (err) => {
      console.error('Redis error:', err.message);
    });
  }
  return client;
}
