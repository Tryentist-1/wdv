# QR Code Event Access System

## Overview

Archers can now access their event and bale assignments via QR code! This eliminates the need for authentication and provides instant access to pre-assigned scoring groups.

## Coach Workflow

### 1. Upload Archer CSV (Rarely Done)
- Go to **Archer Setup**
- Import CSV with archer roster
- Sync to database

### 2. Create Event with Entry Code

When creating an event, coaches are prompted for:
- **Event Name**: e.g., "Fall Tournament"
- **Entry Code**: e.g., "FALL2024" (used for QR code access)
- **Event Date**: Auto-populated with today
- **Auto-assign**: Choose whether to auto-assign archers to bales

Example:
```
Event Name: Fall Tournament
Entry Code: FALL2024
Date: 2025-10-07
Status: Planned → Active
```

### 3. Generate QR Code

After creating the event, coaches can generate a QR code using:

**QR Code URL Format:**
```
https://tryentist.com/wdv/ranking_round_300.html?event=EVENT_ID&code=ENTRY_CODE
```

**Example:**
```
https://tryentist.com/wdv/ranking_round_300.html?event=a1b2c3d4&code=FALL2024
```

Use any QR code generator (https://www.qr-code-generator.com/) to create a QR code from this URL.

### 4. Print and Post QR Code

Print the QR code and post it at the event location. Archers scan it to access their assignments.

### 5. Update Event Status

- **Planned**: Event is scheduled but not yet active
- **Active**: Archers can score
- **Completed**: Event is finished

## Archer Workflow

### Option 1: Scan QR Code (Recommended)
1. **Scan QR code** at event location
2. **App verifies entry code** automatically
3. **Archer list loads** with bale assignments grouped by bale number
4. **Click on bale or archer** → loads entire bale group
5. **Click "Begin Scoring"** → start tracking scores

### Option 2: Manual Event Selection
1. **Open Ranking Round app**
2. **Select event** from dropdown
3. **Browse archer list** grouped by bale
4. **Click on bale or archer** → loads entire bale group
5. **Click "Begin Scoring"** → start tracking scores

## Technical Details

### Database Schema

```sql
ALTER TABLE events 
ADD COLUMN entry_code VARCHAR(20) NULL 
  COMMENT 'Optional entry code for archer access (e.g., for QR codes)';

ADD INDEX idx_events_entry_code (entry_code);
```

### API Endpoints

#### Verify Entry Code (PUBLIC)
```
POST /v1/events/verify
{
  "eventId": "a1b2c3d4",
  "entryCode": "FALL2024"
}

Response:
{
  "verified": true,
  "event": {
    "id": "a1b2c3d4",
    "name": "Fall Tournament",
    "date": "2025-10-07",
    "status": "Active"
  }
}
```

#### Get Event Snapshot (PUBLIC)
```
GET /v1/events/{eventId}/snapshot

Response:
{
  "snapshot": {
    "event": { ... },
    "divisions": {
      "BVAR": {
        "archers": [
          {
            "first_name": "John",
            "last_name": "Smith",
            "bale": 1,
            "target": "A",
            ...
          }
        ]
      }
    }
  }
}
```

### URL Parameters

- `event`: Event ID (UUID)
- `code`: Entry code (case-insensitive)

Example: `ranking_round_300.html?event=abc123&code=FALL2024`

## Security

- **Entry codes are case-insensitive** for ease of use
- **Entry codes are NOT returned** in public event lists
- **Entry code verification** is required to access event data
- **Score submission** still uses LiveUpdates API (if enabled)
- **Event creation/deletion** requires authentication (coach only)

## Benefits

✅ **No authentication needed** for archers
✅ **Instant access** via QR code scan
✅ **Pre-loaded assignments** reduce setup time
✅ **Simplified workflow** for archers
✅ **Printable QR codes** for event signage
✅ **Works offline** after initial load

## Example Use Case

**Tournament Day:**
1. Coach creates "Fall Tournament" with code "FALL2024"
2. Coach generates QR code: `ranking_round_300.html?event=xyz789&code=FALL2024`
3. Coach prints QR code and posts at check-in
4. Archers scan QR code → instantly see their bale assignments
5. Archers click on their bale → ready to score!

## Migration

To add the entry_code column to existing databases:

```bash
cd /Users/terry/web-mirrors/tryentist/wdv/api/sql
# Run migration_add_entry_code.sql on your database
```

Or manually:
```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS entry_code VARCHAR(20) NULL;
ALTER TABLE events ADD INDEX IF NOT EXISTS idx_events_entry_code (entry_code);
```
