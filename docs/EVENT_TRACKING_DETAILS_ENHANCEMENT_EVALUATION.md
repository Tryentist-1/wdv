# Event Tracking Details Enhancement Evaluation

**Date:** November 29, 2025  
**Status:** Evaluation & Planning  
**Purpose:** Evaluate enhancing Event Tracking Details to provide a holistic overview of Events, Rounds, and Brackets for day-of-event management

---

## 🎯 Executive Summary

This evaluation assesses the opportunity to create a comprehensive **Event Tracking Dashboard** that provides coaches and event managers with a real-time, holistic view of event progress, enabling them to keep events on track throughout single or multi-day competitions.

---

## 📊 Current State Analysis

### Existing Capabilities

1. **Event Management (Coach Console)**
   - Basic event list with name, date, status
   - Edit event modal with separate lists for rounds and brackets
   - Individual round/bracket management
   - Status tracking: Planned → Active → Completed

2. **Data Structure**
   - Events table: `id`, `name`, `date`, `status`, `entry_code`
   - Rounds table: `id`, `event_id`, `division`, `round_type`, `status`
   - Brackets table: `id`, `event_id`, `bracket_type`, `division`, `status`
   - Scorecard tracking: `round_archers` with `completed` status
   - Match tracking: `solo_matches`, `team_matches` with status

3. **API Endpoints**
   - `GET /v1/events/{id}/snapshot` - Basic event data
   - `GET /v1/events/{id}/rounds` - Round listing
   - `GET /v1/events/{id}/brackets` - Bracket listing
   - `GET /v1/events/{id}/solo-matches` - Solo matches
   - `GET /v1/events/{id}/team-matches` - Team matches

### Current Gaps

1. **No Holistic Overview**
   - Can't see all rounds and brackets in one view
   - No progress indicators or completion percentages
   - No timeline/schedule view
   - No at-a-glance status summary

2. **Limited Progress Tracking**
   - Round status exists but not aggregated
   - No scorecard completion percentage per round
   - No bracket match completion tracking
   - No event-wide progress metrics

3. **No Day-of-Event Dashboard**
   - No real-time updates during event
   - No quick access to critical actions
   - No alerts for bottlenecks or issues
   - No schedule/timeline view

4. **Mobile Optimization Gaps**
   - Current views not optimized for mobile event management
   - No quick-switch between rounds/brackets
   - No compact status indicators

---

## 🎯 Proposed Enhancement: Event Tracking Dashboard

### Core Concept

A **comprehensive event overview page** that provides:
- Real-time progress tracking across all rounds and brackets
- Visual hierarchy: Event → Rounds → Brackets
- Completion percentages and status indicators
- Quick access to critical actions
- Timeline/schedule view for multi-day events
- Mobile-optimized for on-the-go event management

---

## 📋 Feature Requirements

### 1. Event Overview Dashboard

#### 1.1 Event Header Section
- **Event Name & Date**
- **Event Status Badge** (Planned/Active/Completed)
- **Overall Progress Bar** (percentage of all rounds/brackets completed)
- **Quick Stats:**
  - Total Rounds: X (Y completed)
  - Total Brackets: X (Y completed)
  - Total Archers: X
  - Total Matches: X (Y completed)

#### 1.2 Rounds Section
**Hierarchical View:**
```
Event: Fall Tournament 2025
├── Ranking Rounds
│   ├── OPEN - R300
│   │   ├── Status: Active (75% complete)
│   │   ├── Archers: 18 (14 completed)
│   │   ├── Bales: 5
│   │   └── [View] [Verify] [Results]
│   ├── BVAR - R300
│   │   ├── Status: Completed (100%)
│   │   └── [View] [Verify] [Results]
│   └── GVAR - R300
│       ├── Status: Not Started (0%)
│       └── [View] [Add Archers]
└── Brackets
    ├── Solo Elimination - BVAR
    │   ├── Status: In Progress (50% matches complete)
    │   ├── Matches: 7 total (4 completed, 3 pending)
    │   └── [View Bracket] [View Results]
    └── Team Swiss - OPEN
        ├── Status: Open (0% complete)
        └── [View Bracket] [Add Matches]
```

**Features:**
- Expandable/collapsible sections
- Color-coded status indicators
- Progress bars per round/bracket
- Quick action buttons
- Real-time updates (auto-refresh every 30s when Active)

#### 1.3 Progress Metrics
- **Round Completion:**
  - Scorecards completed / Total scorecards
  - Ends completed / Total ends
  - Average score per division
- **Bracket Completion:**
  - Matches completed / Total matches
  - Current round (Quarters/Semis/Finals)
  - Winners determined
- **Event Timeline:**
  - Start time (first score entered)
  - Estimated completion time
  - Current phase (Ranking → Brackets → Awards)

#### 1.4 Quick Actions Panel
- **For Active Events:**
  - [Verify Scorecards] - Jump to verify modal
  - [View Live Results] - Open results page
  - [Create Bracket] - Quick bracket creation
  - [Add Archers] - Add archers to event
  - [QR Code] - Display QR for archers
- **For Planned Events:**
  - [Activate Event] - Change status to Active
  - [Add Archers] - Pre-populate event
  - [Generate Brackets] - Auto-generate from rankings

### 2. Real-Time Updates

#### 2.1 Auto-Refresh
- Refresh every 30 seconds when event is Active
- Manual refresh button
- Visual indicator when data is updating
- Show "Last updated: X seconds ago"

#### 2.2 Live Progress Indicators
- Scorecard completion updates in real-time
- Match status updates as matches complete
- Round status changes automatically
- Event completion triggers notification

#### 2.3 Alerts & Notifications
- **Bottleneck Alerts:**
  - Round with many incomplete scorecards
  - Bracket with stalled matches
  - Division falling behind schedule
- **Completion Alerts:**
  - Round completed (ready for bracket generation)
  - Bracket completed (ready for awards)
  - Event completed

### 3. Timeline/Schedule View

#### 3.1 Event Timeline
- **For Single-Day Events:**
  - Morning: Ranking Rounds
  - Afternoon: Brackets
  - Evening: Awards
- **For Multi-Day Events:**
  - Day 1: Ranking Rounds
  - Day 2: Brackets & Finals
  - Day 3: Team Events

#### 3.2 Schedule Tracking
- Show planned vs actual timeline
- Highlight current phase
- Show delays or ahead-of-schedule indicators
- Estimated time remaining per phase

### 4. Mobile Optimization

#### 4.1 Compact Layout
- Collapsible sections (default: show summary only)
- Swipeable tabs for Rounds/Brackets/Stats
- Bottom navigation for quick actions
- Sticky header with event name and progress

#### 4.2 Touch-Friendly
- Large tap targets (44px minimum)
- Swipe gestures for navigation
- Pull-to-refresh
- Quick action buttons in footer

#### 4.3 Performance
- Lazy loading for large event data
- Progressive enhancement
- Offline capability (show cached data)

---

## 🗄️ Technical Implementation

### Backend API Enhancements

#### New Endpoint: `GET /v1/events/{id}/overview`

**Response Structure:**
```json
{
  "event": {
    "id": "uuid",
    "name": "Fall Tournament 2025",
    "date": "2025-11-29",
    "status": "Active",
    "entry_code": "FALL2025"
  },
  "summary": {
    "total_rounds": 4,
    "completed_rounds": 2,
    "total_brackets": 2,
    "completed_brackets": 0,
    "total_archers": 45,
    "total_scorecards": 45,
    "completed_scorecards": 32,
    "total_matches": 14,
    "completed_matches": 7,
    "overall_progress": 58.5
  },
  "rounds": [
    {
      "id": "uuid",
      "division": "OPEN",
      "round_type": "R300",
      "status": "Active",
      "archer_count": 18,
      "completed_scorecards": 14,
      "total_scorecards": 18,
      "progress_percentage": 77.8,
      "bale_count": 5,
      "average_score": 278.5,
      "actions": ["view", "verify", "results"]
    }
  ],
  "brackets": [
    {
      "id": "uuid",
      "bracket_type": "SOLO",
      "format": "ELIMINATION",
      "division": "BVAR",
      "status": "IN_PROGRESS",
      "total_matches": 7,
      "completed_matches": 4,
      "progress_percentage": 57.1,
      "current_round": "Semi-Finals",
      "actions": ["view_bracket", "view_results"]
    }
  ],
  "timeline": {
    "started_at": "2025-11-29T08:00:00Z",
    "estimated_completion": "2025-11-29T16:00:00Z",
    "current_phase": "Ranking Rounds",
    "phases": [
      {
        "name": "Ranking Rounds",
        "status": "in_progress",
        "started_at": "2025-11-29T08:00:00Z",
        "estimated_end": "2025-11-29T12:00:00Z"
      },
      {
        "name": "Brackets",
        "status": "pending",
        "estimated_start": "2025-11-29T13:00:00Z"
      }
    ]
  },
  "alerts": [
    {
      "type": "bottleneck",
      "severity": "medium",
      "message": "GVAR round has 5 incomplete scorecards",
      "round_id": "uuid"
    }
  ],
  "last_updated": "2025-11-29T10:30:00Z"
}
```

**SQL Query Structure:**
```sql
-- Event summary with aggregated progress
SELECT 
  e.id, e.name, e.date, e.status,
  COUNT(DISTINCT r.id) as total_rounds,
  SUM(CASE WHEN r.status = 'Completed' THEN 1 ELSE 0 END) as completed_rounds,
  COUNT(DISTINCT b.id) as total_brackets,
  SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_brackets,
  COUNT(DISTINCT ra.id) as total_scorecards,
  SUM(CASE WHEN ra.completed = TRUE THEN 1 ELSE 0 END) as completed_scorecards,
  COUNT(DISTINCT sm.id) + COUNT(DISTINCT tm.id) as total_matches,
  SUM(CASE WHEN sm.status = 'COMPLETED' THEN 1 ELSE 0 END) + 
  SUM(CASE WHEN tm.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_matches
FROM events e
LEFT JOIN rounds r ON r.event_id = e.id
LEFT JOIN brackets b ON b.event_id = e.id
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN solo_matches sm ON sm.event_id = e.id
LEFT JOIN team_matches tm ON tm.event_id = e.id
WHERE e.id = ?
GROUP BY e.id, e.name, e.date, e.status;
```

### Frontend Implementation

#### New Page: `event_dashboard.html`

**Key Components:**
1. **EventHeader** - Name, date, status, overall progress
2. **RoundsList** - Expandable list with progress indicators
3. **BracketsList** - Expandable list with match progress
4. **ProgressMetrics** - Charts/graphs for completion
5. **TimelineView** - Schedule visualization
6. **QuickActions** - Action buttons panel
7. **AlertsPanel** - Notifications and warnings

**Integration Points:**
- Link from Coach Console events table
- Accessible via: `event_dashboard.html?event={id}`
- Mobile-optimized layout
- Real-time updates via polling or WebSocket

---

## 📱 User Experience Flow

### Scenario 1: Day-of-Event Management

1. **Coach opens Event Dashboard** (from Coach Console or direct link)
2. **Views Overview:**
   - Sees 4 rounds: 2 completed, 2 in progress
   - Sees 2 brackets: 1 in progress, 1 pending
   - Overall progress: 65%
3. **Checks Round Status:**
   - Expands "OPEN - R300" round
   - Sees 18 archers, 14 completed (78%)
   - Clicks [Verify] to verify completed scorecards
4. **Monitors Bracket Progress:**
   - Expands "Solo Elimination - BVAR"
   - Sees 4 of 7 matches completed
   - Clicks [View Bracket] to see bracket visualization
5. **Receives Alert:**
   - Notification: "GVAR round has 5 incomplete scorecards"
   - Clicks alert to jump to that round
6. **Takes Action:**
   - Verifies remaining scorecards
   - Generates bracket from completed rankings
   - Updates event status as needed

### Scenario 2: Pre-Event Planning

1. **Coach opens Event Dashboard** for planned event
2. **Views Structure:**
   - Sees 4 rounds created but no archers assigned
   - Sees 0 brackets (not yet created)
3. **Takes Actions:**
   - Clicks [Add Archers] to populate rounds
   - Reviews round assignments
   - Generates QR code for archer access
4. **Day Before Event:**
   - Verifies all archers assigned
   - Checks bale assignments
   - Activates event (changes status to Active)

---

## 🎨 Design Considerations

### Visual Hierarchy
- **Event Level:** Large header with overall progress
- **Round/Bracket Level:** Expandable cards with status indicators
- **Detail Level:** Inline actions and metrics

### Color Coding
- **Status Colors:**
  - Planned: Gray
  - Active: Blue
  - Completed: Green
  - Delayed/Issue: Orange/Red
- **Progress Bars:**
  - 0-50%: Red/Orange gradient
  - 50-90%: Yellow/Orange gradient
  - 90-100%: Green gradient

### Mobile-First Design
- **Collapsible Sections:** Default to summary view
- **Swipeable Tabs:** Rounds | Brackets | Stats
- **Sticky Actions:** Quick actions always accessible
- **Compact Metrics:** Icons + numbers, not verbose text

---

## 📊 Success Metrics

### Quantitative
- **Time Savings:** Reduce time to check event status from 5 minutes to 30 seconds
- **Issue Detection:** Identify bottlenecks 50% faster
- **Completion Rate:** Increase event completion rate by 10%
- **User Adoption:** 80% of coaches use dashboard on event day

### Qualitative
- **User Satisfaction:** Coaches report feeling "more in control"
- **Stress Reduction:** Less anxiety about missing critical steps
- **Event Quality:** Fewer errors due to better visibility

---

## 🚀 Implementation Phases

### Phase 1: Core Dashboard (2-3 weeks)
**Priority: High**

1. **Backend API**
   - Create `GET /v1/events/{id}/overview` endpoint
   - Aggregate progress calculations
   - Status computation logic

2. **Frontend Page**
   - Create `event_dashboard.html`
   - Event header with summary
   - Rounds list with progress
   - Brackets list with progress
   - Basic styling (mobile-optimized)

3. **Integration**
   - Link from Coach Console
   - Navigation from event edit modal
   - Direct URL access

**Deliverable:** Functional dashboard showing event overview

### Phase 2: Real-Time Updates (1-2 weeks)
**Priority: Medium**

1. **Auto-Refresh**
   - Polling every 30 seconds
   - Manual refresh button
   - Last updated indicator

2. **Live Progress**
   - Real-time progress bar updates
   - Status change notifications
   - Completion alerts

**Deliverable:** Dashboard with real-time updates

### Phase 3: Timeline & Alerts (1-2 weeks)
**Priority: Medium**

1. **Timeline View**
   - Event phase visualization
   - Schedule tracking
   - Estimated completion times

2. **Alerts System**
   - Bottleneck detection
   - Completion notifications
   - Issue warnings

**Deliverable:** Dashboard with timeline and alerts

### Phase 4: Advanced Features (2-3 weeks)
**Priority: Low**

1. **Analytics**
   - Completion rate trends
   - Average time per phase
   - Historical comparisons

2. **Export/Reporting**
   - Export event summary
   - Generate reports
   - Print-friendly view

**Deliverable:** Full-featured dashboard with analytics

---

## ⚠️ Risks & Considerations

### Technical Risks
1. **Performance:** Large events with many rounds/brackets may slow queries
   - **Mitigation:** Pagination, lazy loading, caching
2. **Real-Time Updates:** Polling may increase server load
   - **Mitigation:** Efficient queries, WebSocket option for future
3. **Mobile Performance:** Complex views may lag on older devices
   - **Mitigation:** Progressive enhancement, simplified mobile view

### User Experience Risks
1. **Information Overload:** Too much data may overwhelm users
   - **Mitigation:** Collapsible sections, summary-first approach
2. **Learning Curve:** New interface may require training
   - **Mitigation:** Intuitive design, help tooltips, documentation

### Data Risks
1. **Accuracy:** Progress calculations must be correct
   - **Mitigation:** Thorough testing, validation queries
2. **Consistency:** Status updates must be synchronized
   - **Mitigation:** Single source of truth, atomic updates

---

## ✅ Recommendation

**Proceed with implementation** in phases:

1. **Start with Phase 1** (Core Dashboard) - High value, manageable scope
2. **Evaluate user feedback** before Phase 2
3. **Iterate based on real-world usage**
4. **Add advanced features** (Phase 3-4) based on demand

**Expected Impact:**
- Significant improvement in event management efficiency
- Better visibility into event progress
- Reduced stress for coaches during events
- Foundation for future event analytics

**Estimated Total Effort:** 6-10 weeks (phased approach)

---

## 📚 Related Documentation

- [UI Hierarchy Improvement Plan](UI_HIERARCHY_IMPROVEMENT_PLAN.md)
- [Coach Console Redesign](COACH_CONSOLE_REDESIGN.md)
- [Bracket Management Implementation](BRACKET_MANAGEMENT_IMPLEMENTATION_PLAN.md)
- [Event Modal Refactor Plan](EVENT_MODAL_REFACTOR_PLAN.md)

---

*Last Updated: November 29, 2025*  
*Status: Evaluation Complete - Ready for Implementation Planning*

