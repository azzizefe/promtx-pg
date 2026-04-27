import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis };

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!globalForRedis.redis) {
  globalForRedis.redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying after 3 attempts
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
    connectTimeout: 5000,
  });

  globalForRedis.redis.on('error', (err) => {
    console.warn('[Redis] Connection error (non-fatal):', err.message);
  });
}

export const redis = globalForRedis.redis;
