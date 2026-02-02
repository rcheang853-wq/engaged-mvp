import { SourceManager } from '@/services/scraping/source-manager'
import type { EventSource } from '@/types/scraping'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: jest.fn(() => ({ error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null }))
      }))
    }))
  }))
}))

// Mock the sources config
jest.mock('@/config/sources.json', () => ({
  sources: [
    {
      id: 'test-source-1',
      name: 'Test Source 1',
      baseUrl: 'https://test1.com',
      sourceType: 'website',
      scrapeConfig: {
        selectors: {
          title: '.title'
        }
      },
      scrapeFrequencyHours: 24,
      isActive: true,
      errorCount: 0
    }
  ]
}))

describe('SourceManager', () => {
  let sourceManager: SourceManager

  beforeEach(() => {
    sourceManager = new SourceManager()
  })

  describe('initialization', () => {
    it('should initialize without errors', async () => {
      await expect(sourceManager.initialize()).resolves.not.toThrow()
    })

    it('should load sources from database and config', async () => {
      await sourceManager.initialize()
      const sources = sourceManager.getAllSources()
      expect(sources).toBeDefined()
    })
  })

  describe('source management', () => {
    beforeEach(async () => {
      await sourceManager.initialize()
    })

    it('should create a new source', async () => {
      const sourceData = {
        name: 'New Test Source',
        baseUrl: 'https://newtest.com',
        sourceType: 'website' as const,
        scrapeConfig: {
          selectors: {
            title: '.event-title'
          }
        },
        scrapeFrequencyHours: 12,
        isActive: true
      }

      const source = await sourceManager.createSource(sourceData)

      expect(source).toBeDefined()
      expect(source.name).toBe(sourceData.name)
      expect(source.baseUrl).toBe(sourceData.baseUrl)
      expect(source.isActive).toBe(true)
      expect(source.errorCount).toBe(0)
      expect(source.id).toBeDefined()
      expect(source.nextScrapeAt).toBeDefined()
    })

    it('should update an existing source', async () => {
      // First create a source
      const source = await sourceManager.createSource({
        name: 'Test Source',
        baseUrl: 'https://test.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        scrapeFrequencyHours: 24,
        isActive: true
      })

      // Then update it
      const updatedSource = await sourceManager.updateSource(source.id, {
        name: 'Updated Test Source',
        scrapeFrequencyHours: 12
      })

      expect(updatedSource).toBeDefined()
      expect(updatedSource?.name).toBe('Updated Test Source')
      expect(updatedSource?.scrapeFrequencyHours).toBe(12)
      expect(updatedSource?.updatedAt.getTime()).toBeGreaterThan(source.createdAt.getTime())
    })

    it('should deactivate a source', async () => {
      const source = await sourceManager.createSource({
        name: 'Test Source',
        baseUrl: 'https://test.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: true
      })

      const success = await sourceManager.deactivateSource(source.id)
      expect(success).toBe(true)

      const deactivatedSource = sourceManager.getActiveSource(source.id)
      expect(deactivatedSource).toBeNull()
    })

    it('should activate a source', async () => {
      const source = await sourceManager.createSource({
        name: 'Test Source',
        baseUrl: 'https://test.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: false
      })

      const success = await sourceManager.activateSource(source.id)
      expect(success).toBe(true)

      const activatedSource = sourceManager.getActiveSource(source.id)
      expect(activatedSource).toBeDefined()
      expect(activatedSource?.isActive).toBe(true)
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await sourceManager.initialize()
    })

    it('should increment error count', async () => {
      const source = await sourceManager.createSource({
        name: 'Test Source',
        baseUrl: 'https://test.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: true
      })

      await sourceManager.incrementErrorCount(source.id, 'Test error message')

      const updatedSource = sourceManager.getActiveSource(source.id)
      expect(updatedSource?.errorCount).toBe(1)
      expect(updatedSource?.lastError).toBe('Test error message')
    })

    it('should deactivate source after too many errors', async () => {
      const source = await sourceManager.createSource({
        name: 'Test Source',
        baseUrl: 'https://test.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: true,
        errorCount: 9 // Just below the threshold
      })

      // This should push it over the threshold and deactivate
      await sourceManager.incrementErrorCount(source.id, 'Final error')

      const deactivatedSource = sourceManager.getActiveSource(source.id)
      expect(deactivatedSource).toBeNull() // Should be inactive now
    })

    it('should reset error count', async () => {
      const source = await sourceManager.createSource({
        name: 'Test Source',
        baseUrl: 'https://test.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        errorCount: 5
      })

      await sourceManager.resetErrorCount(source.id)

      const resetSource = sourceManager.getActiveSource(source.id)
      expect(resetSource?.errorCount).toBe(0)
      expect(resetSource?.lastError).toBeUndefined()
    })
  })

  describe('scheduling', () => {
    beforeEach(async () => {
      await sourceManager.initialize()
    })

    it('should update last scraped time and schedule next scrape', async () => {
      const source = await sourceManager.createSource({
        name: 'Test Source',
        baseUrl: 'https://test.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        scrapeFrequencyHours: 6
      })

      const beforeUpdate = new Date()
      await sourceManager.updateLastScraped(source.id)

      const updatedSource = sourceManager.getActiveSource(source.id)
      expect(updatedSource?.lastScrapedAt).toBeDefined()
      expect(updatedSource?.lastScrapedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
      expect(updatedSource?.nextScrapeAt).toBeDefined()

      // Next scrape should be 6 hours later
      const expectedNextScrape = new Date(updatedSource!.lastScrapedAt!.getTime() + 6 * 60 * 60 * 1000)
      expect(updatedSource?.nextScrapeAt?.getTime()).toBeCloseTo(expectedNextScrape.getTime(), -3) // Within 1 second
    })

    it('should identify sources due for scraping', async () => {
      // Create a source that's due for scraping
      const pastTime = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      const dueSource = await sourceManager.createSource({
        name: 'Due Source',
        baseUrl: 'https://due.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        nextScrapeAt: pastTime,
        isActive: true
      })

      // Create a source that's not due yet
      const futureTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      const notDueSource = await sourceManager.createSource({
        name: 'Not Due Source',
        baseUrl: 'https://notdue.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        nextScrapeAt: futureTime,
        isActive: true
      })

      const sourcesDue = sourceManager.getSourcesDueForScraping()
      const dueIds = sourcesDue.map(s => s.id)

      expect(dueIds).toContain(dueSource.id)
      expect(dueIds).not.toContain(notDueSource.id)
    })
  })

  describe('filtering and querying', () => {
    beforeEach(async () => {
      await sourceManager.initialize()

      // Create test sources
      await sourceManager.createSource({
        name: 'Website Source',
        baseUrl: 'https://website.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: true
      })

      await sourceManager.createSource({
        name: 'API Source',
        baseUrl: 'https://api.com',
        sourceType: 'api' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: true
      })

      await sourceManager.createSource({
        name: 'Inactive Source',
        baseUrl: 'https://inactive.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: false
      })
    })

    it('should get only active sources', () => {
      const activeSources = sourceManager.getActiveSources()
      expect(activeSources).toHaveLength(2)
      expect(activeSources.every(s => s.isActive)).toBe(true)
    })

    it('should filter sources by type', () => {
      const websiteSources = sourceManager.getSourcesByType('website')
      const apiSources = sourceManager.getSourcesByType('api')

      expect(websiteSources).toHaveLength(1)
      expect(websiteSources[0].sourceType).toBe('website')

      expect(apiSources).toHaveLength(1)
      expect(apiSources[0].sourceType).toBe('api')
    })

    it('should get all sources including inactive', () => {
      const allSources = sourceManager.getAllSources()
      expect(allSources).toHaveLength(3)
    })
  })

  describe('metrics', () => {
    beforeEach(async () => {
      await sourceManager.initialize()

      // Create test sources with different states
      await sourceManager.createSource({
        name: 'Active Source',
        baseUrl: 'https://active.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: true,
        errorCount: 0
      })

      await sourceManager.createSource({
        name: 'Error Source',
        baseUrl: 'https://error.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: true,
        errorCount: 3
      })

      await sourceManager.createSource({
        name: 'Inactive Source',
        baseUrl: 'https://inactive.com',
        sourceType: 'website' as const,
        scrapeConfig: { selectors: { title: '.title' } },
        isActive: false,
        errorCount: 0
      })
    })

    it('should provide accurate metrics', async () => {
      const metrics = await sourceManager.getMetrics()

      expect(metrics.totalSources).toBe(3)
      expect(metrics.activeSources).toBe(2)
      expect(metrics.errorSources).toBe(1)
      expect(metrics.sourcesDue).toBeGreaterThanOrEqual(0)
    })
  })
})