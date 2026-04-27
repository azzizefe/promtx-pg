import { redis } from './redis';
import { ApiError } from './errors';

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ success: boolean; retryAfter: number }> {
  try {
    const redisKey = `rl:${key}`;

    // Use multi/exec transaction for atomic increment and expire
    const multi = redis.multi();
    multi.incr(redisKey);
    multi.ttl(redisKey);

    const results = await multi.exec();
    if (!results) {
      return { success: true, retryAfter: 0 };
    }

    const currentCount = results[0][1] as number;
    const ttl = results[1][1] as number;

    // Set expiration on new keys
    if (currentCount === 1 || ttl === -1) {
      await redis.expire(redisKey, windowSeconds);
    }

    if (currentCount > limit) {
      return {
        success: false,
        retryAfter: ttl > 0 ? ttl : windowSeconds
      };
    }

    return { success: true, retryAfter: 0 };
  } catch (err) {
    // If Redis is unavailable, allow the request through
    console.warn('[RateLimit] Redis unavailable, skipping rate limit:', (err as Error).message);
    return { success: true, retryAfter: 0 };
  }
}
