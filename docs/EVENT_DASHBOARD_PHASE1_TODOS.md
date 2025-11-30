# Event Dashboard Phase 1 - Implementation Todos

**Date Started:** December 2025  
**Status:** 🚧 In Progress  
**Branch:** `feature/event-dashboard-phase1`

---

## 🎯 Phase 1 MVP Goals

- [x] Add "Dashboard" button to Coach Console events table
- [ ] Create `event_dashboard.html` page (iPad/tablet/desktop optimized)
- [ ] Create `GET /v1/events/{id}/overview` API endpoint
- [ ] Implement event header with overall progress
- [ ] Implement rounds list (expandable, with progress)
- [ ] Implement brackets list (expandable, with match progress)
- [ ] Add auto-refresh every 30 seconds (for Active events)
- [ ] Add manual refresh button
- [ ] Mobile-optimized collapsible sections
- [ ] Integration with Coach Console
- [ ] Testing and deployment

---

## 📋 Implementation Checklist

### Step 1: Backend API ✅ IN PROGRESS

- [ ] Review existing API patterns (`api/index.php`)
- [ ] Design SQL query for event overview aggregation
- [ ] Create `GET /v1/events/{id}/overview` endpoint
- [ ] Calculate progress percentages (rounds, brackets, scorecards, matches)
- [ ] Return summary statistics
- [ ] Test endpoint with sample event
- [ ] Document endpoint in API docs

**Status:** Not started  
**Estimated Time:** 4-6 hours

---

### Step 2: Frontend Page Structure

- [ ] Create `event_dashboard.html` file
- [ ] Set up basic HTML structure (iPad/tablet/desktop layout)
- [ ] Add Tailwind CSS imports
- [ ] Add dark mode support
- [ ] Create page header/navigation
- [ ] Set up JavaScript module structure

**Status:** Not started  
**Estimated Time:** 2-3 hours

---

### Step 3: Event Header Component

- [ ] Display event name and date
- [ ] Show event status badge (Planned/Active/Completed)
- [ ] Calculate and display overall progress bar
- [ ] Show quick stats (total rounds, brackets, archers, matches)
- [ ] Style with Tailwind (iPad/tablet optimized)

**Status:** Not started  
**Estimated Time:** 3-4 hours

---

### Step 4: Rounds List Component

- [ ] Fetch rounds data from API
- [ ] Display rounds in expandable/collapsible cards
- [ ] Show round details (division, round type, status)
- [ ] Calculate and display progress per round
- [ ] Show archer count and completion status
- [ ] Add quick action buttons (View, Verify, Results)
- [ ] Style with Tailwind

**Status:** Not started  
**Estimated Time:** 4-5 hours

---

### Step 5: Brackets List Component

- [ ] Fetch brackets data from API
- [ ] Display brackets in expandable/collapsible cards
- [ ] Show bracket details (type, format, division, status)
- [ ] Calculate and display match progress
- [ ] Show match completion status
- [ ] Add quick action buttons (View Bracket, View Results)
- [ ] Style with Tailwind

**Status:** Not started  
**Estimated Time:** 4-5 hours

---

### Step 6: Auto-Refresh Logic

- [ ] Implement polling every 30 seconds (for Active events)
- [ ] Add manual refresh button
- [ ] Show "Last updated" timestamp
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Stop auto-refresh when event is not Active

**Status:** Not started  
**Estimated Time:** 2-3 hours

---

### Step 7: Coach Console Integration

- [ ] Add "📊 Dashboard" button to events table in `coach.html`
- [ ] Add dashboard link to Edit Event modal
- [ ] Implement navigation to dashboard
- [ ] Pass event ID via URL parameter
- [ ] Test navigation flow

**Status:** Not started  
**Estimated Time:** 2-3 hours

---

### Step 8: Testing & Polish

- [ ] Test with real event data
- [ ] Test auto-refresh behavior
- [ ] Test on iPad/tablet (target devices)
- [ ] Test on desktop
- [ ] Test dark mode
- [ ] Fix any layout issues
- [ ] Test error handling
- [ ] Verify no impact on existing features

**Status:** Not started  
**Estimated Time:** 4-6 hours

---

### Step 9: Documentation

- [ ] Update API documentation
- [ ] Create user guide for dashboard
- [ ] Update ROADMAP.md with completion status
- [ ] Update SESSION_QUICK_START.md if needed

**Status:** Not started  
**Estimated Time:** 1-2 hours

---

### Step 10: Deployment

- [ ] Review all changes
- [ ] Run local tests
- [ ] Create deployment branch
- [ ] Deploy to production
- [ ] Verify on production
- [ ] Monitor for issues

**Status:** Not started  
**Estimated Time:** 1-2 hours

---

## 📊 Progress Summary

**Total Estimated Time:** 27-38 hours  
**Current Progress:** 0% (0/10 steps started)

**Next Steps:**
1. Review existing API patterns
2. Design SQL query
3. Create backend endpoint
4. Start frontend page

---

## 🐛 Issues & Blockers

_None yet - will update as we encounter issues_

---

## 📝 Notes

- **Target Devices:** iPad, tablet, desktop (not mobile-first for this feature)
- **Quick Actions:** Links to existing pages (not inline modals)
- **Auto-Refresh:** Every 30 seconds for Active events only
- **Layout:** Collapsible sections (accordion style)

---

## ✅ Completed Items

_Will update as items are completed_

---

*Last Updated: December 2025*

