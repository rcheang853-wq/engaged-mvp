// Scraping pipeline types
export interface ScrapingConfig {
  selectors: {
    title: string
    description?: string | undefined
    startTime?: string | undefined
    endTime?: string | undefined
    location?: string | undefined
    price?: string | undefined
    image?: string | undefined
    link?: string | undefined
  }
  waitFor?: {
    selector?: string
    timeout?: number
    networkIdle?: boolean
  }
  pagination?: {
    enabled: boolean
    nextButtonSelector?: string
    maxPages?: number
  }
  cookies?: Array<{
    name: string
    value: string
    domain?: string
    path?: string
  }>
  userAgent?: string
  viewport?: {
    width: number
    height: number
  }
  delay?: number
  retries?: number
}

export interface EventSource {
  id: string
  name: string
  baseUrl: string
  sourceType: 'website' | 'api' | 'manual'
  scrapeConfig: ScrapingConfig
  lastScrapedAt?: Date | undefined
  nextScrapeAt?: Date | undefined
  scrapeFrequencyHours: number
  isActive: boolean
  errorCount: number
  lastError?: string | undefined
  createdAt: Date
  updatedAt: Date
}

export interface ScrapeJobData {
  sourceId: string
  sourceName: string
  baseUrl: string
  config: ScrapingConfig
  priority?: number
  retryCount?: number
  metadata?: Record<string, any>
}

export interface ScrapeJobResult {
  jobId: string
  sourceId: string
  status: 'running' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  eventsFound: number
  eventsCreated: number
  eventsUpdated: number
  eventsSkipped: number
  errorMessage?: string
  retryCount: number
  jobMetadata: Record<string, any>
}

export interface RawEventData {
  title: string
  description?: string | undefined
  startTime?: string | undefined
  endTime?: string | undefined
  location?: string | undefined
  price?: string | undefined
  imageUrl?: string | undefined
  sourceUrl?: string | undefined
  extractedAt: Date
  sourceId: string
  scrapeHash: string
}

export interface EventDeduplicationMatch {
  eventId: string
  similarity: number
  matchType: 'title' | 'location' | 'time' | 'combined'
  confidence: number
}

export interface DeduplicationConfig {
  titleSimilarityThreshold: number
  locationSimilarityThreshold: number
  timeToleranceMinutes: number
  combinedSimilarityThreshold: number
  enableFuzzyMatching: boolean
}

export interface ScrapingMetrics {
  totalSources: number
  activeSources: number
  totalJobsToday: number
  successfulJobsToday: number
  failedJobsToday: number
  eventsScrapedToday: number
  eventsCreatedToday: number
  averageJobDuration: number
  errorRate: number
  lastSuccessfulScrape?: Date
}

export interface QueueConfig {
  redis: {
    host: string
    port: number
    password?: string
    db?: number
  }
  defaultJobOptions: {
    removeOnComplete: number
    removeOnFail: number
    attempts: number
    backoff: {
      type: 'exponential' | 'fixed'
      delay: number
    }
  }
  concurrency: number
}