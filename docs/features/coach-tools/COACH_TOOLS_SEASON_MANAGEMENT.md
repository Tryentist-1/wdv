# Coach Tools - Season Management Features
## Implementation Guide

**Date:** January 21, 2025  
**Status:** Planning  
**Purpose:** Technical implementation guide for Coach Tools enhancements
**Audience:** Developers, Technical Team

> **📋 User-Focused Version:** For a feature-focused overview without code, see [COACH_TOOLS_SEASON_MANAGEMENT_USER_REVIEW.md](COACH_TOOLS_SEASON_MANAGEMENT_USER_REVIEW.md)

---

## 📋 Executive Summary

This document outlines two major enhancements to the Coach Tools module:

1. **Status Flags Tracking System** - Track annual milestones for each archer (Safety Training, Physical, Athletic Clearance, Equipment Checkout, Tryout Attendance)

2. **Enhanced Notes System** - Improve notes functionality with editable topics, global notes for batch operations, and formatted note history display (Markdown/HTML support)

These features will help coaches efficiently manage athlete compliance, track seasonal requirements, and maintain better communication through improved note-taking capabilities.

---

## 🎯 Feature 1: Status Flags Tracking System

### 1.1 Overview

Coaches need to track annual compliance milestones for each archer. These status flags are reset each year and must be tracked per archer to ensure eligibility and compliance.

### 1.2 Milestones to Track

The following milestones are **mandatory** and must be tracked annually:

1. **Mandatory Safety Training** - Completion of required safety training
2. **Physical** - Current physical examination on file
3. **Athletic Clearance** - Athletic clearance documentation complete
4. **Equipment Checkout** - Equipment has been checked out to archer
5. **Tryout Attendance** - Archer attended required tryout sessions

### 1.3 Data Model

#### Database Schema

```sql
-- Status flags table (one record per archer per season/year)
CREATE TABLE IF NOT EXISTS archer_status_flags (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  archer_id CHAR(36) NOT NULL COMMENT 'Reference to archers table',
  season_year VARCHAR(10) NOT NULL COMMENT 'Season identifier (e.g., "2024-2025", "2025")',
  
  -- Status flags (BOOLEAN: 0 = incomplete, 1 = complete)
  safety_training_complete BOOLEAN DEFAULT 0,
  physical_complete BOOLEAN DEFAULT 0,
  athletic_clearance_complete BOOLEAN DEFAULT 0,
  equipment_checkout_complete BOOLEAN DEFAULT 0,
  tryout_attendance_complete BOOLEAN DEFAULT 0,
  
  -- Metadata
  safety_training_date DATE NULL COMMENT 'Date completed',
  physical_date DATE NULL COMMENT 'Date completed',
  athletic_clearance_date DATE NULL COMMENT 'Date completed',
  equipment_checkout_date DATE NULL COMMENT 'Date completed',
  tryout_attendance_date DATE NULL COMMENT 'Date completed',
  
  -- Notes per flag (optional)
  safety_training_notes TEXT NULL,
  physical_notes TEXT NULL,
  athletic_clearance_notes TEXT NULL,
  equipment_checkout_notes TEXT NULL,
  tryout_attendance_notes TEXT NULL,
  
  -- Audit trail
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NULL COMMENT 'Coach/device identifier',
  
  PRIMARY KEY (id),
  UNIQUE KEY uq_archer_season (archer_id, season_year),
  KEY idx_archer (archer_id),
  KEY idx_season (season_year),
  KEY idx_compliance (safety_training_complete, physical_complete, athletic_clearance_complete),
  CONSTRAINT fk_asf_archer FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### Alternative: JSON Storage (Simpler Initial Implementation)

If a simpler approach is preferred initially, status flags could be stored as JSON in the `archers` table:

```sql
-- Add to archers table
ALTER TABLE archers ADD COLUMN status_flags JSON NULL COMMENT 'Status flags per season/year';

-- Example JSON structure:
{
  "2024-2025": {
    "safety_training": { "complete": true, "date": "2024-08-15", "notes": "" },
    "physical": { "complete": true, "date": "2024-08-20", "notes": "" },
    "athletic_clearance": { "complete": false, "date": null, "notes": "" },
    "equipment_checkout": { "complete": true, "date": "2024-08-25", "notes": "" },
    "tryout_attendance": { "complete": true, "date": "2024-09-01", "notes": "" }
  },
  "2025-2026": {
    "safety_training": { "complete": false, "date": null, "notes": "" },
    ...
  }
}
```

**Recommendation:** Start with separate table for better queryability and future extensibility.

### 1.4 User Interface

#### 1.4.1 Archer List View Enhancement

**Location:** `archer_list.html` - Add status flags column/indicator

**Display Options:**

**Option A: Status Badge Column**
```
┌─────────────────────────────────────────────────────────┐
│ Archer Name    │ Division │ Status Flags                │
├─────────────────────────────────────────────────────────┤
│ Sarah Johnson  │ BV       │ ✅✅✅❌✅ (3/5 complete)    │
│ Mike Chen      │ BV       │ ✅✅✅✅✅ (5/5 complete)    │
│ Alex Rivera    │ GV       │ ❌❌❌❌❌ (0/5 complete)    │
└─────────────────────────────────────────────────────────┘
```

**Option B: Expandable Status Section**
- Click archer row → Expand to show status flags detail
- Color-coded indicators (green = complete, red = incomplete)
- Quick toggle buttons for each flag

**Option C: Dedicated Status Flags Tab**
- New tab in archer detail modal
- Full status flags management interface
- Date pickers, notes fields per flag

#### 1.4.2 Status Flags Management Interface

**Location:** New section in `coach.html` or enhanced `archer_list.html`

**Features:**
- **Season Selector** - Choose current season/year
- **Bulk Operations** - Mark multiple archers as complete for a flag
- **Filter/View** - Filter archers by completion status
- **Export** - Export compliance report (CSV/PDF)
- **Visual Dashboard** - Overview of team compliance percentages
- **Email Integration** - Filter archers by incomplete flags, generate email list, open Gmail with pre-filled recipients

**UI Components:**
```
┌─────────────────────────────────────────────────────────┐
│ Status Flags - 2024-2025 Season                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [Season: 2024-2025 ▼] [Bulk Update] [Export Report]    │
│                                                          │
│ Compliance Overview:                                     │
│ Safety Training:     ████████░░ 80% (32/40)            │
│ Physical:           ██████████ 100% (40/40)            │
│ Athletic Clearance: ██████░░░░ 60% (24/40)            │
│ Equipment Checkout: ████████░░ 80% (32/40)            │
│ Tryout Attendance:   █████████░ 90% (36/40)            │
│                                                          │
│ Archer List:                                             │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Sarah Johnson (BV)                                  │ │
│ │ ✅ Safety Training (Aug 15)  ✅ Physical (Aug 20)   │ │
│ │ ✅ Athletic Clearance (Aug 22) ❌ Equipment        │ │
│ │ ✅ Tryout Attendance (Sep 1)                       │ │
│ │ [Edit] [View Notes]                                │ │
│ └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1.5 API Endpoints

```javascript
// Get status flags for an archer
GET /v1/archers/:id/status-flags?season=2024-2025
Response: {
  archer_id: "uuid",
  season_year: "2024-2025",
  flags: {
    safety_training: { complete: true, date: "2024-08-15", notes: "" },
    physical: { complete: true, date: "2024-08-20", notes: "" },
    ...
  }
}

// Update status flag
POST /v1/archers/:id/status-flags
Body: {
  season_year: "2024-2025",
  flag_name: "safety_training", // or "physical", "athletic_clearance", etc.
  complete: true,
  date: "2024-08-15",
  notes: "Completed online training module"
}

// Bulk update status flags
POST /v1/archers/status-flags/bulk
Body: {
  season_year: "2024-2025",
  flag_name: "physical",
  archer_ids: ["uuid1", "uuid2", "uuid3"],
  complete: true,
  date: "2024-08-20"
}

// Get compliance report
GET /v1/status-flags/report?season=2024-2025&format=csv
Response: CSV file or JSON summary
```

### 1.6 Business Logic

- **Season Reset:** At start of new season, create new status flag records (all incomplete)
- **Validation:** Ensure dates are within season year range
- **Notifications:** (Future) Alert coaches when flags are incomplete before events
- **History:** Maintain historical records (don't delete old seasons)
- **Data Model:** One entry per archer per season/year (UNIQUE KEY ensures no duplicates). Multiple entries exist if tracking multiple years/seasons, but typically one active entry per archer per season.

### 1.7 Email Integration for Status Flags

#### 1.7.1 Overview

Coaches need to quickly contact archers who are missing required status flags. This feature allows filtering by incomplete flags and generating an email list that opens in Gmail (or default email client) with pre-filled recipients from the school email account.

#### 1.7.2 User Interface

**Location:** Status Flags Management Interface - Add "Email Archers" button

**Workflow:**
1. Coach filters archers by incomplete flag (e.g., "Show all archers with no Physical")
2. System displays filtered list with email addresses
3. Coach clicks "Email Selected Archers" or "Email All Filtered"
4. System generates email list and opens Gmail (or default email client)
5. Email client opens with:
   - **To:** All selected archer email addresses (BCC for privacy)
   - **From:** School email (if configured) or coach's default email
   - **Subject:** Pre-filled template (e.g., "Missing Physical - Action Required")
   - **Body:** Pre-filled template with personalized message

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ Status Flags - Filtered View                            │
├─────────────────────────────────────────────────────────┤
│ Filter: [Physical: Incomplete ▼] [Apply Filter]         │
│                                                          │
│ Found 8 archers missing Physical:                       │
│                                                          │
│ ☑ Sarah Johnson (sarah.j@school.edu)                   │
│ ☑ Mike Chen (mike.c@school.edu)                         │
│ ☑ Alex Rivera (alex.r@school.edu)                       │
│ ☐ ... (5 more)                                          │
│                                                          │
│ [Select All] [Deselect All]                             │
│                                                          │
│ [Email Selected Archers] [Email All Filtered]          │
└─────────────────────────────────────────────────────────┘
```

#### 1.7.3 Email Template System

**Pre-filled Email Templates:**

**Subject Templates:**
- "Missing Physical - Action Required"
- "Missing Safety Training - Action Required"
- "Missing Athletic Clearance - Action Required"
- "Missing Equipment Checkout - Action Required"
- "Missing Tryout Attendance - Action Required"
- "Multiple Requirements Missing - Action Required"

**Body Templates:**
```
Dear [Archer Name],

This is a reminder that your [FLAG_NAME] is currently incomplete for the [SEASON_YEAR] season.

Please complete this requirement by [DEADLINE_DATE] to ensure eligibility.

If you have any questions, please contact the coaching staff.

Thank you,
[Coach Name]
[School Name] Archery Team
```

**Customization:**
- Coaches can edit templates before sending
- Save custom templates for reuse
- Support for placeholders: `[Archer Name]`, `[FLAG_NAME]`, `[SEASON_YEAR]`, `[DEADLINE_DATE]`, `[Coach Name]`, `[School Name]`

#### 1.7.4 Implementation Details

**Email Client Integration:**
- **Gmail:** Use `mailto:` link with BCC parameter (privacy)
- **Default Email:** Fall back to system default email client
- **Format:** `mailto:?bcc=email1@example.com,email2@example.com&subject=...&body=...`

**Privacy Considerations:**
- Use BCC (Blind Carbon Copy) to hide recipient list
- Option to send individual emails (one per archer) vs. bulk BCC
- Coach can review email list before sending

**Email Address Requirements:**
- Only include archers with valid email addresses in `archers.email` field
- Show warning if some archers don't have emails
- Allow coach to manually add email addresses

**API Endpoint:**
```javascript
// Get filtered archers with emails for status flag
GET /v1/status-flags/filter?season=2024-2025&flag=physical&complete=false&include_emails=true
Response: {
  archers: [
    {
      id: "uuid",
      name: "Sarah Johnson",
      email: "sarah.j@school.edu",
      flag_status: "incomplete",
      flag_date: null
    },
    ...
  ],
  total_count: 8,
  with_emails: 7,
  without_emails: 1
}

// Generate email list
POST /v1/status-flags/generate-email
Body: {
  season_year: "2024-2025",
  flag_name: "physical",
  archer_ids: ["uuid1", "uuid2", "uuid3"],
  template: "default" // or "custom"
}
Response: {
  mailto_link: "mailto:?bcc=email1@example.com,email2@example.com&subject=...&body=...",
  recipient_count: 3,
  missing_emails: ["uuid4"] // archers without email addresses
}
```

#### 1.7.5 School Email Configuration

**Configuration Options:**
- Store school email address in coach settings/config
- Use coach's authenticated email (if available)
- Allow manual email address entry per session
- Support for multiple school email addresses (select which to use)

**Implementation:**
- Add `school_email` field to coach configuration
- Store in localStorage or database (coach settings table)
- Default to coach's device email if school email not configured

---

## 🎯 Feature 2: Enhanced Notes System

### 2.1 Overview

The current notes system uses three simple text fields (`notesGear`, `notesCurrent`, `notesArchive`). This enhancement adds:
- Editable topics/categories for notes
- Global notes for batch operations
- Formatted note history display (Markdown/HTML support)

### 2.2 Current State Analysis

**Current Implementation:**
- Three text fields in `archers` table: `notes_gear`, `notes_current`, `notes_archive`
- Simple text storage (no formatting)
- "Move to History" functionality exists in `archer_list.html`
- No topic/category system
- No batch note operations

**Limitations:**
- Cannot categorize notes by topic
- Cannot apply same note to multiple archers easily
- No rich text formatting support
- History display is plain text only

### 2.3 Enhanced Data Model

#### Option A: Enhanced Archer Notes (Additive)

Keep existing fields, add new structured notes table:

```sql
-- New structured notes table
CREATE TABLE IF NOT EXISTS archer_notes (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  archer_id CHAR(36) NOT NULL COMMENT 'Target archer',
  
  -- Note content
  topic VARCHAR(100) NOT NULL COMMENT 'Editable topic/category (e.g., "Equipment", "Technique", "Goals")',
  note_text TEXT NOT NULL COMMENT 'Note content (supports Markdown)',
  note_format VARCHAR(10) DEFAULT 'text' COMMENT 'text, markdown, html',
  
  -- Context
  season_year VARCHAR(10) NULL COMMENT 'Optional: season context',
  event_id CHAR(36) NULL COMMENT 'Optional: event context',
  round_id CHAR(36) NULL COMMENT 'Optional: round context',
  
  -- Metadata
  is_global BOOLEAN DEFAULT 0 COMMENT 'If true, can be applied to multiple archers',
  global_note_id CHAR(36) NULL COMMENT 'If part of global note batch, reference parent',
  created_by VARCHAR(100) NULL COMMENT 'Coach/device identifier',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_archer (archer_id),
  KEY idx_topic (topic),
  KEY idx_global (global_note_id),
  KEY idx_created (created_at DESC),
  KEY idx_archer_created (archer_id, created_at DESC),
  CONSTRAINT fk_an_archer FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE CASCADE,
  CONSTRAINT fk_an_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  CONSTRAINT fk_an_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Global notes template table (for batch operations)
CREATE TABLE IF NOT EXISTS global_notes (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  topic VARCHAR(100) NOT NULL,
  note_text TEXT NOT NULL,
  note_format VARCHAR(10) DEFAULT 'text',
  created_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_topic (topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### Option B: Migration Path (Backward Compatible)

Keep existing `notes_current` and `notes_archive` fields, migrate to new system gradually:

1. New notes go to `archer_notes` table
2. Old notes remain in `notes_current`/`notes_archive` (read-only)
3. Option to migrate old notes to new system
4. Eventually deprecate old fields

### 2.4 User Interface Enhancements

#### 2.4.1 Note Creation with Topics

**Location:** `archer_list.html` - Enhanced notes section

**Features:**
- **Topic Dropdown/Input** - Select existing topic or create new
- **Topic Management** - List of common topics (Equipment, Technique, Goals, Safety, etc.)
- **Format Selector** - Choose text, Markdown, or HTML
- **Preview** - Live preview for Markdown/HTML notes

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ Add Note                                                │
├─────────────────────────────────────────────────────────┤
│ Topic: [Equipment ▼] [Manage Topics...]                │
│                                                          │
│ Format: ○ Text  ○ Markdown  ○ HTML                     │
│                                                          │
│ Note:                                                    │
│ ┌────────────────────────────────────────────────────┐ │
│ │ * Bow: 25# recurve                                │ │
│ │ * Arrows: 6x Easton X7                             │ │
│ │ * Checked out: 2024-08-25                          │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ [Preview] [Save] [Save as Global Template]              │
└─────────────────────────────────────────────────────────┘
```

#### 2.4.2 Global Notes for Batch Operations

**Location:** New section in `coach.html` or `archer_list.html`

**Features:**
- **Create Global Note** - Write once, apply to multiple archers
- **Batch Apply** - Select multiple archers, apply global note
- **Global Note Library** - Saved templates for reuse
- **Topic-based Organization** - Group global notes by topic

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ Global Notes - Batch Operations                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Create Global Note:                                      │
│ Topic: [Equipment ▼]                                    │
│ Note: [Text area...]                                    │
│ [Save as Template] [Apply to Selected Archers]         │
│                                                          │
│ Saved Templates:                                         │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Equipment - Standard Recurve Setup                 │ │
│ │ "Standard equipment package..."                     │ │
│ │ [Edit] [Apply] [Delete]                            │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ Apply to Archers:                                        │
│ [Select Archers...] [Apply Selected Template]            │
└─────────────────────────────────────────────────────────┘
```

#### 2.4.3 Enhanced Note History Display

**Location:** `archer_list.html` - Notes History section

**Features:**
- **Formatted Display** - Render Markdown/HTML notes properly
- **Topic Filtering** - Filter notes by topic
- **Chronological View** - Reverse chronological list
- **Search** - Search notes by content or topic
- **Export** - Export note history (text, Markdown, or HTML)
- **Share Notes** - Send note content via SMS or email to filtered archer list

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ Note History - Sarah Johnson                            │
├─────────────────────────────────────────────────────────┤
│ Filter: [All Topics ▼] [Search...]                      │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Equipment | Jan 15, 2025                           │ │
│ │ • Bow: 25# recurve                                │ │
│ │ • Arrows: 6x Easton X7                             │ │
│ │ • Checked out: 2024-08-25                          │ │
│ │ [Edit] [Delete]                                    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Technique | Jan 10, 2025                           │ │
│ │ **Focus Areas:**                                   │ │
│ │ 1. Follow-through consistency                      │ │
│ │ 2. Anchor point stability                          │ │
│ │ [Edit] [Delete]                                    │ │
│ └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.5 Markdown/HTML Rendering

#### 2.5.1 Markdown Support

**Supported Markdown Features:**
- **Bold** (`**text**`)
- *Italic* (`*text*`)
- Lists (ordered and unordered)
- Headers (`# Header`)
- Links (`[text](url)`)
- Code blocks (`` `code` ``)

**Implementation:**
- Use lightweight Markdown parser (e.g., `marked.js` or `marked` library)
- Sanitize HTML output for security
- Client-side rendering in note history view

#### 2.5.2 HTML Support

**Supported HTML Features:**
- Basic formatting tags (`<b>`, `<i>`, `<u>`, `<p>`, `<br>`)
- Lists (`<ul>`, `<ol>`, `<li>`)
- Links (`<a href>`)
- **Security:** Sanitize HTML to prevent XSS attacks

**Implementation:**
- Use DOMPurify or similar library for sanitization
- Whitelist allowed HTML tags
- Strip dangerous attributes (onclick, etc.)

### 2.6 API Endpoints

```javascript
// Get notes for an archer
GET /v1/archers/:id/notes?topic=Equipment&format=all
Response: {
  notes: [
    {
      id: "uuid",
      topic: "Equipment",
      note_text: "**Bow:** 25# recurve\n*Arrows:* 6x Easton X7",
      note_format: "markdown",
      created_at: "2025-01-15T10:30:00Z",
      created_by: "coach_device_id"
    },
    ...
  ]
}

// Create note
POST /v1/archers/:id/notes
Body: {
  topic: "Equipment",
  note_text: "**Bow:** 25# recurve",
  note_format: "markdown",
  is_global: false
}

// Update note
PUT /v1/notes/:id
Body: {
  topic: "Equipment",
  note_text: "Updated note text",
  note_format: "markdown"
}

// Delete note
DELETE /v1/notes/:id

// Get global notes
GET /v1/global-notes?topic=Equipment
Response: {
  global_notes: [
    {
      id: "uuid",
      topic: "Equipment",
      note_text: "Standard equipment package...",
      note_format: "text",
      created_at: "2025-01-10T09:00:00Z"
    },
    ...
  ]
}

// Create global note
POST /v1/global-notes
Body: {
  topic: "Equipment",
  note_text: "Standard equipment package...",
  note_format: "text"
}

// Apply global note to archers
POST /v1/global-notes/:id/apply
Body: {
  archer_ids: ["uuid1", "uuid2", "uuid3"]
}

// Get topics list
GET /v1/notes/topics
Response: {
  topics: ["Equipment", "Technique", "Goals", "Safety", ...]
}
```

### 2.7 Note Sharing (SMS/Email)

#### 2.7.1 Overview

Coaches need to share note content with archers via SMS or email. This feature allows filtering the archer list and sending note contents via the device's native SMS or email client.

#### 2.7.2 User Interface

**Location:** Note History Display or Archer List - Add "Share Note" button

**Workflow:**
1. Coach views note (or selects note from history)
2. Coach clicks "Share Note" button
3. System shows filtered archer list (or coach can filter/search)
4. Coach selects target archers
5. Coach chooses delivery method: SMS or Email
6. System opens native SMS/Email client with:
   - **Recipients:** Selected archer phone numbers (SMS) or email addresses
   - **Message/Body:** Note content (formatted as plain text, stripped of Markdown/HTML)
   - **Subject:** (Email only) Note topic and date

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ Share Note - Equipment Note (Jan 15, 2025)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Note Content:                                            │
│ ┌────────────────────────────────────────────────────┐ │
│ │ • Bow: 25# recurve                                │ │
│ │ • Arrows: 6x Easton X7                             │ │
│ │ • Checked out: 2024-08-25                          │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ Select Archers:                                          │
│ Filter: [All Archers ▼] [Search...]                      │
│                                                          │
│ ☑ Sarah Johnson (sarah.j@school.edu, 555-1234)         │
│ ☑ Mike Chen (mike.c@school.edu, 555-5678)              │
│ ☐ Alex Rivera (alex.r@school.edu, 555-9012)            │
│                                                          │
│ [Select All] [Deselect All]                             │
│                                                          │
│ Delivery Method:                                         │
│ ○ SMS (Text Message)  ● Email                           │
│                                                          │
│ [Send via SMS] [Send via Email] [Cancel]                │
└─────────────────────────────────────────────────────────┘
```

#### 2.7.3 SMS Integration

**Implementation:**
- Use `sms:` protocol for SMS links
- Format: `sms:+15551234567?body=Note%20content`
- For multiple recipients: Create individual SMS links (most phones don't support multiple recipients in one SMS)
- Strip Markdown/HTML formatting, convert to plain text
- Limit message length (SMS has 160 character limit, may need to truncate or split)

**SMS Format:**
```
Subject: [Note Topic] - [Date]

[Note Content - Plain Text]

Sent from WDV Archery Coach Tools
```

**Limitations:**
- SMS requires phone numbers (not all archers may have phone numbers)
- Character limit considerations
- Multiple recipients require individual messages

#### 2.7.4 Email Integration

**Implementation:**
- Use `mailto:` protocol for email links
- Format: `mailto:email1@example.com,email2@example.com?subject=...&body=...`
- Use BCC for privacy (hide recipient list)
- Convert Markdown/HTML to plain text for email body (or include both plain and HTML versions)
- Support for longer messages (no character limit)

**Email Format:**
```
To: [BCC: All selected archer emails]
Subject: [Note Topic] - [Date]

[Note Content - Plain Text or HTML]

---
Sent from WDV Archery Coach Tools
```

#### 2.7.5 Content Formatting

**Plain Text Conversion:**
- Strip Markdown syntax (convert `**bold**` to `bold`, `*item*` to `- item`)
- Strip HTML tags
- Preserve line breaks and basic formatting
- Limit length for SMS (truncate with "..." if needed)

**Example Conversion:**
```
Markdown Input:
**Focus Areas:**
1. Follow-through consistency
2. Anchor point stability

Plain Text Output:
Focus Areas:
1. Follow-through consistency
2. Anchor point stability
```

#### 2.7.6 API Endpoints

```javascript
// Get archers with contact info for note sharing
GET /v1/archers/contacts?filter=active&include_phone=true&include_email=true
Response: {
  archers: [
    {
      id: "uuid",
      name: "Sarah Johnson",
      email: "sarah.j@school.edu",
      phone: "+15551234567"
    },
    ...
  ]
}

// Generate SMS link for note
POST /v1/notes/:id/generate-sms
Body: {
  archer_ids: ["uuid1", "uuid2"],
  format: "plain" // or "markdown"
}
Response: {
  sms_links: [
    "sms:+15551234567?body=Note%20content...",
    "sms:+15555678901?body=Note%20content..."
  ],
  missing_phones: ["uuid3"] // archers without phone numbers
}

// Generate email link for note
POST /v1/notes/:id/generate-email
Body: {
  archer_ids: ["uuid1", "uuid2"],
  format: "plain" // or "html"
}
Response: {
  mailto_link: "mailto:?bcc=email1@example.com,email2@example.com&subject=...&body=...",
  recipient_count: 2,
  missing_emails: ["uuid3"] // archers without email addresses
}
```

#### 2.7.7 Privacy & Security

**Privacy Considerations:**
- Use BCC for email (hide recipient list)
- SMS requires individual messages (no group SMS)
- Coach can review recipient list before sending
- Only send to archers with valid contact information
- Warn coach if some archers don't have contact info

**Security:**
- Validate phone numbers and email addresses
- Sanitize note content before sending
- Limit message length to prevent abuse
- Log sharing actions for audit trail

### 2.8 Dashboard Embeds/Widgets

#### 2.8.1 Overview

The notes system with topics enables dashboard embeds/widgets that display filtered notes in different contexts. Each embed can have its own filter criteria, allowing coaches to create customized views for different purposes (e.g., "Coach Comments" widget, "Achievements" widget).

#### 2.8.2 Use Cases

**Example Use Cases:**
- **Coach Comments Widget:** Display all notes with topic "Coach Comment" for a specific archer or team
- **Achievements Widget:** Display all notes with topic "Achievement" to celebrate milestones
- **Equipment Notes Widget:** Display all "Equipment" notes for quick reference
- **Technique Feedback Widget:** Display all "Technique" notes for coaching sessions

**Key Benefits:**
- **Flexible Filtering:** Each embed can filter by topic, archer, date range, season, etc.
- **Reusable Components:** Same note data, different views
- **Customizable Display:** Each embed can have its own styling and layout
- **Real-time Updates:** Notes appear in embeds as they're created

#### 2.8.3 Embed Configuration

**Filter Criteria Options:**
- **Topic Filter:** Single topic (e.g., "Coach Comment") or multiple topics
- **Archer Filter:** Single archer, multiple archers, or all archers
- **Date Range:** Recent notes (last 7 days, last 30 days, this season, etc.)
- **Season Filter:** Filter by season/year
- **Event/Round Context:** Filter by specific event or round
- **Sort Order:** Chronological (newest first/oldest first), by archer, by topic

**Display Options:**
- **Card Layout:** Individual note cards with topic, date, content
- **List Layout:** Compact list view with topic badges
- **Timeline Layout:** Chronological timeline view
- **Grouped Layout:** Group by archer, topic, or date

#### 2.8.4 Implementation

**Embed Structure:**
```html
<!-- Example: Coach Comments Widget -->
<div class="notes-embed" 
     data-embed-id="coach-comments-widget"
     data-filter-topic="Coach Comment"
     data-filter-archer="all"
     data-filter-date-range="last-30-days"
     data-layout="card"
     data-sort="newest-first">
  <!-- Notes will be loaded and rendered here -->
</div>

<!-- Example: Achievements Widget -->
<div class="notes-embed" 
     data-embed-id="achievements-widget"
     data-filter-topic="Achievement"
     data-filter-archer="all"
     data-filter-date-range="this-season"
     data-layout="timeline"
     data-sort="newest-first">
  <!-- Notes will be loaded and rendered here -->
</div>
```

**JavaScript API:**
```javascript
// Initialize embed
const embed = NotesEmbed.init(containerElement, {
  embedId: "coach-comments-widget",
  filters: {
    topic: "Coach Comment",        // or ["Coach Comment", "Feedback"]
    archer: "all",                  // or "uuid" or ["uuid1", "uuid2"]
    dateRange: "last-30-days",     // or "this-season", "all-time", custom range
    season: "2024-2025",            // optional
    eventId: null,                  // optional
    roundId: null                   // optional
  },
  display: {
    layout: "card",                 // "card", "list", "timeline", "grouped"
    sort: "newest-first",           // "newest-first", "oldest-first", "by-archer", "by-topic"
    limit: 10,                      // optional: limit number of notes
    showArcherName: true,           // show archer name in display
    showTopic: true,                // show topic badge
    showDate: true,                 // show creation date
    format: "rendered"              // "rendered" (Markdown/HTML) or "plain"
  },
  refresh: {
    auto: false,                    // auto-refresh enabled
    interval: 30000                 // refresh interval in ms (if auto=true)
  }
});

// Manual refresh
embed.refresh();

// Update filters
embed.updateFilters({
  topic: "Achievement",
  dateRange: "this-season"
});
```

#### 2.8.5 API Endpoints for Embeds

```javascript
// Get notes for embed (with filtering)
GET /v1/notes/embed?topic=Coach Comment&archer=all&date_range=last-30-days&limit=10&sort=newest-first
Response: {
  notes: [
    {
      id: "uuid",
      archer_id: "uuid",
      archer_name: "Sarah Johnson",
      topic: "Coach Comment",
      note_text: "Great improvement on follow-through!",
      note_format: "markdown",
      created_at: "2025-01-15T10:30:00Z",
      created_by: "coach_device_id"
    },
    ...
  ],
  total_count: 25,
  filtered_count: 10,
  filters_applied: {
    topic: "Coach Comment",
    archer: "all",
    date_range: "last-30-days"
  }
}

// Get embed configuration
GET /v1/notes/embed/:embedId/config
Response: {
  embedId: "coach-comments-widget",
  filters: { ... },
  display: { ... },
  refresh: { ... }
}

// Save embed configuration
POST /v1/notes/embed/:embedId/config
Body: {
  filters: { ... },
  display: { ... },
  refresh: { ... }
}
```

#### 2.8.6 UI Examples

**Coach Comments Widget:**
```
┌─────────────────────────────────────────────────────────┐
│ Coach Comments (Last 30 Days)                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Sarah Johnson | Jan 15, 2025                      │ │
│ │ Great improvement on follow-through!              │ │
│ │ Keep focusing on anchor point stability.          │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Mike Chen | Jan 14, 2025                          │ │
│ │ Excellent form today. Work on release timing.     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ [View All] [Refresh]                                    │
└─────────────────────────────────────────────────────────┘
```

**Achievements Widget:**
```
┌─────────────────────────────────────────────────────────┐
│ Achievements (This Season)                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🏆 Sarah Johnson | Jan 10, 2025                  │ │
│ │ **Personal Best:** 285/300 in Ranking Round!      │ │
│ │ First time breaking 280!                          │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🎯 Mike Chen | Dec 20, 2024                       │ │
│ │ **Milestone:** 100th competition round completed! │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ [View All] [Refresh]                                    │
└─────────────────────────────────────────────────────────┘
```

#### 2.8.7 Integration Points

**Where Embeds Can Be Used:**
- **Coach Dashboard:** Multiple embeds showing different note categories
- **Archer Profile Page:** Show notes specific to that archer
- **Event Dashboard:** Show notes related to specific events
- **Team Page:** Show notes for all team members
- **Custom Dashboards:** Coaches can create custom dashboard layouts

**Embed Placement:**
- Can be embedded in any HTML page
- Self-contained JavaScript component
- Responsive design (mobile-first)
- Dark mode support
- Auto-refresh capability

#### 2.8.8 Topic Recommendations

**Suggested Topics for Dashboard Embeds:**
- **Coach Comment** - General coaching feedback and observations
- **Achievement** - Milestones, personal bests, accomplishments
- **Equipment** - Equipment notes and checkout information
- **Technique** - Technique feedback and improvement areas
- **Goals** - Goal setting and progress tracking
- **Safety** - Safety-related notes and reminders
- **Attendance** - Attendance notes and patterns

**Topic Management:**
- Topics are editable (coaches can create custom topics)
- Topics can be used for filtering in embeds
- Topics can be combined (e.g., show "Coach Comment" OR "Achievement")
- Topics can be excluded (e.g., show all EXCEPT "Equipment")

### 2.9 Migration Strategy

**Phase 1: Additive (No Breaking Changes)**
- Add new `archer_notes` table
- Keep existing `notes_current`/`notes_archive` fields
- New notes go to new table
- Old notes remain accessible

**Phase 2: Migration Tool**
- Create migration script to move old notes to new system
- Coach can choose to migrate per archer or bulk
- Preserve timestamps and content

**Phase 3: Deprecation (Future)**
- Mark old fields as deprecated
- Eventually remove old fields (after migration period)

---

## 🔧 Implementation Plan

### Phase 1: Status Flags Tracking (Priority: High)

**Estimated Effort:** 16-20 hours

1. **Database Schema** (2 hours)
   - Create `archer_status_flags` table
   - Migration script
   - Test data setup

2. **API Endpoints** (4 hours)
   - CRUD endpoints for status flags
   - Bulk update endpoint
   - Compliance report endpoint
   - Email generation endpoint

3. **Frontend UI** (6-8 hours)
   - Status flags section in `coach.html`
   - Status indicators in `archer_list.html`
   - Bulk operations interface
   - Compliance dashboard
   - Email integration UI (filter, select, send)

4. **Email Integration** (2-3 hours)
   - Email template system
   - Gmail/mailto link generation
   - School email configuration
   - Privacy (BCC) implementation

5. **Testing** (2 hours)
   - Unit tests for API
   - E2E tests for UI
   - Email integration testing
   - Manual testing checklist

### Phase 2: Enhanced Notes System (Priority: Medium)

**Estimated Effort:** 24-30 hours

1. **Database Schema** (2 hours)
   - Create `archer_notes` table
   - Create `global_notes` table
   - Migration planning

2. **API Endpoints** (4 hours)
   - CRUD endpoints for notes
   - Global notes endpoints
   - Batch apply endpoint
   - Topics management
   - Note sharing endpoints (SMS/Email)

3. **Markdown/HTML Rendering** (3-4 hours)
   - Integrate Markdown parser
   - HTML sanitization
   - Preview functionality

4. **Frontend UI** (6-8 hours)
   - Enhanced note creation form
   - Topic management
   - Global notes interface
   - Formatted note history display
   - Batch operations UI
   - Note sharing UI (SMS/Email)

5. **Note Sharing Integration** (3-4 hours)
   - SMS link generation
   - Email link generation
   - Content formatting (Markdown/HTML to plain text)
   - Native client integration (SMS/Email apps)
   - Privacy and security implementation

6. **Dashboard Embeds/Widgets** (4-6 hours)
   - Embed JavaScript component
   - Filter API endpoints
   - Embed configuration system
   - Multiple layout options (card, list, timeline, grouped)
   - Auto-refresh functionality
   - Responsive design and dark mode support

6. **Testing** (2 hours)
   - Unit tests
   - E2E tests
   - Security testing (XSS prevention)
   - SMS/Email integration testing

### Phase 3: Integration & Polish (Priority: Low)

**Estimated Effort:** 4-6 hours

1. **Integration**
   - Link status flags to notes (optional)
   - Cross-reference features
   - Export functionality

2. **Documentation**
   - User guide
   - API documentation
   - Migration guide

3. **Performance Optimization**
   - Index optimization
   - Caching strategies
   - Query optimization

---

## 🎯 Success Criteria

### Status Flags Tracking

- ✅ Coaches can track all 5 mandatory milestones per archer
- ✅ Status flags are organized by season/year (one entry per archer per season)
- ✅ Bulk operations allow efficient updates
- ✅ Compliance dashboard shows team-wide status
- ✅ Export functionality for reports
- ✅ Email integration: Filter by incomplete flags, generate email list, open Gmail with pre-filled recipients
- ✅ Email templates with customizable subject/body
- ✅ Privacy protection (BCC for email recipients)
- ✅ Mobile-friendly interface (99% phone usage)

### Enhanced Notes System

- ✅ Notes can be categorized by editable topics
- ✅ Global notes can be applied to multiple archers
- ✅ Note history displays Markdown/HTML formatting
- ✅ Backward compatible with existing notes
- ✅ Search and filter functionality
- ✅ Note sharing: Filter archer list and send note content via SMS or email
- ✅ Content formatting: Markdown/HTML converted to plain text for sharing
- ✅ Native client integration (SMS/Email apps on device)
- ✅ Privacy protection (BCC for email, individual SMS messages)
- ✅ Dashboard embeds/widgets: Display notes with different filter criteria (topic, archer, date range, etc.)
- ✅ Reusable embed components: Same note data, different views (Coach Comments, Achievements, etc.)
- ✅ Customizable embed configurations: Each embed can have its own filters and display options
- ✅ Mobile-friendly interface (99% phone usage)

---

## 🚨 Open Questions

### Status Flags

1. **Season Definition:** How is a "season" defined? (School year? Calendar year? Custom range?)
2. **Auto-Reset:** Should status flags auto-reset at start of new season, or manual?
3. **Notifications:** Should coaches receive alerts for incomplete flags? (Future feature)
4. **Custom Flags:** Should coaches be able to add custom status flags beyond the 5 mandatory?
5. **Historical Data:** How long should historical status flag data be retained?
6. **Data Model:** ✅ **RESOLVED** - One entry per archer per season/year (UNIQUE KEY ensures no duplicates). Multiple entries exist if tracking multiple years/seasons, but typically one active entry per archer per season.
7. **Email Integration:** School email configuration - where should school email be stored? (Coach settings, config file, or manual entry?)
8. **Email Templates:** Should email templates be customizable per coach, or shared system-wide?

### Enhanced Notes

1. **Topic Management:** Who can create/edit topics? (Coaches only? Shared across coaches?)
2. **Note Privacy:** Should notes be private (coach-only) or visible to archers? (Future feature)
3. **Note Limits:** Should there be limits on note length or number of notes per archer?
4. **Migration:** Should old notes be automatically migrated, or manual migration only?
5. **Rich Text Editor:** Should we include a WYSIWYG editor, or stick with Markdown/HTML?
6. **SMS/Email Sharing:** Should there be limits on how many archers can receive a shared note at once?
7. **Contact Information:** What happens if an archer doesn't have a phone number or email address? (Show warning, skip, or allow manual entry?)
8. **Message Formatting:** For SMS, should long notes be automatically truncated, split into multiple messages, or shown as preview with option to edit?
9. **Dashboard Embeds:** ✅ **RESOLVED** - Yes, notes can be used for "Coach Comment" and "Achievement" topics to display in different embeds on a dashboard. Each embed can have different filter criteria (topic, archer, date range, etc.).
10. **Embed Configuration:** Should embed configurations be saved per coach, or shared system-wide?
11. **Embed Performance:** Should embeds cache data locally, or always fetch fresh from API?

---

## 📚 Related Documentation

- [ARCHER_MANAGEMENT.md](../archer-management/ARCHER_MANAGEMENT.md) - Current archer management system
- [COACH_COMMENTARY_MEDIA_INTEGRATION_EVALUATION.md](../../analysis/COACH_COMMENTARY_MEDIA_INTEGRATION_EVALUATION.md) - Related notes/media features
- [Feature_ArcherProfile.md](../../planning/Feature_ArcherProfile.md) - Archer profile features
- [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](../../core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) - System architecture

---

## 📝 Next Steps

1. **Review & Approval** - Review this document with stakeholders
2. **Answer Open Questions** - Resolve open questions before implementation
3. **Prioritize Features** - Decide which feature to implement first
4. **Create Detailed Specs** - Break down into smaller implementation tasks
5. **Begin Implementation** - Start with Phase 1 (Status Flags) or Phase 2 (Notes)

---

**Document Owner:** Development Team  
**Last Updated:** January 21, 2025  
**Status:** Planning - Awaiting Review

