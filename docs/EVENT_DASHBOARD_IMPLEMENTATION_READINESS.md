# Event Dashboard Implementation Readiness

**Date:** December 2025  
**Status:** Planning & Preparation  
**Goal:** Define scope, approach, and requirements before starting implementation

---

## ✅ What We Have

### Documentation
- ✅ [EVENT_TRACKING_DETAILS_ENHANCEMENT_EVALUATION.md](EVENT_TRACKING_DETAILS_ENHANCEMENT_EVALUATION.md) - Complete evaluation
- ✅ Added to SESSION_QUICK_START.md as current priority
- ✅ Added to ROADMAP.md as Phase 2.5

### Existing Infrastructure
- ✅ Events, Rounds, Brackets database schema
- ✅ API endpoints for events, rounds, brackets, matches
- ✅ Coach Console with event management
- ✅ Tailwind CSS system (100% migrated)
- ✅ Mobile-first patterns established
- ✅ Authentication system (coach passcode)

### Existing API Endpoints We Can Use
- `GET /v1/events/{id}/snapshot` - Basic event data
- `GET /v1/events/{id}/rounds` - Round listing
- `GET /v1/events/{id}/brackets` - Bracket listing
- `GET /v1/events/{id}/solo-matches` - Solo matches
- `GET /v1/events/{id}/team-matches` - Team matches

---

## ❓ Questions to Answer Before Starting

### 1. Scope & MVP Definition

**Question:** What's the minimum viable product (MVP) for Phase 1?

**Options:**
- **Option A (Minimal):** Just event summary + rounds list with progress bars
- **Option B (Recommended):** Event summary + rounds list + brackets list + basic progress
- **Option C (Full Phase 1):** Everything in evaluation doc (summary, rounds, brackets, timeline, quick actions)

**Recommendation:** Start with Option B - gives value quickly without overwhelming scope.

---

### 2. Integration Points

**Question:** How should coaches access the dashboard?

**Options:**
- **Option A:** New button in Coach Console events table: "📊 Dashboard"
- **Option B:** Replace "Edit" button with "Dashboard" (dashboard includes edit functionality)
- **Option C:** Add dashboard link inside Edit Event modal
- **Option D:** All of the above (multiple entry points)

**Recommendation:** Option A + Option C - Add dashboard button, also link from edit modal.

---

### 3. Data Aggregation Strategy

**Question:** Should we create a new aggregated endpoint or use existing endpoints?

**Options:**
- **Option A:** New `GET /v1/events/{id}/overview` endpoint (single call, optimized)
- **Option B:** Multiple calls from frontend (use existing endpoints, simpler backend)
- **Option C:** Hybrid (new endpoint but can fall back to multiple calls)

**Recommendation:** Option A - Better performance, single source of truth, cleaner frontend code.

**Follow-up:** Do we need to worry about performance for events with many rounds/brackets?
- **Answer:** Probably not initially (typical events have 4-8 rounds, 2-4 brackets)
- **Future:** Can add pagination/caching if needed

---

### 4. Real-Time Updates Strategy

**Question:** How should we handle real-time updates in Phase 1?

**Options:**
- **Option A:** Manual refresh button only (simplest)
- **Option B:** Auto-refresh every 30 seconds (recommended for Phase 1)
- **Option C:** WebSocket/Server-Sent Events (future Phase 2)

**Recommendation:** Option B - Auto-refresh is essential for day-of-event use, but keep it simple (polling).

---

### 5. Mobile Layout Approach

**Question:** How should we organize the dashboard on mobile?

**Options:**
- **Option A:** Single scrollable page (all sections visible)
- **Option B:** Tabs (Rounds | Brackets | Stats)
- **Option C:** Accordion/collapsible sections (default collapsed, show summary)

**Recommendation:** Option C - Best for mobile, reduces scrolling, shows key info first.

---

### 6. Quick Actions Scope

**Question:** Which quick actions should we include in Phase 1?

**Options:**
- **Option A:** Links only (navigate to existing pages)
- **Option B:** Inline modals (verify, create bracket within dashboard)
- **Option C:** Mix (links for complex actions, inline for simple ones)

**Recommendation:** Option A for Phase 1 - Keep it simple, link to existing workflows. Add inline actions in Phase 2.

---

### 7. Timeline View Priority

**Question:** Is timeline view essential for Phase 1?

**Options:**
- **Option A:** Skip timeline for Phase 1 (add in Phase 3)
- **Option B:** Simple timeline (just current phase indicator)
- **Option C:** Full timeline with schedule tracking

**Recommendation:** Option B - Simple "Current Phase" indicator is enough for MVP.

---

### 8. Testing Strategy

**Question:** How should we test without impacting production?

**Options:**
- **Option A:** Create test event in production database
- **Option B:** Use local database with test data
- **Option C:** Feature flag (only show to specific coach/test account)

**Recommendation:** Option B + Option C - Test locally first, then feature flag in production.

---

## 🎯 Proposed MVP Scope (Phase 1)

Based on questions above, here's the recommended MVP:

### Backend
1. **New API Endpoint:** `GET /v1/events/{id}/overview`
   - Aggregates event, rounds, brackets, matches data
   - Calculates progress percentages
   - Returns summary statistics
   - Single optimized query

### Frontend
1. **New Page:** `event_dashboard.html`
   - Event header (name, date, status, overall progress bar)
   - Rounds section (expandable, shows progress per round)
   - Brackets section (expandable, shows match progress)
   - Quick stats summary
   - Auto-refresh every 30 seconds (when event is Active)
   - Manual refresh button

### Integration
1. **Coach Console:** Add "📊 Dashboard" button to events table
2. **Edit Event Modal:** Add "View Dashboard" link
3. **Direct Access:** `event_dashboard.html?event={id}`

### Design
- Mobile-first (collapsible sections)
- Tailwind CSS only
- Follow existing Coach Console patterns
- Dark mode support

---

## 🚀 Implementation Plan

### Step 1: Backend API (Week 1)
1. Create `GET /v1/events/{id}/overview` endpoint
2. Write SQL query to aggregate all data
3. Calculate progress percentages
4. Test with sample events
5. Document endpoint

### Step 2: Frontend Page (Week 2)
1. Create `event_dashboard.html` structure
2. Implement event header component
3. Implement rounds list component
4. Implement brackets list component
5. Add auto-refresh logic
6. Style with Tailwind (mobile-first)

### Step 3: Integration (Week 3)
1. Add dashboard button to Coach Console
2. Add dashboard link to Edit Event modal
3. Test navigation flows
4. Test on mobile devices

### Step 4: Testing & Polish (Week 3-4)
1. Test with real event data
2. Test auto-refresh behavior
3. Test mobile layout
4. Fix any issues
5. Deploy to production

---

## 📋 What I Need to Start

### From You (Terry)

1. **Scope Confirmation:**
   - ✅ Approve MVP scope above?
   - ✅ Any features to add/remove from Phase 1?

2. **Design Preferences:**
   - ✅ Any specific UI patterns to follow?
   - ✅ Color scheme preferences?
   - ✅ Icon preferences (emoji vs Font Awesome)?

3. **Data Requirements:**
   - ✅ Any specific metrics to calculate?
   - ✅ Any existing queries I should reference?

4. **Testing:**
   - ✅ Do you have a test event I can use?
   - ✅ Should I create test data locally?

5. **Deployment:**
   - ✅ Feature flag approach OK?
   - ✅ Or should we deploy directly?

### From Codebase

1. **API Patterns:**
   - ✅ Review existing API endpoint structure
   - ✅ Review authentication patterns
   - ✅ Review error handling

2. **Frontend Patterns:**
   - ✅ Review Coach Console structure
   - ✅ Review Tailwind patterns
   - ✅ Review mobile-first approach

3. **Database:**
   - ✅ Review existing queries for rounds/brackets
   - ✅ Understand status calculation logic

---

## ✅ Ready to Start Checklist

- [ ] Scope confirmed (MVP defined)
- [ ] Design preferences confirmed
- [ ] Test data available or created
- [ ] API endpoint structure reviewed
- [ ] Frontend patterns reviewed
- [ ] Database queries understood
- [ ] Deployment strategy confirmed

---

## 🎯 Success Criteria

**Phase 1 is complete when:**
- ✅ Coach can access dashboard from Coach Console
- ✅ Dashboard shows event overview with rounds and brackets
- ✅ Progress percentages are accurate
- ✅ Auto-refresh works for active events
- ✅ Mobile layout is usable on iPhone SE
- ✅ No impact on existing features
- ✅ Deployed to production

---

*Ready to proceed once questions are answered and scope is confirmed!*

