# New Event Sources Added

## Overview
Added 6 new Macau event sources to the scraping pipeline with appropriate rate limiting and configuration.

## Sources Added

| Source ID | Name | URL | Rate Limit | Frequency |
|-----------|------|-----|------------|-----------|
| `mgto` | MGTO City Events | https://www.macaotourism.gov.mo/en/events/calendar | 0.5 req/sec | 12 hours |
| `londoner` | The Londoner Macao Events | https://www.londonermacao.com/macau-events-shows | 1 req/sec | 6 hours |
| `venetian` | The Venetian Macao Entertainment | https://www.venetianmacao.com/entertainment.html | 1 req/sec | 6 hours |
| `galaxy` | Galaxy Macau Events | https://www.galaxymacau.com/ticketing/event-list/ | 1 req/sec | 6 hours |
| `mice` | Macao MICE Portal | https://www.mice.gov.mo/en/events.aspx | 0.5 req/sec | 12 hours |
| `broadway` | Broadway Macau Events | https://www.broadwaymacau.com.mo/upcoming-events-and-concerts/ | 1 req/sec | 6 hours |

## Configuration Details

### Selector Strategy
Each source uses multiple fallback selectors to handle different HTML structures:
- **Title**: `.event-title, .show-title, h2, h3` (adaptive)
- **Description**: `.event-description, .show-description, .description`
- **Start Time**: `.event-date, .show-date, .date`
- **Location**: `.event-venue, .venue, .location`
- **Image**: `.event-image img, .show-image img, img`
- **Link**: `a[href*='event'], a[href*='show']`

### Rate Limiting
- **0.5 req/sec**: 2000ms delay (MGTO, MICE)
- **1 req/sec**: 1000ms delay (Londoner, Venetian, Galaxy, Broadway)

### Error Handling
- 3 retries per source
- Network idle waiting for dynamic content
- 8-10 second timeouts
- Graceful fallback selectors

## Next Steps

### 1. Selector Refinement
The current selectors are generic fallbacks. For optimal results, inspect each website and update selectors:

```bash
# Example API call to test a source
curl -X POST http://localhost:3002/api/admin/scraping/sources/mgto/test
```

### 2. Monitoring Setup
Monitor scraping success rates:
- Check error counts in database
- Review scraped event quality
- Adjust selectors based on actual HTML structure

### 3. Testing Commands
```bash
# Test individual source
npm run scrape:test mgto

# View scraping status
curl http://localhost:3002/api/admin/scraping/status

# View all sources
curl http://localhost:3002/api/admin/scraping/sources
```

## File Changes
- **Modified**: `src/config/sources.json` - Added 6 new sources with rate limiting
- **Created**: `claudedocs/new-sources-added.md` - This documentation

## Integration Notes
- Sources automatically sync to database on next scraper initialization
- Rate limiting enforced by delay configuration
- All sources start as active by default
- Frequency follows your specified schedule (6-12 hours)

## Recommended Testing Order
1. **MGTO** - Government site, likely most stable
2. **Galaxy** - Modern resort site, good for testing
3. **Londoner** - Test selector flexibility
4. **Venetian** - Large entertainment venue
5. **Broadway** - Concert/theater events
6. **MICE** - Business events portal