import Redis, { type RedisOptions } from 'ioredis'
import { SCRAPING_CONFIG } from '@/config/scraping'

class RedisConnection {
  private static instance: Redis | null = null
  private static connecting = false

  static async getInstance(): Promise<Redis | null> {
    // Skip Redis in production build environment if not available
    if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
      console.log('Redis not configured for production build, skipping connection')
      return null
    }

    if (this.instance && this.instance.status === 'ready') {
      return this.instance
    }

    if (this.connecting) {
      // Wait for connection to complete
      while (this.connecting) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (this.instance) return this.instance
    }

    this.connecting = true

    try {
      const config: RedisOptions = {
        host: SCRAPING_CONFIG.queue.redis.host,
        port: SCRAPING_CONFIG.queue.redis.port,
        password: SCRAPING_CONFIG.queue.redis.password,
        db: SCRAPING_CONFIG.queue.redis.db,
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        connectTimeout: 5000,
        lazyConnect: true,
      }

      this.instance = new Redis(config)

      // Handle connection events
      this.instance.on('connect', () => {
        console.log('Redis connected')
      })

      this.instance.on('ready', () => {
        console.log('Redis ready')
        this.connecting = false
      })

      this.instance.on('error', (error) => {
        console.warn('Redis connection error (will continue without Redis):', error.message)
        this.connecting = false
      })

      this.instance.on('close', () => {
        console.log('Redis connection closed')
      })

      this.instance.on('reconnecting', () => {
        console.log('Redis reconnecting...')
      })

      // Connect explicitly with timeout
      await Promise.race([
        this.instance.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        )
      ])

      return this.instance
    } catch (error) {
      this.connecting = false
      console.warn('Redis connection failed, continuing without Redis:', error)
      this.instance = null
      return null
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit()
      this.instance = null
    }
  }

  static isConnected(): boolean {
    return this.instance?.status === 'ready'
  }
}

export default RedisConnection

// Export a singleton instance for use across the app
export const getRedis = async (): Promise<Redis | null> => {
  try {
    return await RedisConnection.getInstance()
  } catch (error) {
    console.warn('Redis unavailable:', error)
    return null
  }
}
export const disconnectRedis = () => RedisConnection.disconnect()
export const isRedisConnected = () => RedisConnection.isConnected()