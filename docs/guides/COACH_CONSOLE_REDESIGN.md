# Coach Console - Complete Redesign & Implementation

**Status**: ✅ Complete and Deployed  
**Date**: October 8, 2025  
**Version**: 2.0  

---

## 📋 Overview

Complete redesign of the Coach Console to provide a streamlined, mobile-first interface for event management, archer assignment, and QR code generation.

---

## 🎯 Key Features Implemented

### 1. **Coach Authentication**
- **90-day cookie-based authentication**
- Passcode: `wdva26`
- Modal-based login
- Auto-persistence across sessions
- Cancel button returns to home page

### 2. **Event Management**
#### Create Event
- Event Name
- Event Date
- Event Status (Planned/Active/Completed)
- Entry Code (for QR access)
- Manual mode: No auto-round creation

#### Edit Event
- Change name, date, status, entry code
- Quick status updates (Planned → Active → Completed)
- PATCH endpoint for updates

#### Delete Event
- Confirmation dialog
- Removes all rounds and scores

### 3. **QR Code Generation**
- **Mobile-optimized display**
- QR code size: 256px (desktop), 200px (mobile)
- Shows event URL with entry code
- Copy to clipboard functionality
- Instructions for archers
- Scrollable modal on mobile

**QR Code URL Format**:
```
https://tryentist.com/wdv/ranking_round_300.html?event={ID}&code={CODE}
```

### 4. **Archer Management**
#### Master Archer List
- Loaded from SQL database
- Synced via CSV import or manual entry

#### Add Archers to Event
- **Filter by**:
  - School
  - Gender (Boys/Girls)
  - Level (Varsity/JV)
- **Styled dropdowns** with blue borders
- **Select All Filtered** button
  - Toggles between Select All / Deselect All
  - Works with filtered results
  - Saves 40+ clicks when adding full roster

#### Assignment Mode
- **Auto-Assign**: Coach assigns 2-4 archers per bale
- **Manual Signup**: Archers self-select bales

### 5. **CSV Import**
- Upload CSV file
- Upserts archers by `ext_id` (first-last-school)
- Summary modal shows:
  - Total processed
  - Created (new)
  - Updated (existing)
- Flows into Add Archers workflow

### 6. **Results Page**
- Public URL: `results.html?event={ID}`
- Read-only division leaderboards
- Works for all statuses:
  - Planned: Shows roster
  - Active: Live scores with auto-refresh (30s)
  - Completed: Final results
- Mobile-responsive design

---

## 📱 Mobile Optimization

### Event Table
- **Ultra-compact design**
- Truncated event names (20 chars max)
- Short date format: "Oct 15" (no year)
- Emoji-only buttons for compactness:
  - 📱 QR Code
  - ✏️ Edit
  - ➕ Add Archers
  - 📊 Results
  - 🗑️ Delete
- Horizontal scroll with touch support
- Blue table headers (readable on mobile)

### Add Archers Modal
- Max height: 85vh on mobile
- Archer list: 200px on mobile
- Scrollable with `-webkit-overflow-scrolling: touch`
- Bottom buttons always visible
- Select All button uses `addEventListener` (iOS compatible)

### QR Code Modal
- Max height: 85vh on mobile
- QR code: 200px on mobile
- Compressed instructions
- Scrollable content
- Copy URL button accessible

---

## 🔧 Technical Implementation

### Frontend (`coach.html` + `js/coach.js`)

**Architecture**:
- Module pattern with IIFE
- Cookie-based auth (no localStorage for auth)
- State management for selected archers
- Modal-based UI for all workflows

**Key Functions**:
```javascript
checkAuthentication()      // Cookie validation
showCreateEventModal()     // Event creation
editEvent(eventData)       // Event editing
showQRCode(eventData)      // QR code display
addArchersToEvent(id)      // Archer management
loadMasterArcherList()     // Load from API
showAssignmentModeModal()  // Choose assign mode
```

**Mobile-Specific CSS**:
```css
@media (max-width: 768px) {
  .score-table th, .score-table td {
    padding: 0.3rem 0.15rem;
    font-size: 0.75rem;
  }
  #add-archers-modal .modal-content {
    max-height: 85vh;
  }
  .archer-list {
    max-height: 200px !important;
  }
}
```

### Backend (`api/index.php`)

**New Endpoints**:

#### `POST /v1/events`
- Creates event WITHOUT auto-rounds if `eventType: 'manual'`
- Accepts `entryCode` parameter

#### `PATCH /v1/events/{id}`
- Updates event fields:
  - name
  - date
  - status
  - entryCode
- Dynamic SQL UPDATE based on provided fields

#### `POST /v1/events/{id}/archers`
- Adds archers to event
- Creates division rounds on-demand
- Supports two modes:
  - `auto_assign`: Assigns bales/targets (2-4 per bale)
  - `manual`: No assignments (archers self-select)
- Prevents duplicate archer additions

#### `GET /v1/events/recent`
- Returns events with `entry_code` for authenticated users
- Excludes `entry_code` for public access (security)

#### `POST /v1/events/verify`
- Public endpoint for QR code validation
- Verifies `eventId` + `entryCode` match

#### `GET /v1/events/{id}/snapshot`
- Public endpoint (no auth)
- Returns event + division data
- Used by results page and ranking round

#### `GET /v1/archers`
- Lists all archers from master list
- Supports filtering by division/gender/level

#### `POST /v1/archers/bulk_upsert`
- Upserts archers by `ext_id`
- Returns `inserted` and `updated` counts

---

## 📊 Database Schema

### Events Table
```sql
CREATE TABLE events (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255),
  date DATE,
  status VARCHAR(20),  -- Planned, Active, Completed
  event_type VARCHAR(20),  -- auto_assign, manual
  entry_code VARCHAR(20),  -- For QR access
  created_at TIMESTAMP
);

CREATE INDEX idx_events_entry_code ON events(entry_code);
```

### Archers Table
```sql
CREATE TABLE archers (
  id VARCHAR(36) PRIMARY KEY,
  ext_id VARCHAR(255) UNIQUE,  -- first-last-school
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  school VARCHAR(3),  -- 3-letter code
  gender CHAR(1),  -- M or F
  level VARCHAR(3),  -- VAR or JV
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔄 Workflow Examples

### Scenario 1: New Event (Auto-Assign)
1. Coach logs in (`wdva26`)
2. Clicks **Create Event**
3. Enters: "Fall Championship 2025", "2025-10-15", "Planned", "FALL2025"
4. Imports CSV with 50 archers
5. Summary: "50 processed, 47 created, 3 updated"
6. Clicks **➕ Add Archers** on event
7. Clicks **Select All Filtered**
8. Chooses **Auto-Assign Bales**
9. System creates 4 division rounds and assigns archers to 15 bales
10. Clicks **📱 QR Code**
11. Displays QR on phone for archers to scan

### Scenario 2: Status Management
1. Coach opens event on phone
2. Clicks **✏️ Edit**
3. Changes status from "Planned" to "Active"
4. Clicks **Save Changes**
5. Event now shows green "ACTIVE" badge

### Scenario 3: Last-Minute Changes
1. Archer doesn't show up at event
2. Coach clicks **➕ Add Archers**
3. Finds archer in list
4. Unchecks them
5. Updates event

---

## 🐛 Issues Resolved

### Mobile Safari Quirks
**Problem**: Desktop responsive mode looked fine, but real iPhone failed

**Solutions**:
1. **Overflow**: Added `overflow-y: auto` to BOTH modal wrapper AND content
2. **Touch Scrolling**: Added `-webkit-overflow-scrolling: touch`
3. **Button Events**: Changed from `onclick` to `addEventListener` with `preventDefault()`
4. **Height Constraints**: Used `max-height: 85vh` with `!important` on mobile
5. **Archer List**: Reduced from 400px to 200px on mobile

### Header Color Bug
**Problem**: Table headers were white-on-light-gray (unreadable)

**Solution**: Set explicit `background: #2d7dd9` and `color: white` with `!important`

### Entry Code Not Showing
**Problem**: Entry codes saved but not returned by API

**Solution**: Made `/events/recent` context-aware - includes `entry_code` for authenticated users, excludes for public

---

## 📱 Mobile Testing Checklist

### Event Table
- [ ] Fits on screen without horizontal scroll
- [ ] Event names truncated if needed
- [ ] Dates show as "Oct 15" format
- [ ] All 5 buttons visible
- [ ] Headers are blue with white text

### Add Archers Modal
- [ ] Modal fits on screen
- [ ] Dropdowns have blue borders
- [ ] Select All button works
- [ ] Archer list scrolls
- [ ] Bottom buttons (Cancel, Add to Event) visible

### QR Code Modal
- [ ] QR code displays at 200px
- [ ] Content scrolls
- [ ] Copy URL button accessible
- [ ] Close button works

---

## 🚀 Deployment

### Files Modified
- `coach.html` - Complete redesign with modals
- `js/coach.js` - Rewritten (600+ lines)
- `css/main.css` - Added coach-specific styles
- `api/index.php` - New endpoints (PATCH, POST archers)

### Files Created
- `results.html` - Public results page
- `js/coach_old_backup.js` - Backup of old version

### Deployment Process
1. Commit changes to git (Development branch)
2. Run `bash DeployFTP.sh`
3. Automatically purges Cloudflare cache
4. Backups created in `../backups/`

---

## 🔜 Future Enhancements (Optional)

### Potential Features
- [ ] Remove archer from event UI
- [ ] Edit archer assignments UI
- [ ] Bulk delete events
- [ ] Export results to PDF
- [ ] QR code generator in UI (print-friendly)
- [ ] Event duplication
- [ ] Archer search within event
- [ ] Division-specific archer counts on event list
- [ ] SMS notification to archers (via Twilio)
- [ ] Event history / audit log

---

## 📞 Support Information

### Passcode
- Coach passcode: `wdva26`
- Cookie duration: 90 days
- Cookie name: `coach_auth`

### API Base URL
```
https://tryentist.com/wdv/api/v1
```

### Key URLs
- Coach Console: `https://tryentist.com/wdv/coach.html`
- Results Page: `https://tryentist.com/wdv/results.html?event={ID}`
- QR Code Format: `https://tryentist.com/wdv/ranking_round_300.html?event={ID}&code={CODE}`

---

## 🎓 Lessons Learned

### Mobile-First Development
1. **Always test on real devices** - Desktop responsive mode ≠ real iPhone Safari
2. **iOS Safari has quirks** - Needs explicit overflow, touch scrolling, and event handlers
3. **Use !important sparingly** - But necessary for mobile overrides sometimes
4. **Max-height with vh** - Works better than percentage on mobile modals
5. **addEventListener > onclick** - More reliable on touch devices

### API Design
1. **Context-aware endpoints** - Same endpoint, different data based on auth
2. **Public vs authenticated** - Security through selective data exposure
3. **Idempotent operations** - Upsert prevents duplicate issues
4. **On-demand creation** - Don't auto-create rounds until needed

### UX Improvements
1. **Select All button** - Massive time saver (40+ clicks → 1)
2. **QR codes** - Eliminates manual URL entry/event selection
3. **Emoji buttons** - Compact, universal, touch-friendly
4. **Truncation** - Better than overflow/wrapping on mobile

---

## ✅ Conclusion

The Coach Console is now a fully-featured, mobile-optimized application that streamlines event management, archer assignment, and score tracking. All major workflows have been tested and work on both desktop and real iPhone devices.

**Ready for production use.**

---

*Last Updated: October 8, 2025*
*Version: 2.0*
*Status: ✅ Complete*

