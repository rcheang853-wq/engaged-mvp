# Product Requirements Document (PRD) – Event Calendar App (v2.0)

## Executive Summary

The Event Calendar App is a **local event discovery and calendar platform** that helps users find trending, nearby, and top events in Macau/Hong Kong/GBA. Inspired by Timable’s proven discover-first model, it differentiates with **AI Matching (swipe feature)**, a **calendar-first UX**, and a **simple Pro membership plan**.

The app aggregates event data from official sources, venue websites, and organizer submissions using a **state-of-the-art scraping pipeline**. Users can easily discover, filter, and save events, while organizers can submit and promote their events through a dedicated portal.

---

## Product Vision

To be the **go-to calendar-first event discovery app** in Macau/HK/GBA, offering **personalized, AI-enhanced recommendations** and **seamless calendar integration**, while giving organizers a powerful channel to promote events.

---

## Problem Statement

- **Fragmented discovery**: Events are scattered across multiple sites and apps.
- **Generic recommendations**: Users get lists, not personalized matches.
- **Weak calendar integration**: Most event apps treat calendars as secondary.
- **Organizer friction**: No simple way to submit, update, and promote events.

---

## Our Solution

- **Timable-style Discover page**: Trending, Nearby, Top 10 events.
- **AI Matching (Swipe)**: Tinder-like interface to like/pass events, training the app to personalize recommendations.
- **Calendar-first UX**: Events added from swipes/bookmarks appear directly in the in-app calendar.
- **One Pro Membership**: HKD 38/month → unlimited swipes, superlikes, advanced filters, no ads, early alerts.
- **Organizer Tools**: Submission portal + scraping pipeline with freshness logic (airline-style).
- **Platform**: Web-first (Next.js + Supabase backend).

---

## User Stories

### Discover & AI Matching

- As a user, I can see **Trending, Nearby, and Top 10** events on the home page.
- As a user, I can tap **“TRY AI MATCHING”** to swipe on personalized event cards.
- As a user, I can save swiped events into my in-app calendar.

### Calendar

- As a user, I can view saved events in **Month, Week, Agenda** views.
- As a user, I can get conflict warnings if events overlap.
- As a Pro user, I get early-bird alerts when new events match my preferences.

### Organizer

- As an organizer, I can **submit events** with title, description, date/time, venue, poster, ticket link.
- As an organizer, I can **edit/update** events, with changes notifying users who saved them.

---

## Functional Requirements

**FR1: Discover Landing Page**

- Timable-style sections (Trending, Nearby, Top 10, Weekend Picks).
- Event cards with poster, title, venue, date/time, save button.

**FR2: AI Matching**

- Swipe deck with Like/Pass/Superlike actions.
- Store user feedback to refine personalization.

**FR3: Calendar**

- Events added via swipe/bookmark auto-sync to calendar.
- Multiple views (month, week, agenda).

**FR4: Membership**

- Free tier: 40 swipes/day, basic calendar.
- Pro tier: Unlimited swipes, superlikes, advanced filters, no ads, early alerts.

**FR5: Scraping & Organizer Tools**

- Pipeline: Playwright + Firecrawl + ETag checks + deduplication.
- Organizer portal: manual submission + bulk import (CSV/ICS).

---

## Non-Functional Requirements

- **Performance**: <2s discover page load, <500ms search filter results.
- **Scalability**: Handle 50k events and 20k users.
- **SEO**: Server-side rendering for discover sections.
- **Security**: Supabase RLS, JWT, HTTPS.

---

## Monetization

- **Pro Membership** (HKD 38/month).
- Future: Event promotion placements, ticketing partnerships.

---

## Risks & Mitigation

- **Scraping fragility** → Use multi-source pipeline, fallback logic, change alerts.
- **User adoption** → Differentiate with swiping + calendar-first UX.
- **Organizer adoption** → Lower friction with free submission tools.

---

## Release Criteria

- ✅ Discover landing page (Trending/Nearby/Top 10).
- ✅ AI Matching MVP.
- ✅ Calendar integration with saves/swipes.
- ✅ Pro membership flow.
- ⏳ Push notifications (Phase 2).
- ⏳ Google sync (Phase 2).

---

# UI/UX Instructions

## Style & Design

- **Inspiration**: Timable layout + Any.do minimalism.
- **Color scheme**: Clean white background, accent color for CTA (blue or gradient).
- **Typography**: Modern sans-serif (Inter, Roboto).
- **Cards**: Rounded corners, event posters as hero images, shadow hover effect.
- **Navigation**: Bottom nav (Home/Discover, Calendar, Profile).

---

## Screen-by-Screen

### 1. Discover Page (Landing)

- **Header**: Logo + Search bar.
- **Sections**:
  - “Top 10 Events” (ranked cards).
  - “Trending Near You” (horizontal scroll).
  - “Happening This Weekend”.

- **CTA**: Full-width button → **TRY AI MATCHING**.

### 2. Swipe Deck

- Fullscreen card: poster image, event title, date, venue.
- Bottom buttons: ❌ (left), ❤️ (right), ⭐ (up = Superlike).
- Swipe animations: left = pass, right = like, up = superlike.

### 3. Event Detail

- Poster hero image, title, category tags.
- Date/time, venue map, ticket button.
- Save to calendar + Share buttons.

### 4. Calendar

- **Views**: Month (grid), Week (columns), Agenda (list).
- Events shown with category color tags.
- Tap → Event detail.

### 5. Membership Page

- Two-column layout: Free vs Pro (highlight Pro).
- CTA: “Upgrade to Pro – HKD 38/month”.
- Payment: Stripe checkout modal.

### 6. Organizer Portal

- Form: Title, description, poster upload, date/time, venue map, ticket link.
- Bulk upload: CSV/ICS import.
- Dashboard: Events submitted, status (pending/approved/live).

---

## UX Flow Summary

1. User opens Discover page → browses sections.
2. User clicks “TRY AI MATCHING” → swipes events.
3. Liked events auto-save into Calendar.
4. User checks Calendar to manage free time.
5. Pro upsell triggered when swipe quota exceeded or filter locked.
6. Organizers submit events → instantly appear after approval.

---
