# Fixes Applied

## Changes Made

### 1. Fixed RLS Infinite Recursion (`/api/calendars`)

- **File**: `src/app/api/calendars/route.ts`
- **Change**: Removed `!inner` join from query that caused infinite recursion with RLS policies
- **Before**: `.select('*, calendar_members!inner(user_id, role)')`
- **After**: `.select('*, calendar_members(user_id, role)')`

### 2. Fixed Missing Await Params (DELETE)

- **File**: `src/app/api/calendars/[id]/route.ts`
- **Change**: Added `const { id } = await params;` before using `id` in DELETE handler

### 3. Fixed Missing Await Params (POST events)

- **File**: `src/app/api/calendars/[id]/events/route.ts`
- **Change**: Added `const { id } = await params;` before using `id` in POST handler

### 4. Fixed PATCH Handler

- **File**: `src/app/api/calendars/[id]/route.ts`
- **Change**: Added `const { id } = await params;` before using `id` in PATCH handler, and fixed Zod error message

### 5. Fixed Search API RLS Issue

- **File**: `src/app/api/search/events/route.ts`
- **Change**: Removed `!inner` join from calendars query

### 6. Enhanced Dev-Bypass Mode

- **File**: `src/app/api/calendars/route.ts`
- **Change**: `ensurePersonalCalendar` now:
  - Creates a dev user profile in `profiles` table
  - Creates personal calendar
  - Adds user as owner member in `calendar_members`

## How to Test

### Prerequisites

1. Set `dev-bypass=true` cookie in browser dev tools
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`

### Test Flows

1. **Calendars List** (`/calendars`)
   - Should show "Personal" calendar auto-created
   - Should show "Shared" calendars (if any)

2. **Calendar Month View** (`/calendars/[id]`)
   - Should display month grid with events

3. **Agenda View** (`/calendars/[id]/agenda`)
   - Events grouped by day using calendar timezone (Asia/Macau)
   - Timezone-safe grouping implemented

4. **Search** (`/search?q=...`)
   - Search events across all calendars
   - Works with dev-bypass mode

### Verification

```bash
npm run build  # Should pass without errors
```
