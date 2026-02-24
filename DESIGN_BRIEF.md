# Engage_Timetree Design Brief
**For Pencil Desktop App Mockups**

## Project Overview
Building a TimeTree-style shared calendar app called **Engage_Timetree**.

## Current Design System

### Colors (Primary Palette)
- **Primary Blue**: `#3B82F6`
- **Success Green**: `#10B981`
- **Warning Orange**: `#F59E0B`
- **Danger Red**: `#EF4444`
- **Purple**: `#8B5CF6`
- **Pink**: `#EC4899`

### Member Color Coding
Each member gets assigned a color from the palette above (rotating). This color is used for:
- Their avatar circle
- Their events on the calendar
- Their event badges

### Typography
- **Headers**: Bold, 16-20px
- **Body**: Regular, 14px
- **Small text**: 12px
- **Tiny labels**: 10px

### Spacing
- **Card padding**: 16px
- **Gap between cards**: 12px
- **Border radius (cards)**: 16px (very rounded, TimeTree-style)
- **Border radius (buttons)**: 8-12px
- **Border radius (avatars)**: Full circle

### Shadows
- **Card shadow**: Subtle, soft (shadow-sm)
- **Card hover shadow**: Slightly elevated (shadow-md)

## Screens to Design (5 Total)

### Screen 1: Calendar List (Home)
**Current file**: `src/app/demo/page.tsx`

**Elements:**
1. **Header bar** (white background, bottom border)
   - Title "My Calendars" (left, bold)
   - "+ New" button (right, blue, rounded)

2. **Calendar cards** (white, rounded-2xl, shadow)
   Each card shows:
   - **Color indicator**: Large rounded square (left) with colored dot inside
   - **Calendar name**: Bold, truncated
   - **Description** (optional): Gray, smaller, truncated
   - **Member avatars**: Row of small colored circles, overlapping
   - **Member count**: "X members" text
   - **Chevron arrow**: Right side, gray

3. **Join link**: "+ Join with invite code" (blue text, centered)

**Background**: Light gray (#F9FAFB)

---

### Screen 2: Monthly Calendar View
**Current file**: `src/app/demo/calendar/page.tsx`

**Elements:**
1. **Header bar**
   - Back arrow (left)
   - Calendar name + member avatars
   - Settings icon
   - "+ Add event" button (blue circle)

2. **Month navigator**
   - Left arrow
   - "Month Year" (centered, bold)
   - Right arrow

3. **Calendar grid** (7 columns × ~5 rows)
   - **Day headers**: Sun-Sat (small, gray)
   - **Day cells**: 
     - Date number (top-left, small)
     - Today highlighted (blue background)
     - Event badges (colored rectangles with truncated text)
     - "+X more" if >3 events

4. **Styling**:
   - Each cell: white background, rounded corners
   - Events: colored rectangles matching member colors
   - Grid gap: minimal (2px)

---

### Screen 3: Event Detail View
**To design from scratch**

**Layout:**
1. **Hero header** (colored background matching event color)
   - Back arrow (top-left, white)
   - Menu dots (top-right, white)
   - Event title (large, white, bold)
   - Creator info (small, white, with avatar)

2. **Event info card** (white, rounded, elevated above colored section)
   - **Date/Time row**: Clock icon + formatted time + date
   - **Location row** (if present): Map pin icon + location text
   - **Description**: Body text, gray

3. **RSVP section** (white card)
   - Title: "Are you going?"
   - 3 buttons side-by-side:
     - "Going" (green when active)
     - "Maybe" (yellow when active)
     - "Can't go" (red when active)
   Each button: icon + label

4. **Comments section** (white card)
   - Header: "Comments (X)"
   - Comment bubbles:
     - Avatar (left)
     - Gray rounded bubble with name + text
     - Timestamp below

5. **Fixed bottom bar**
   - Text input: "Add a comment..." (rounded, gray background)
   - Send button: Blue circle with arrow icon

---

### Screen 4: Create Event
**To design from scratch**

**Layout:**
1. **Header**
   - Back arrow (left)
   - "New Event" title
   - "Save" button (right, blue)

2. **Form sections** (each in white rounded card):

   **Title + Color**
   - Large color circle (left, clickable)
   - Title input field (large text)
   - Color picker row (when expanded): 8 color circles

   **Date & Time**
   - Calendar icon
   - Date picker
   - "All day" toggle
   - Time range picker (start/end)

   **Location**
   - Map pin icon
   - Location input field

   **Description**
   - Text align icon
   - Multi-line text area

---

### Screen 5: Join Calendar
**To design from scratch**

**Layout:**
1. **Header**
   - Back arrow
   - "Join a Calendar" title

2. **Centered content**
   - Large icon (calendar + people)
   - Heading: "Enter invite code"
   - Subtitle: "Ask the calendar owner to share..."
   
   - **Code input**: Large, centered, monospace font, 8-character limit
   
   - "Join Calendar" button (blue, full-width, rounded)
   
   - Divider: "or"
   
   - "Paste invite link" button (text-only, blue)

---

## Design Goals
✅ **Feel like TimeTree**: Rounded corners, soft shadows, friendly colors  
✅ **Member color-coding**: Consistent throughout  
✅ **Clean & minimal**: Lots of white space  
✅ **Mobile-first**: Design for 375px width (iPhone SE size)  
✅ **Touch-friendly**: Large tap targets (44px minimum)  

## What to Export
For each screen, save as PNG with filename:
- `1-calendar-list.png`
- `2-monthly-view.png`
- `3-event-detail.png`
- `4-create-event.png`
- `5-join-calendar.png`

## Next Steps
1. Design all 5 screens in Pencil Desktop App
2. Export as PNGs
3. Send the images back
4. I'll code the changes into the real app
