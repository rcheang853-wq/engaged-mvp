# Search Implementation (Phase 1B - Item 3)

## Overview
Implemented cross-calendar event search functionality that allows users to search across all calendars they belong to.

## Changes Made

### 1. API Endpoint
**File:** `src/app/api/search/events/route.ts`
- `GET /api/search/events?q=<query>&calendar_id=<optional>`
- Searches events by title, description, and location (case-insensitive)
- Enforces membership: only returns events from calendars where the user is a member
- Optional `calendar_id` parameter to filter results to a specific calendar
- Returns events with calendar name and details

**Security:**
- Uses `getAuthUser()` to authenticate requests
- Queries `calendar_members` table to get user's accessible calendars
- Applies RLS policies via Supabase (existing policies already enforce membership)

### 2. Search Page UI
**File:** `src/app/search/page.tsx`
- Clean, mobile-friendly search interface at `/search`
- Search input with auto-focus and clear button
- Real-time search results display
- Each result shows:
  - Calendar name with color badge
  - Event title
  - Date/time (formatted for all-day and timed events)
  - Location (if present)
  - Description preview
- Click on result navigates to event detail page
- Empty states for no results and initial state
- Loading states with skeleton loaders

### 3. Database Types
**File:** `src/types/database.ts`
- Added missing TypeScript types for:
  - `calendars` table
  - `calendar_members` table
  - `calendar_events` table
  - `event_comments` table
- Ensures type safety for search API queries

### 4. UI Integration
**Files:**
- `src/app/calendars/page.tsx` - Added search icon button to header
- `src/app/calendars/[id]/page.tsx` - Added search icon button to calendar detail header

## How to Test

### Prerequisites
1. Development server running on port 3001 (or 3000)
2. User logged in with dev-auth or real auth
3. At least one calendar with some events created

### Test Steps

#### 1. Basic Search
1. Navigate to http://localhost:3001/calendars
2. Click the search icon (magnifying glass) in the header
3. Type a search query (e.g., "meeting")
4. Press Enter or wait for auto-search
5. Verify results show events matching the query
6. Verify each result shows calendar name, date/time, location

#### 2. Search from Different Entry Points
- From calendars list: `/calendars` → click search icon
- From calendar detail: `/calendars/:id` → click search icon
- Direct URL: `/search?q=meeting`

#### 3. Membership Enforcement Test
To verify membership enforcement:
1. Create two test users (User A and User B)
2. User A: Create Calendar A with Event "User A Meeting"
3. User B: Create Calendar B with Event "User B Meeting"
4. User A: Search for "meeting"
   - Should see ONLY "User A Meeting"
   - Should NOT see "User B Meeting"
5. User B: Search for "meeting"
   - Should see ONLY "User B Meeting"
   - Should NOT see "User A Meeting"

#### 4. Multi-field Search
Search should match across:
- **Title**: Create event "Team Standup"
- **Description**: Create event with description "Discuss project timeline"
- **Location**: Create event at "Conference Room B"

Search for:
- "standup" → should find event by title
- "project" → should find event by description
- "conference" → should find event by location

#### 5. Edge Cases
- Empty search: Should show prompt to enter search
- No results: Should show "No events found" message
- Very long event titles/descriptions: Should truncate with line-clamp
- All-day events: Should format date without time
- Multi-calendar results: Should show different calendar badges

#### 6. Navigation
- Click on any search result
- Should navigate to `/calendars/:calendar_id/events/:event_id`
- Should show event detail page

### API Testing (Optional)

Use curl or browser to test API directly:

```bash
# Basic search
curl http://localhost:3001/api/search/events?q=meeting

# Search within specific calendar
curl http://localhost:3001/api/search/events?q=meeting&calendar_id=<uuid>

# Empty query (should return 400)
curl http://localhost:3001/api/search/events?q=

# Unauthorized (should return 401)
curl http://localhost:3001/api/search/events?q=test
# (without valid session cookie)
```

### Expected API Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "calendar_id": "uuid",
      "title": "Team Meeting",
      "description": "Weekly sync",
      "location": "Room 101",
      "start_at": "2026-03-01T10:00:00Z",
      "end_at": "2026-03-01T11:00:00Z",
      "all_day": false,
      "color": "#3B82F6",
      "calendars": {
        "id": "uuid",
        "name": "Work Calendar",
        "color": "#3B82F6"
      }
    }
  ],
  "query": "meeting",
  "count": 1
}
```

## Security Notes

1. **Membership Enforcement**: The API queries `calendar_members` first to get accessible calendar IDs, then filters events to only those calendars.

2. **RLS Policies**: Supabase RLS policies on `calendar_events` table already enforce that users can only see events from calendars they're members of, providing a second layer of security.

3. **SQL Injection Protection**: Using Supabase's parameterized queries via `.ilike()` prevents SQL injection.

4. **Authentication**: All requests require valid auth via `getAuthUser()`.

## Performance Considerations

- Search uses `ilike` for case-insensitive matching (uses PostgreSQL indexes)
- Results ordered by `start_at` (ascending)
- No pagination implemented yet (suitable for typical calendar event counts)
- Future: Consider adding pagination for calendars with 100+ events

## Future Enhancements (Not Implemented)

- Date range filters
- Calendar-specific search from calendar detail view
- Search history/suggestions
- Full-text search with PostgreSQL FTS
- Search result pagination
- Advanced filters (date, location, calendar)
