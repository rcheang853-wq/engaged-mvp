// Advanced caching strategies for performance optimization

import Redis from 'ioredis';

// Redis client configuration
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      redis.on('error', (error) => {
        console.error('Redis connection error:', error);
      });

      redis.on('connect', () => {
        console.log('Redis connected successfully');
      });
    } catch (error) {
      console.warn('Redis initialization failed, falling back to memory cache:', error);
    }
  }
  return redis;
}

// In-memory cache fallback
const memoryCache = new Map<string, { data: any; expires: number }>();

// Cache interface
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  serialize?: boolean; // Whether to serialize data
}

// Default cache TTL values
export const CACHE_TTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 60 * 60, // 1 hour
  DAY: 24 * 60 * 60, // 24 hours
  WEEK: 7 * 24 * 60 * 60, // 1 week
} as const;

// Generic cache class
export class Cache {
  private redis: Redis | null;

  constructor() {
    this.redis = getRedisClient();
  }

  // Set cache value
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const { ttl = CACHE_TTL.MEDIUM, serialize = true, tags = [] } = options;
    const serializedValue = serialize ? JSON.stringify(value) : value;
    const expiresAt = Date.now() + (ttl * 1000);

    try {
      if (this.redis) {
        // Use Redis if available
        const pipeline = this.redis.pipeline();
        pipeline.setex(key, ttl, serializedValue);

        // Store tags for cache invalidation
        if (tags.length > 0) {
          tags.forEach(tag => {
            pipeline.sadd(`tag:${tag}`, key);
            pipeline.expire(`tag:${tag}`, ttl);
          });
        }

        await pipeline.exec();
      } else {
        // Fallback to memory cache
        memoryCache.set(key, { data: serializedValue, expires: expiresAt });
      }
    } catch (error) {
      console.error('Cache set error:', error);
      // Fallback to memory cache
      memoryCache.set(key, { data: serializedValue, expires: expiresAt });
    }
  }

  // Get cache value
  async get<T = any>(key: string, deserialize = true): Promise<T | null> {
    try {
      if (this.redis) {
        const value = await this.redis.get(key);
        if (value === null) return null;
        return deserialize ? JSON.parse(value) : value;
      } else {
        // Fallback to memory cache
        const cached = memoryCache.get(key);
        if (!cached || cached.expires < Date.now()) {
          memoryCache.delete(key);
          return null;
        }
        return deserialize ? JSON.parse(cached.data) : cached.data;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Delete cache value
  async delete(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      }
      memoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Invalidate cache by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (this.redis && tags.length > 0) {
        const pipeline = this.redis.pipeline();

        for (const tag of tags) {
          const keys = await this.redis.smembers(`tag:${tag}`);
          if (keys.length > 0) {
            pipeline.del(...keys);
            pipeline.del(`tag:${tag}`);
          }
        }

        await pipeline.exec();
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.flushdb();
      }
      memoryCache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<{ keys: number; memory?: string }> {
    try {
      if (this.redis) {
        const info = await this.redis.info('memory');
        const keys = await this.redis.dbsize();
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        return {
          keys,
          memory: memoryMatch ? memoryMatch[1].trim() : undefined,
        };
      } else {
        return {
          keys: memoryCache.size,
          memory: `${JSON.stringify(Object.fromEntries(memoryCache)).length} bytes`,
        };
      }
    } catch (error) {
      console.error('Cache stats error:', error);
      return { keys: 0 };
    }
  }
}

// Singleton cache instance
export const cache = new Cache();

// Higher-level caching utilities
export class EventCache {
  private cache: Cache;

  constructor() {
    this.cache = new Cache();
  }

  // Cache event data
  async cacheEvent(eventId: string, eventData: any): Promise<void> {
    await this.cache.set(`event:${eventId}`, eventData, {
      ttl: CACHE_TTL.LONG,
      tags: ['events', `event:${eventId}`],
    });
  }

  // Get cached event
  async getEvent(eventId: string): Promise<any | null> {
    return this.cache.get(`event:${eventId}`);
  }

  // Cache event list
  async cacheEventList(cacheKey: string, events: any[], ttl = CACHE_TTL.MEDIUM): Promise<void> {
    await this.cache.set(`events:${cacheKey}`, events, {
      ttl,
      tags: ['events', 'event-lists'],
    });
  }

  // Get cached event list
  async getEventList(cacheKey: string): Promise<any[] | null> {
    return this.cache.get(`events:${cacheKey}`);
  }

  // Invalidate event caches
  async invalidateEvents(): Promise<void> {
    await this.cache.invalidateByTags(['events']);
  }

  // Invalidate specific event
  async invalidateEvent(eventId: string): Promise<void> {
    await this.cache.invalidateByTags([`event:${eventId}`]);
  }
}

// User session cache
export class SessionCache {
  private cache: Cache;

  constructor() {
    this.cache = new Cache();
  }

  // Cache user session
  async cacheUserSession(userId: string, sessionData: any): Promise<void> {
    await this.cache.set(`session:${userId}`, sessionData, {
      ttl: CACHE_TTL.DAY,
      tags: ['sessions', `user:${userId}`],
    });
  }

  // Get user session
  async getUserSession(userId: string): Promise<any | null> {
    return this.cache.get(`session:${userId}`);
  }

  // Cache user preferences
  async cacheUserPreferences(userId: string, preferences: any): Promise<void> {
    await this.cache.set(`preferences:${userId}`, preferences, {
      ttl: CACHE_TTL.WEEK,
      tags: ['preferences', `user:${userId}`],
    });
  }

  // Get user preferences
  async getUserPreferences(userId: string): Promise<any | null> {
    return this.cache.get(`preferences:${userId}`);
  }

  // Invalidate user data
  async invalidateUser(userId: string): Promise<void> {
    await this.cache.invalidateByTags([`user:${userId}`]);
  }
}

// API response cache
export class APICache {
  private cache: Cache;

  constructor() {
    this.cache = new Cache();
  }

  // Cache API response
  async cacheResponse(endpoint: string, params: any, response: any, ttl = CACHE_TTL.SHORT): Promise<void> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    await this.cache.set(cacheKey, response, {
      ttl,
      tags: ['api-responses', endpoint],
    });
  }

  // Get cached API response
  async getResponse(endpoint: string, params: any): Promise<any | null> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    return this.cache.get(cacheKey);
  }

  // Invalidate API cache
  async invalidateEndpoint(endpoint: string): Promise<void> {
    await this.cache.invalidateByTags([endpoint]);
  }

  // Generate cache key from endpoint and parameters
  private generateCacheKey(endpoint: string, params: any): string {
    const paramString = JSON.stringify(params);
    const hash = Buffer.from(paramString).toString('base64');
    return `api:${endpoint}:${hash}`;
  }
}

// Export singleton instances
export const eventCache = new EventCache();
export const sessionCache = new SessionCache();
export const apiCache = new APICache();

// Cleanup function for memory cache
export function cleanupMemoryCache(): void {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (value.expires < now) {
      memoryCache.delete(key);
    }
  }
}

// Schedule memory cache cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryCache, 5 * 60 * 1000);
}