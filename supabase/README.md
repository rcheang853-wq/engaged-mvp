# Event Calendar App - Database Schema Documentation

## Overview

This database schema supports a local event discovery platform for Macau/Hong Kong/GBA with AI-powered matching, calendar integration, and Pro membership features. The schema is designed to scale to 50k events and 20k users.

## Architecture Decisions

### Core Design Principles

- **Security First**: Row Level Security (RLS) on all tables
- **Performance Optimized**: Strategic indexes for common queries
- **AI-Ready**: Structured data for machine learning and recommendation algorithms
- **Real-time Capable**: Designed for Supabase real-time subscriptions
- **Audit Trail**: Comprehensive analytics and usage tracking

### Technology Stack

- **Database**: PostgreSQL 15+ with Supabase extensions
- **Security**: RLS policies with JWT authentication
- **Real-time**: Supabase real-time subscriptions
- **Analytics**: Built-in event and user analytics
- **Caching**: Optimized for Redis integration

## Schema Overview

### Core Entity Tables

```
profiles          - User accounts with AI preferences
events           - Event catalog with rich metadata
event_categories - Event classification system
venues           - Location and venue information
organizers       - Event organizer accounts
```

### Interaction Tables

```
user_swipes      - AI matching swipe interactions
user_events      - User's saved events (calendar)
subscriptions    - Pro membership management
payments         - Payment history
user_usage       - Daily usage tracking
```

### Pipeline Tables

```
event_sources    - Scraping source configuration
scrape_jobs      - Scraping job history
event_analytics  - Event performance metrics
user_analytics   - User behavior metrics
```

## Table Descriptions

### profiles

User accounts with extended profile information and AI matching preferences.

**Key Features:**

- Integrated with Supabase Auth
- AI preference storage (categories, times, price ranges)
- Pro membership tracking
- Location-based preferences
- Notification settings

**Important Fields:**

- `ai_preferences`: JSONB for dynamic preference scoring
- `preferred_categories`: Array of preferred event categories
- `preferred_times`: Time slot preferences (morning, afternoon, evening, weekend)
- `preferred_price_range`: Price range in HKD
- `is_pro`: Pro membership status
- `pro_expires_at`: Pro membership expiration

### events

Core event catalog with comprehensive metadata for AI matching and user discovery.

**Key Features:**

- Rich event metadata (title, description, timing, location)
- AI scoring factors for personalized recommendations
- Pricing and ticketing information
- Status management (draft, pending, published, cancelled)
- Scraping source tracking

**Important Fields:**

- `ai_score_factors`: JSONB for AI recommendation engine
- `popularity_score`: Calculated from user interactions
- `quality_score`: Event quality rating
- `is_featured`/`is_trending`: Promotional flags
- `source_url`/`scrape_hash`: Deduplication support

### user_swipes

Tracks user swipe interactions for AI learning and recommendation improvement.

**Key Features:**

- Swipe types: like, pass, superlike
- Feedback collection after event attendance
- Unique constraint prevents duplicate swipes
- Analytics integration

### user_events

User's personal calendar with saved events and preferences.

**Key Features:**

- Multiple save types: saved, going, interested, maybe
- Calendar reminder settings
- Personal notes
- Social sharing options
- Conflict detection support

### subscriptions & payments

Pro membership management with Stripe integration.

**Key Features:**

- Stripe subscription tracking
- Billing period management
- Payment history
- Automatic pro status synchronization

## AI Matching System

### Preference Scoring Algorithm

The `calculate_event_score()` function implements a sophisticated scoring system:

```sql
Base Score: 50 points
+ Category Match: 25 points
+ Time Preference: 20 points
+ Price Range: 15 points
+ Location Match: 20 points
+ Popularity: up to 10 points
+ Quality: up to 10 points
+ Featured/Trending: 5 points each
```

### Recommendation Engine

- `get_user_recommendations()`: Returns personalized event list
- Excludes already-swiped events
- Ordered by AI score and event timing
- Supports pagination for mobile app performance

## Security (RLS Policies)

### User Data Protection

- Users can only access their own profiles, swipes, and saved events
- Public profiles are viewable by authenticated users
- Organizers can only manage their own events
- Analytics data is restricted to relevant parties

### System Access

- Service role has full access for system operations
- Scraping pipeline isolated from user data
- Payment data requires special permissions

### Key Security Features

- JWT token validation on all operations
- User isolation at database level
- Audit trails for sensitive operations
- Rate limiting through usage tracking

## Performance Optimizations

### Strategic Indexes

```sql
-- Event discovery
idx_events_city_date      - Location + time queries
idx_events_text_search    - Full-text search
idx_events_status         - Published event filtering

-- User interactions
idx_user_swipes_user_id   - User's swipe history
idx_user_events_user_id   - User's calendar events

-- Analytics
idx_event_analytics_event_date - Event performance tracking
idx_user_analytics_user_date   - User behavior analysis
```

### Query Optimization

- Views for common joins (`active_events_view`, `user_calendar_view`)
- Computed columns for frequently calculated values
- Partitioning strategy for analytics tables (future)

## Real-time Features

### Supabase Subscriptions

Tables optimized for real-time subscriptions:

- `events`: Live event updates
- `user_events`: Calendar synchronization
- `event_analytics`: Live popularity tracking

### Trigger-based Updates

- Automatic popularity score calculation
- Real-time analytics updates
- Pro membership synchronization

## Scaling Considerations

### Current Capacity

- **Events**: 50,000 events with efficient querying
- **Users**: 20,000 users with personalized recommendations
- **Analytics**: 90-day retention with cleanup automation

### Future Scaling

- Table partitioning for analytics data
- Read replicas for high-traffic queries
- Materialized views for complex aggregations
- Archive strategy for historical data

## Development Setup

### Local Development

1. Install Supabase CLI
2. Run `supabase start`
3. Apply migrations: `supabase db reset`
4. Seed data will be automatically loaded

### Migration Management

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db reset

# Generate types
supabase gen types typescript --local > types/database.types.ts
```

## API Integration

### Common Queries

**Get User Recommendations:**

```sql
SELECT * FROM public.get_user_recommendations('user-uuid', 20, 0);
```

**Record User Swipe:**

```sql
SELECT public.record_swipe_with_analytics('user-uuid', 'event-uuid', 'like');
```

**Check Event Conflicts:**

```sql
SELECT * FROM public.check_event_conflicts('user-uuid', '2024-01-01 19:00', '2024-01-01 22:00');
```

**Get Trending Events:**

```sql
SELECT * FROM public.get_trending_events(10);
```

### Error Handling

- All functions include proper error handling
- RLS policies provide security-first access control
- Graceful degradation for optional features

## Analytics & Insights

### Event Analytics

- Daily view counts and interaction rates
- Traffic source tracking
- Save/swipe conversion metrics
- Trending algorithm input data

### User Analytics

- Daily activity patterns
- Engagement metrics (session time, interaction rates)
- Pro feature usage tracking
- Retention analysis data

### Business Metrics

- Pro membership conversion tracking
- Event organizer performance
- Popular categories and venues
- Geographic usage patterns

## Maintenance

### Automated Cleanup

- `cleanup_old_analytics()`: Removes data older than 90 days
- Trending events updated daily
- Pro membership expiration checks
- Error monitoring for scraping jobs

### Manual Maintenance

- Index optimization reviews
- Query performance monitoring
- RLS policy audits
- Data backup verification

## Future Enhancements

### Planned Features

- Event recommendation ML model integration
- Advanced analytics dashboard
- Multi-region support
- Enhanced social features

### Schema Extensions

- Event series/recurring events
- User social connections
- Advanced venue management
- Integration APIs for external services
