import type { QueueConfig, DeduplicationConfig } from '@/types/scraping'

export const SCRAPING_CONFIG = {
  queue: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    defaultJobOptions: {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
    },
    concurrency: parseInt(process.env.SCRAPING_CONCURRENCY || '3'),
  } satisfies QueueConfig,

  deduplication: {
    titleSimilarityThreshold: 0.85,
    locationSimilarityThreshold: 0.9,
    timeToleranceMinutes: 30,
    combinedSimilarityThreshold: 0.8,
    enableFuzzyMatching: true,
  } satisfies DeduplicationConfig,

  scraping: {
    defaultTimeout: 30000,
    defaultDelay: 2000,
    maxRetries: 3,
    maxConcurrentScrapes: 3,
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
    respectRobotsTxt: true,
    enableCookies: true,
    enableImages: false, // Disable images for performance
    enableJavaScript: true,
  },

  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: true,
    metricsRetentionDays: 30,
    alertThresholds: {
      errorRate: 0.2, // 20% error rate threshold
      avgDuration: 60000, // 60 seconds average duration threshold
      failedJobsPerHour: 10,
    },
  },

  scheduling: {
    enableScheduler: true,
    scheduleInterval: '*/15 * * * *', // Every 15 minutes
    maxQueueSize: 1000,
    priorityLevels: {
      high: 10,
      normal: 5,
      low: 1,
    },
  },

  rateLimiting: {
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    delayBetweenRequests: 2000,
    respectServerLoad: true,
  },
} as const

export const FIRECRAWL_CONFIG = {
  apiKey: process.env.FIRECRAWL_API_KEY,
  baseUrl: process.env.FIRECRAWL_BASE_URL || 'https://api.firecrawl.dev',
  defaultOptions: {
    formats: ['markdown', 'html'],
    includeTags: ['title', 'meta', 'article', 'section', 'div'],
    excludeTags: ['script', 'style', 'nav', 'footer', 'aside'],
    onlyMainContent: true,
    waitFor: 3000,
  },
  rateLimits: {
    requestsPerMinute: 100,
    requestsPerHour: 2000,
  },
} as const

export const DATABASE_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  maxConnections: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production',
} as const