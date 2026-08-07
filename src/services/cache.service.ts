import { getRedis } from '../redis';

// Read-through cache helpers. Every function is a no-op (or cache miss) when
// Redis is not configured, and a cache failure must never fail the request.

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const redis = getRedis();
  if (!redis) return undefined;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch (err) {
    console.error(`Cache read failed for ${key}:`, err);
    return undefined;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`Cache write failed for ${key}:`, err);
  }
}

/** Deletes all keys matching the given prefixes (SCAN-based, non-blocking). */
export async function cacheInvalidate(...prefixes: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    for (const prefix of prefixes) {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = next;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    }
  } catch (err) {
    console.error('Cache invalidation failed:', err);
  }
}
