import Redis from 'ioredis';

const isSentinel = process.env.REDIS_SENTINEL_ENABLED === 'true';

// Sentinel or Standard Connection Setup
export const redis = isSentinel
  ? new Redis({
      sentinels: [
        { host: process.env.REDIS_SENTINEL_HOST || 'localhost', port: Number(process.env.REDIS_SENTINEL_PORT) || 26379 },
      ],
      name: process.env.REDIS_MASTER_NAME || 'mymaster',
      password: process.env.REDIS_PASSWORD || undefined,
      sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || undefined,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      }
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      }
    });

redis.on('error', (err) => {
  console.error('[Redis Failure / Sentinel Failover Attempt]', err);
});

// Cache Keys Implementation (8.4 Cache Stratejisi)
export const cacheKeys = {
  userProfile: (id: string) => `user:${id}:profile`,
  userWallet: (id: string) => `user:${id}:wallet`,
  session: (token: string) => `session:${token}`,
  rateLimit: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
};

// Write-through and TTL Cache Helpers
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) as T : null;
  } catch {
    return null;
  }
}

export async function setCachedData(key: string, value: any, ttlSeconds = 3600): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`[Redis Save Error for ${key}]`, err);
  }
}

export async function purgeCachedData(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[Redis Delete Error for ${key}]`, err);
  }
}
