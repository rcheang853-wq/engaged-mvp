# Personal Event Form V2 Migration Guide

## Overview
Replaced the personal event form with a new dark-themed UI matching the design mockup, adding:
- Location Type toggle (None | Plain Text | Google Maps)
- Visibility levels (Public | Private | Invite Only)
- Capacity toggle (Unlimited | Limited)
- Modern dark purple theme

## Database Changes

### New Columns Added
Run `supabase/migrations/add-location-type-visibility.sql` to add:

```sql
-- location_type: 'none' | 'text' | 'maps'
-- visibility: 'public' | 'private' | 'invite_only'
-- max_attendees: INTEGER (nullable)
```

### Migration Steps

1. **Backup your database** (recommended)
2. Run the migration SQL in Supabase SQL Editor:
   ```bash
   # Open Supabase dashboard -> SQL Editor
   # Paste contents of supabase/migrations/add-location-type-visibility.sql
   # Execute
   ```

3. **Verify migration**:
   ```sql
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'personal_events'
   AND column_name IN ('location_type', 'visibility', 'max_attendees');
   ```

Expected result:
| column_name    | data_type | column_default |
|----------------|-----------|----------------|
| location_type  | text      | 'none'         |
| visibility     | text      | 'private'      |
| max_attendees  | integer   | NULL           |

## Code Changes

### Files Modified
- ✅ `src/components/calendar/personal-event-modal-v2.tsx` (new component)
- ✅ `src/components/calendar/personal-events-calendar.tsx` (updated import)
- ✅ `supabase/migrations/add-location-type-visibility.sql` (new migration)

### Files NOT Modified (backward compatibility maintained)
- `src/components/calendar/personal-event-modal.tsx` (legacy, still functional)
- Existing event data is auto-migrated with safe defaults

## Rollback Plan

If issues occur:

1. **Revert component**:
   ```typescript
   // In personal-events-calendar.tsx
   import { PersonalEventModal, PersonalEvent } from './personal-event-modal';
   // Replace <PersonalEventModalV2> with <PersonalEventModal>
   ```

2. **Rollback database** (if needed):
   ```sql
   ALTER TABLE public.personal_events 
     DROP COLUMN IF EXISTS location_type,
     DROP COLUMN IF EXISTS visibility,
     DROP COLUMN IF EXISTS max_attendees;
   ```

## Feature Behavior

### Location Type
- **None**: No location field shown; `location` set to NULL
- **Plain Text**: Free-text input; stored in `location` column
- **Google Maps**: Address input (future: render as map embed)

### Visibility
- **Public**: Event appears in share link when generated
- **Private**: Event only visible to creator
- **Invite Only**: *Phase 5* — requires attendee tracking system

### Capacity
- **Unlimited**: `max_attendees` is NULL
- **Limited**: User enters `max_attendees` value

## Testing Checklist

Before deploying:
- [ ] Create event with "None" location → saves correctly
- [ ] Create event with "Plain Text" location → saves text
- [ ] Create event with "Google Maps" location → saves address
- [ ] Toggle Visibility (Public/Private/Invite Only) → persists
- [ ] Set Limited capacity → max_attendees saves
- [ ] Existing events load correctly (backward compat)
- [ ] Share link works for Public events
- [ ] Form validation works (title + date + time required)
- [ ] Dark theme renders correctly

## Deployment

```bash
# 1. Commit changes
git add .
git commit -m "feat: Add V2 event form with location types and visibility"

# 2. Push to GitHub
git push origin master

# 3. Deploy to Vercel (auto-deploys from master)
# 4. Run migration in production Supabase
# 5. Test live site
```

## Next Steps (Phase 5)

- [ ] Implement Google Maps embed for `location_type='maps'`
- [ ] Build attendee tracking for `visibility='invite_only'`
- [ ] Add invite system (email/link-based)
- [ ] RSVP functionality with capacity enforcement

---

**Created:** 2026-02-04  
**Author:** Geek (Dev Assistant)  
**Status:** Ready for testing
