# Testing Phase 1A - Quick Guide

## Start the Dev Server

```bash
npm run dev
```

The server should start on `http://localhost:3000`

## Test Scenarios

### 1. Calendar Switcher on Month View
1. Navigate to any calendar month view: `/calendars/[id]`
2. Look for the calendar name in the header (should be clickable with dropdown arrow)
3. Click to open the dropdown
4. **Expected**: See calendars grouped as:
   - **Personal** section (calendars with type='personal')
   - **Shared** section (calendars with type='shared')
   - Current calendar should have a blue dot indicator
   - Shared calendars show member count
5. Click a different calendar
6. **Expected**: Navigate to that calendar's month view

### 2. Switch to Agenda View
1. From month view header, click the **List icon** (📋)
2. **Expected**: Navigate to `/calendars/[id]/agenda`
3. **Verify**:
   - Events are grouped by day
   - Today's date has a "Today" badge
   - Events show time (or "All day")
   - Events show location (if present)
   - Creator avatar/initial shown on right
   - Events are ordered chronologically within each day

### 3. Calendar Switcher on Agenda View
1. From agenda view, click the calendar name dropdown
2. Switch to a different calendar
3. **Expected**: Navigate to `/calendars/[OTHER_ID]/agenda` (stays in agenda mode)

### 4. Switch Back to Month View
1. From agenda view header, click the **Calendar icon** (📅)
2. **Expected**: Navigate to `/calendars/[id]` (month view)

### 5. Empty State
1. Create a new calendar with no events
2. Navigate to its agenda view
3. **Expected**: See empty state with message "No upcoming events" and "Add Event" button

## Visual Verification

### Calendar Switcher
- Dropdown opens smoothly with backdrop overlay
- Calendar color dots match the calendar's color
- Personal calendars show "Just you" text
- Shared calendars show member count
- Current calendar has blue dot indicator
- Hover states work on all buttons

### Agenda View
- Clean card layout with left border matching event color
- Day headers are bold and clear
- "Today" badge is blue and prominent
- Event cards have shadow and hover effect
- Time format is readable (e.g., "2:30 PM - 4:00 PM")
- All-day events show "All day" instead of time

### Header Consistency
- Both views have identical header layout
- Calendar switcher in same position
- Icons are clear and intuitive
- "Add event" button (blue circle with +) in same position

## Edge Cases to Test

1. **No calendars**: User has no calendar memberships (should auto-create personal calendar via ensurePersonalCalendar)
2. **Single calendar**: Switcher still works but only shows one option
3. **Many calendars**: Dropdown should scroll if needed (max-h-96)
4. **Long calendar names**: Should truncate properly in switcher
5. **Events without end_at**: Should show start time only
6. **Events without location**: Location should not appear in agenda view
7. **Future date range**: Agenda shows next 90 days of events

## Known Issues (Not Bugs)

1. **Timezone**: Currently uses local browser time, not calendar-specific timezone
2. **API routes**: Pre-existing TypeScript errors in .next/types/validator.ts (Next.js 15 async params migration) - these don't affect functionality
3. **90-day limit**: Agenda view only shows next 90 days (hardcoded in the component)

## Files to Inspect

If issues arise, check these files:
- `src/components/calendar/CalendarSwitcher.tsx` - Calendar dropdown logic
- `src/app/calendars/[id]/page.tsx` - Month view with switcher integration
- `src/app/calendars/[id]/agenda/page.tsx` - Agenda view implementation
- API: `/api/calendars` (list), `/api/calendars/[id]` (details), `/api/calendars/[id]/events` (events list)

## Success Criteria

✅ Calendar switcher appears on both month and agenda views
✅ Switching calendars preserves the current view mode (month or agenda)
✅ Agenda view groups events by day with proper date formatting
✅ View toggle buttons (List/Calendar icons) work in both directions
✅ No console errors or build failures
✅ Dev server starts and runs without crashes
