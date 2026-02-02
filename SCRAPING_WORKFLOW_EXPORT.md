# Weekend Planner App - Scraping Workflow Export

**Export Date:** 2025-09-17
**Version:** v0.1.0
**Purpose:** Export for testing with another coding agent

## System Overview

The Weekend Planner App features a sophisticated multi-layered event scraping system that aggregates events from various sources across Macau, Hong Kong, and other regions. The system combines RSS feeds, web scraping, and API integrations with advanced features like Universal Scraping, rate limiting, and robust error handling.

## Architecture Components

### 1. Universal Scraper System (Latest)
**Location:** `src/lib/scrapers/universal/`

The Universal Scraper is the newest and most advanced component, designed to intelligently extract events from any website using multiple strategies:

- **Main Entry Point:** `universal-scraper.ts`
- **Strategy Engine:** `strategy-engine.ts` - Orchestrates extraction strategies
- **Structured Detector:** `structured-detector.ts` - Detects JSON-LD, RSS, APIs
- **Page Classifier:** `page-classifier.ts` - Identifies page types
- **Data Normalizers:** `normalizers.ts` - Standardizes extracted data
- **HTTP Cache:** `http-cache.ts` - Caching with ETag support
- **Configuration Store:** `config-store.ts` - Strategy learning and persistence

### 2. Individual Macau Scrapers (Legacy)
**Location:** `src/lib/scrapers/macau/`

Specialized scrapers for specific Macau venues:

- **Broadway Macau:** `broadway.ts` - React SPA with browser automation
- **Galaxy Macau:** `galaxy.ts` - Casino entertainment events
- **MGTO Government:** `mgto.ts` - Official tourism events
- **MICE Portal:** `mice.ts` - Business and conference events
- **Sands/Venetian:** `sands.ts` - Multi-property entertainment

### 3. Base Infrastructure
**Location:** `src/lib/scrapers/`

- **Base Scraper:** `base-scraper.ts` - Core functionality with rate limiting
- **Macau Coordinator:** `macau-coordinator.ts` - Orchestrates individual scrapers
- **Event Ingestion:** `src/lib/event-ingestion.ts` - Main ingestion orchestrator

## Source Websites & Configurations

### Active Scraping Sources

| Source ID | Name | URL | Type | Rate Limit | Notes |
|-----------|------|-----|------|------------|-------|
| `mgto` | MGTO City Events | https://www.macaotourism.gov.mo/en/events/calendar | web_scraper | 0.5 req/sec | Government tourism events |
| `londoner` | The Londoner Macao Events | https://www.londonermacao.com/macau-events-shows | web_scraper | 1 req/sec | Resort entertainment |
| `venetian` | The Venetian Macao Entertainment | https://www.venetianmacao.com/entertainment.html | web_scraper | 1 req/sec | Casino shows & events |
| `galaxy` | Galaxy Macau Events | https://www.galaxymacau.com/ticketing/event-list/ | web_scraper | 1 req/sec | Integrated resort events |
| `mice` | Macao MICE Portal | https://www.mice.gov.mo/en/events.aspx | web_scraper | 0.5 req/sec | Business & conference events |
| `broadway` | Broadway Macau Events | https://www.broadwaymacau.com.mo/upcoming-events-and-concerts/ | web_scraper | 1 req/sec | Theater & entertainment |

### Universal Scraper Configuration

**Feature Flags:**
```javascript
const UNIVERSAL_SCRAPER_CONFIG = {
  enabled: process.env.USE_UNIVERSAL_SCRAPER === 'true',
  sources: ['mgto', 'broadway'], // Configurable source list
  fallbackToIndividual: true // Use individual scrapers if universal fails
}
```

## Technical Implementation

### 1. Rate Limiting & Request Management

**Rate Limit Configuration:**
```typescript
interface RateLimitConfig {
  requestsPerSecond: number  // 0.5-1 req/sec for most sources
  maxRetries: number         // 3 retries with exponential backoff
  retryDelayMs: number       // Base delay: 1000-2000ms
}
```

**Request Blocking for Performance:**
- Analytics & tracking scripts
- Fonts and non-essential resources
- Images (except event photos)
- Videos and media files
- Social media tracking

### 2. Browser Automation (Playwright)

**Enhanced Anti-Bot Protection:**
- Stealth context with realistic user agents
- Navigator property masking
- Mouse movement simulation
- Randomized timing delays
- Request interception and blocking

**Browser Triggers:**
- React SPAs (Broadway Macau)
- JavaScript-heavy sites
- Anti-bot protection detection
- Fallback when HTTP requests fail

### 3. Data Extraction Strategies

**Multi-Strategy Extraction:**
1. **Structured Data:** JSON-LD, OpenGraph, Twitter Cards
2. **Semantic HTML:** Event microdata, schema.org
3. **CSS Selectors:** Event-specific classes and IDs
4. **Pattern Recognition:** Date/time/venue patterns in text
5. **Fallback Extraction:** Generic content selectors

**Image Extraction (Multi-Photo Support):**
- OpenGraph images (highest priority)
- Hero/banner images
- Event posters and promotional materials
- WEBP format support (Broadway specific)
- Validates against placeholders/logos

### 4. Event Classification & Validation

**Event Types:**
- `event` - Time-bound activities (concerts, shows)
- `attraction` - Permanent installations (TeamLab, museums)
- `invalid` - Navigation menus, irrelevant content

**Validation Rules:**
- Date validation: 60 days past to 2 years future
- Title validation: Excludes navigation elements
- Content filtering: Removes duplicate and spam entries

## Testing & Validation Commands

### Core Testing Commands
```bash
# Test universal scraper against all sources
npm run test:universal-scraper

# Compare universal vs individual scrapers
npm run test:universal-vs-individual

# Test individual Macau scrapers
npm run scrape:macau

# Run scraper unit tests
npm run test:scrapers
```

### Manual Testing URLs
```bash
# Test individual scrapers
node scripts/test-individual-scraper.js --source=broadway
node scripts/test-individual-scraper.js --source=galaxy

# Test universal scraper
node scripts/test-universal-scraper.js --url=https://www.broadwaymacau.com.mo/upcoming-events-and-concerts/
```

### Development & Debugging
```bash
# Development server with scraper testing
npm run dev

# Type checking
npm run type-check

# Lint code
npm run lint

# Run all tests
npm run test
```

## Environment Configuration

### Required Environment Variables
```env
# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External APIs
NEWS_API_KEY=your-newsapi-key

# Security
CRON_SECRET=your-secure-random-string

# Universal Scraper Feature Flags
USE_UNIVERSAL_SCRAPER=true
UNIVERSAL_SCRAPER_SOURCES=mgto,broadway
UNIVERSAL_FALLBACK_ENABLED=true
```

## Event Data Schema

### Raw Event Structure
```typescript
interface RawEvent {
  source: string           // Source identifier (mgto, broadway, etc.)
  source_id: string        // Unique ID for deduplication
  title: string            // Event title
  description?: string     // Event description
  start: string           // ISO date string (UTC)
  end?: string            // ISO date string (UTC)
  venue?: string          // Venue name
  city: string            // City (typically "Macau")
  url?: string            // Event detail URL
  ticket_url?: string     // Ticket purchase URL
  image_url?: string      // Primary event image
  image_urls?: string[]   // Multiple event images (NEW)
  price_min?: number      // Minimum ticket price
  categories: string[]    // Event categories
}
```

### Database Schema
```sql
-- Events table structure
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start TIMESTAMPTZ NOT NULL,
  "end" TIMESTAMPTZ,
  venue TEXT,
  city TEXT,
  url TEXT,
  ticket_url TEXT,
  image_url TEXT,
  image_urls TEXT[], -- Multiple images support
  price_min DECIMAL,
  categories TEXT[],
  event_type TEXT DEFAULT 'event', -- event | attraction | invalid
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);
```

## Advanced Features

### 1. Hybrid HTTP/Browser Requests
```typescript
async makeHybridRequest(config: {
  url: string
  fallbackToBrowser?: boolean
  waitForSelector?: string
  minExpectedElements?: number
}): Promise<{ content: string, usedBrowser: boolean }>
```

### 2. Event Link Harvesting
```typescript
async harvestEventLinks(
  seedUrls: string[],
  baseUrl: string,
  eventKeywords: string[],
  maxDepth: number = 2,
  maxLinksPerPage: number = 50
): Promise<string[]>
```

### 3. Multi-Photo Extraction
```typescript
extractImageUrls(
  $: CheerioAPI,
  $element: Cheerio<AnyNode>,
  baseUrl: string,
  maxImages = 3
): string[]
```

### 4. Advanced Date Parsing
```typescript
parseEventDate(
  dateText: string,
  timeText?: string,
  timezoneHint?: string
): { startTime: string | null, endTime: string | null, timezone: string }
```

## Maintenance & Monitoring

### Data Quality Management
```bash
# Clean old events (older than 60 days)
npm run cleanup:old-events

# Remove invalid/navigation events
npm run cleanup:invalid-events

# Check system health
curl http://localhost:3000/api/health
```

### Performance Monitoring
- Request rate limiting per source
- Browser automation usage tracking
- Error rate monitoring per scraper
- Cache hit/miss ratios
- Event extraction success rates

### Error Handling
- Comprehensive error classification
- Automatic retries with exponential backoff
- Graceful degradation (HTTP → Browser → Skip)
- Detailed logging for debugging
- Circuit breaker patterns for failing sources

## Integration Testing Workflow

### For Another Coding Agent

1. **Environment Setup:**
   ```bash
   npm install
   cp .env.example .env.local
   # Configure environment variables
   ```

2. **Test Individual Components:**
   ```bash
   # Test base scraper functionality
   npm run test:scrapers

   # Test specific source
   npm run scrape:macau -- --source=broadway
   ```

3. **Test Universal Scraper:**
   ```bash
   # Test universal scraper capabilities
   npm run test:universal-scraper

   # Compare with individual scrapers
   npm run test:universal-vs-individual
   ```

4. **Validate Data Quality:**
   ```bash
   # Check event classification
   npm run cleanup:invalid-events:dry-run

   # Verify date validation
   npm run cleanup:old-events:dry-run
   ```

5. **Performance Testing:**
   ```bash
   # Monitor rate limiting
   time npm run scrape:macau

   # Check browser automation
   DEBUG=broadway npm run test:universal-scraper
   ```

## Key Testing Scenarios

### 1. Broadway Macau (React SPA)
- **Challenge:** JavaScript-rendered content
- **Solution:** Browser automation with stealth detection
- **Test:** Verify event extraction from dynamic content

### 2. MGTO Government Site
- **Challenge:** Government site rate limiting
- **Solution:** Conservative 0.5 req/sec limit
- **Test:** Ensure respectful scraping practices

### 3. Multi-Image Extraction
- **Challenge:** Extract multiple event photos
- **Solution:** Enhanced image extraction with WEBP support
- **Test:** Verify 3 high-quality images per event

### 4. Date Parsing Robustness
- **Challenge:** Various date formats across sources
- **Solution:** Multi-strategy parsing with timezone awareness
- **Test:** Validate date extraction accuracy

### 5. Event Classification
- **Challenge:** Filter navigation menus and invalid content
- **Solution:** Pattern-based classification system
- **Test:** Ensure clean event data quality

## Future Enhancements

1. **AI-Powered Content Classification**
2. **Dynamic Rate Limit Adjustment**
3. **Real-time Event Updates**
4. **Multi-Language Support**
5. **Enhanced Image Recognition**
6. **Predictive Scraping Scheduling**

---

**Documentation Version:** 1.0
**Last Updated:** 2025-09-17
**Maintainer:** Weekend Planner App Team
**Testing Status:** Ready for external agent validation