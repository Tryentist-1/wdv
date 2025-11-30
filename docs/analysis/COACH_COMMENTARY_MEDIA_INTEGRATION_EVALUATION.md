# Coach Commentary Module with Google Photos & YouTube Integration - Evaluation

**Date:** December 2025  
**Status:** 📋 Evaluation & Planning  
**Purpose:** Evaluate integration approaches for Google Photos and YouTube links in a new coach commentary module

---

## Executive Summary

This document evaluates how to integrate Google Photos and YouTube links into a new coach commentary module for the WDV Archery Score Management Suite. The module will allow coaches to add text commentary with embedded media links to provide visual feedback to archers.

**Key Findings:**
- ✅ **Database Schema:** Extend existing `coach_notes` concept (from roadmap) with media link fields
- ✅ **API Design:** Follow existing REST patterns with new `/v1/coach-commentary` endpoints
- ✅ **Google Photos:** Use shareable link format (no OAuth required for basic implementation)
- ✅ **YouTube:** Use standard embed URLs (no API key required for basic embedding)
- ✅ **Mobile-First:** Optimize for 99% phone usage with responsive media previews
- ⚠️ **Security:** Validate URLs, sanitize inputs, consider link expiration for Google Photos

---

## 1. Current Architecture Context

### 1.1 Existing Patterns

**Database:**
- MySQL backend with UUID primary keys
- RESTful API via `/api/v1/*` endpoints
- Authentication via `X-API-Key` (coach) or `X-Passcode` (event code)
- 3-tier storage: Database (source of truth) → localStorage (cache) → Cookies (persistence)

**UI Framework:**
- Tailwind CSS (100% migrated in v1.6.0)
- Mobile-first design (99% phone usage)
- Dark mode support
- Shared components (ArcherSelector, ScorecardView, etc.)

**API Patterns:**
- All endpoints follow consistent REST patterns
- JSON request/response format
- UUID-based IDs (not sequential numbers)
- Proper error handling with HTTP status codes

### 1.2 Related Features

**Existing Notes System:**
- `archers.notes_current` - Current notes (text only)
- `archers.notes_archive` - Historical notes (text only)
- "Move to History" functionality in archer_list.html

**Planned Coach Notes (Phase 3):**
- `coach_notes` table concept from FUTURE_VISION_AND_ROADMAP.md
- Per-archer notes (private or shared)
- Per-round feedback
- Technique observations

**Media Handling:**
- `archers.photo_url` - Archer profile photos (VARCHAR(255))
- No existing media link storage for commentary

---

## 2. Database Schema Design

### 2.1 Proposed Table: `coach_commentary`

```sql
CREATE TABLE IF NOT EXISTS coach_commentary (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  archer_id CHAR(36) NOT NULL COMMENT 'Target archer',
  round_id CHAR(36) NULL COMMENT 'Optional: specific round context',
  event_id CHAR(36) NULL COMMENT 'Optional: event context',
  coach_id VARCHAR(100) NULL COMMENT 'Future: multi-coach support (device ID or name)',
  
  -- Text content
  comment_text TEXT NOT NULL COMMENT 'Main commentary text',
  comment_type VARCHAR(20) DEFAULT 'general' COMMENT 'general, technique, goal, milestone, feedback',
  
  -- Media links
  google_photos_url VARCHAR(500) NULL COMMENT 'Shareable Google Photos link',
  youtube_url VARCHAR(500) NULL COMMENT 'YouTube video URL or embed link',
  media_thumbnail_url VARCHAR(500) NULL COMMENT 'Cached thumbnail for preview',
  
  -- Metadata
  is_private BOOLEAN DEFAULT true COMMENT 'Private (coach only) or visible to archer',
  is_pinned BOOLEAN DEFAULT false COMMENT 'Pin to top of commentary list',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_archer (archer_id),
  KEY idx_round (round_id),
  KEY idx_event (event_id),
  KEY idx_created (created_at DESC),
  KEY idx_archer_created (archer_id, created_at DESC),
  CONSTRAINT fk_cc_archer FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE SET NULL,
  CONSTRAINT fk_cc_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 Schema Considerations

**Why Separate Table vs. Extending `archers.notes_current`?**
- ✅ Better query performance (indexed by archer, date, type)
- ✅ Supports multiple commentary entries per archer
- ✅ Links to specific rounds/events for context
- ✅ Media links need separate storage (not just text)
- ✅ Future: threading, replies, reactions

**Field Sizing:**
- `google_photos_url` / `youtube_url`: VARCHAR(500) - Google Photos shareable links can be long
- `comment_text`: TEXT - Supports longer commentary
- `media_thumbnail_url`: VARCHAR(500) - Cached thumbnail for performance

**Indexes:**
- `idx_archer_created` - Most common query: "Get all commentary for archer, newest first"
- `idx_round` - "Get all commentary for this round"
- `idx_event` - "Get all commentary for this event"

---

## 3. Google Photos Integration

### 3.1 Link Format Options

**Option 1: Shareable Link (Recommended for MVP)**
```
https://photos.app.goo.gl/[SHARE_ID]
```
- ✅ No OAuth required
- ✅ No API key needed
- ✅ Works with any Google account
- ⚠️ Link may expire if sharing settings change
- ⚠️ Cannot extract thumbnail programmatically (without API)

**Option 2: Direct Photo Link**
```
https://lh3.googleusercontent.com/[PHOTO_ID]=w[WIDTH]-h[HEIGHT]
```
- ✅ Direct image access
- ✅ Can specify dimensions
- ⚠️ Requires extracting from shareable link
- ⚠️ May break if photo permissions change

**Option 3: Google Photos API (Future Enhancement)**
- Requires OAuth 2.0 setup
- Can fetch thumbnails, metadata
- More robust but adds complexity
- Consider for Phase 3+ if needed

### 3.2 Implementation Approach

**MVP (Phase 3 Initial):**
1. Coach pastes shareable Google Photos link
2. Store link in `google_photos_url` field
3. Display as clickable link that opens in new tab
4. Optional: Extract photo ID and generate thumbnail URL

**Validation:**
```javascript
function validateGooglePhotosUrl(url) {
  // Accept shareable links
  if (url.match(/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com\/share\/)/)) {
    return true;
  }
  // Accept direct image links
  if (url.match(/^https:\/\/lh3\.googleusercontent\.com\//)) {
    return true;
  }
  return false;
}
```

**Display:**
- Mobile: Show thumbnail preview (if available) or link icon
- Click opens in new tab (Google Photos handles authentication)
- Fallback: Show link text if preview fails

### 3.3 Security Considerations

- ✅ Validate URL format (prevent XSS)
- ✅ Sanitize URLs before storage
- ⚠️ Link expiration: Coach may need to update links if they expire
- ⚠️ Privacy: Ensure coach understands sharing permissions
- ✅ No sensitive data in URLs (just photo IDs)

---

## 4. YouTube Integration

### 4.1 Link Format Options

**Option 1: Standard YouTube URL (Recommended)**
```
https://www.youtube.com/watch?v=[VIDEO_ID]
https://youtu.be/[VIDEO_ID]
```
- ✅ No API key required for embedding
- ✅ Works with standard iframe embed
- ✅ Can extract thumbnail: `https://img.youtube.com/vi/[VIDEO_ID]/maxresdefault.jpg`

**Option 2: YouTube Embed URL**
```
https://www.youtube.com/embed/[VIDEO_ID]
```
- ✅ Direct embed format
- ✅ Can add parameters: `?autoplay=0&controls=1`

**Option 3: YouTube Shorts**
```
https://www.youtube.com/shorts/[VIDEO_ID]
```
- ✅ Same video ID format
- ✅ Can convert to standard embed

### 4.2 Implementation Approach

**MVP (Phase 3 Initial):**
1. Coach pastes YouTube URL (any format)
2. Extract video ID from URL
3. Store normalized URL in `youtube_url` field
4. Display embedded player (responsive iframe)
5. Cache thumbnail URL in `media_thumbnail_url`

**URL Parsing:**
```javascript
function extractYouTubeVideoId(url) {
  // Standard: https://www.youtube.com/watch?v=VIDEO_ID
  let match = url.match(/[?&]v=([^&]+)/);
  if (match) return match[1];
  
  // Short: https://youtu.be/VIDEO_ID
  match = url.match(/youtu\.be\/([^?&]+)/);
  if (match) return match[1];
  
  // Embed: https://www.youtube.com/embed/VIDEO_ID
  match = url.match(/embed\/([^?&]+)/);
  if (match) return match[1];
  
  // Shorts: https://www.youtube.com/shorts/VIDEO_ID
  match = url.match(/shorts\/([^?&]+)/);
  if (match) return match[1];
  
  return null;
}

function normalizeYouTubeUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}`;
}

function getYouTubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
```

**Display:**
- Mobile: Responsive iframe (16:9 aspect ratio)
- Thumbnail preview before clicking
- Click to play (autoplay disabled for mobile data savings)

### 4.3 Security Considerations

- ✅ Validate video ID format (alphanumeric, 11 chars)
- ✅ Sanitize URLs before storage
- ✅ Use `sandbox` attribute on iframe for additional security
- ✅ No API key needed (public videos only)
- ⚠️ Private/unlisted videos: May not be accessible to archers

---

## 5. API Design

### 5.1 Endpoints

**Create Commentary:**
```
POST /v1/coach-commentary
```
**Auth:** Required (Coach API Key)

**Request:**
```json
{
  "archerId": "uuid",
  "roundId": "uuid (optional)",
  "eventId": "uuid (optional)",
  "commentText": "Great improvement on follow-through!",
  "commentType": "technique",
  "googlePhotosUrl": "https://photos.app.goo.gl/...",
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "isPrivate": false,
  "isPinned": false
}
```

**Response:** `201 Created`
```json
{
  "commentaryId": "uuid",
  "createdAt": "2025-12-01T10:30:00Z",
  "mediaThumbnailUrl": "https://img.youtube.com/vi/.../maxresdefault.jpg"
}
```

**Get Commentary for Archer:**
```
GET /v1/coach-commentary?archerId={uuid}&includePrivate=true
```
**Auth:** Required (Coach for private, Archer can see public)

**Response:** `200 OK`
```json
{
  "commentary": [
    {
      "id": "uuid",
      "archerId": "uuid",
      "roundId": "uuid",
      "eventId": "uuid",
      "commentText": "Great improvement!",
      "commentType": "technique",
      "googlePhotosUrl": "https://photos.app.goo.gl/...",
      "youtubeUrl": "https://www.youtube.com/embed/...",
      "mediaThumbnailUrl": "https://img.youtube.com/vi/.../maxresdefault.jpg",
      "isPrivate": false,
      "isPinned": true,
      "createdAt": "2025-12-01T10:30:00Z",
      "updatedAt": null
    }
  ],
  "total": 1
}
```

**Update Commentary:**
```
PATCH /v1/coach-commentary/{commentaryId}
```
**Auth:** Required (Coach API Key)

**Request:**
```json
{
  "commentText": "Updated comment",
  "isPinned": true
}
```

**Delete Commentary:**
```
DELETE /v1/coach-commentary/{commentaryId}
```
**Auth:** Required (Coach API Key)

**Response:** `204 No Content`

### 5.2 URL Processing

**Server-Side Processing:**
1. Validate URL format (Google Photos or YouTube)
2. Extract video ID from YouTube URLs
3. Generate thumbnail URL for YouTube
4. Normalize URLs for consistent storage
5. Sanitize all inputs

**Example PHP Processing:**
```php
function processMediaUrls($googlePhotosUrl, $youtubeUrl) {
    $result = [
        'google_photos_url' => null,
        'youtube_url' => null,
        'media_thumbnail_url' => null
    ];
    
    // Process Google Photos
    if ($googlePhotosUrl) {
        if (preg_match('/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com\/share\/)/', $googlePhotosUrl)) {
            $result['google_photos_url'] = filter_var($googlePhotosUrl, FILTER_SANITIZE_URL);
        }
    }
    
    // Process YouTube
    if ($youtubeUrl) {
        $videoId = extractYouTubeVideoId($youtubeUrl);
        if ($videoId && preg_match('/^[a-zA-Z0-9_-]{11}$/', $videoId)) {
            $result['youtube_url'] = "https://www.youtube.com/embed/{$videoId}";
            $result['media_thumbnail_url'] = "https://img.youtube.com/vi/{$videoId}/maxresdefault.jpg";
        }
    }
    
    return $result;
}
```

---

## 6. UI/UX Design (Mobile-First)

### 6.1 Coach Interface (coach.html / archer_list.html)

**Add Commentary Button:**
- Location: Archer profile modal, next to "Current Notes"
- Icon: 💬 or 📝
- Opens commentary modal

**Commentary Modal:**
```
┌─────────────────────────────────────┐
│ Add Commentary - Sarah Johnson      │
├─────────────────────────────────────┤
│                                     │
│ Comment Type: [Technique ▼]        │
│                                     │
│ Comment:                            │
│ ┌─────────────────────────────────┐ │
│ │ Great improvement on...         │ │
│ │                                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📷 Google Photos Link:              │
│ ┌─────────────────────────────────┐ │
│ │ https://photos.app.goo.gl/...  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ▶️ YouTube Link:                    │
│ ┌─────────────────────────────────┐ │
│ │ https://youtube.com/watch?v=... │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ☐ Private (coach only)             │
│ ☐ Pin to top                       │
│                                     │
│ [Cancel]  [Save Commentary]        │
└─────────────────────────────────────┘
```

**Commentary List View:**
```
┌─────────────────────────────────────┐
│ Coach Commentary (3)                │
├─────────────────────────────────────┤
│ 📌 Pinned                            │
│ Great technique improvement!        │
│ 📷 [Photo Preview] ▶️ [Video]      │
│ Nov 17, 2025 4:30 PM                │
│                                     │
│ Follow-through needs work          │
│ ▶️ [Video Preview]                  │
│ Nov 15, 2025 2:15 PM                │
│                                     │
│ [+ Add Commentary]                  │
└─────────────────────────────────────┘
```

### 6.2 Archer Interface (archer_history.html or new page)

**Commentary Section:**
- Show only public commentary (`isPrivate = false`)
- Display in chronological order (newest first)
- Responsive media previews
- Click to expand/fullscreen

**Mobile Optimizations:**
- Thumbnail previews (tap to open full media)
- YouTube: Responsive iframe (max-width: 100%, aspect-ratio: 16/9)
- Google Photos: Link opens in new tab (Google handles mobile view)
- Swipe to dismiss expanded media
- Bottom sheet for commentary details

### 6.3 Media Preview Components

**YouTube Preview:**
```html
<div class="youtube-preview">
  <img 
    src="https://img.youtube.com/vi/{videoId}/maxresdefault.jpg" 
    alt="Video thumbnail"
    class="w-full aspect-video object-cover rounded-lg"
  />
  <div class="play-button-overlay">
    <svg>...</svg> <!-- Play icon -->
  </div>
</div>
```

**Google Photos Preview:**
```html
<div class="google-photos-preview">
  <a 
    href="{googlePhotosUrl}" 
    target="_blank"
    class="flex items-center gap-2 p-3 bg-gray-100 rounded-lg"
  >
    <svg>...</svg> <!-- Photo icon -->
    <span>View Photos</span>
  </a>
</div>
```

---

## 7. Implementation Phases

### Phase 3.1: MVP (2-3 weeks)

**Backend:**
- ✅ Create `coach_commentary` table
- ✅ Implement POST /v1/coach-commentary
- ✅ Implement GET /v1/coach-commentary
- ✅ URL validation and processing
- ✅ YouTube video ID extraction
- ✅ Thumbnail URL generation

**Frontend:**
- ✅ Add "Add Commentary" button in archer_list.html
- ✅ Commentary modal form
- ✅ Commentary list view in archer profile
- ✅ Basic media link display (clickable links)

**Testing:**
- ✅ Test with various YouTube URL formats
- ✅ Test with Google Photos shareable links
- ✅ Mobile responsiveness
- ✅ Coach authentication

### Phase 3.2: Enhanced Media Display (1-2 weeks)

**Frontend:**
- ✅ YouTube embed player (responsive iframe)
- ✅ Thumbnail previews
- ✅ Google Photos link styling
- ✅ Media preview cards

**Backend:**
- ✅ Thumbnail caching
- ✅ Media URL normalization

### Phase 3.3: Archer View (1 week)

**Frontend:**
- ✅ Public commentary display in archer_history.html
- ✅ New "My Commentary" page (optional)
- ✅ Media previews for archers
- ✅ Mobile-optimized media viewing

### Phase 3.4: Advanced Features (Future)

- ⏳ Google Photos API integration (OAuth, thumbnails)
- ⏳ Multiple photos per commentary
- ⏳ Commentary threading/replies
- ⏳ Notification system (archer sees new commentary)
- ⏳ Export commentary as PDF

---

## 8. Security & Privacy

### 8.1 Input Validation

**URL Validation:**
- Whitelist allowed domains (photos.app.goo.gl, youtube.com, etc.)
- Reject javascript: and data: URLs
- Sanitize all user inputs
- Validate URL format before storage

**Text Validation:**
- Sanitize HTML in comment_text (or use plain text)
- Limit comment length (e.g., 5000 characters)
- Prevent XSS attacks

### 8.2 Access Control

**Coach Access:**
- All commentary (private + public)
- Create, update, delete any commentary
- Requires `X-API-Key` header

**Archer Access:**
- Only public commentary (`isPrivate = false`)
- Read-only access
- No authentication required (public endpoint)

**Future:**
- Per-archer authentication for private commentary
- Coach-specific commentary (only visible to creating coach)

### 8.3 Link Expiration

**Google Photos:**
- ⚠️ Shareable links may expire if sharing settings change
- Solution: Coach can update link if it breaks
- Future: Periodic link validation check

**YouTube:**
- ✅ Public videos: Links don't expire
- ⚠️ Private/unlisted videos: May become inaccessible
- Solution: Validate video accessibility on display

---

## 9. Technical Considerations

### 9.1 Performance

**Thumbnail Loading:**
- Cache thumbnail URLs in database
- Lazy load thumbnails (only when visible)
- Use CDN for YouTube thumbnails (already fast)

**Query Optimization:**
- Index on `(archer_id, created_at DESC)` for common queries
- Limit results (pagination for large commentary lists)
- Consider materialized view for archer dashboard

### 9.2 Mobile Data Usage

**YouTube:**
- Disable autoplay (save data)
- Show thumbnail first, play on tap
- Use lower quality embed if needed

**Google Photos:**
- Link opens in Google Photos app (if installed)
- No embedded preview (saves data)

### 9.3 Offline Support

**Current:**
- Commentary creation requires online (coach only)
- Viewing requires online (for media)

**Future:**
- Cache commentary text offline
- Cache thumbnails for offline viewing
- Queue commentary creation if offline

---

## 10. Alternative Approaches Considered

### 10.1 Embedded Media vs. Links

**Option A: Store Links Only (Recommended)**
- ✅ Simple implementation
- ✅ No storage costs
- ✅ Links handle authentication (Google Photos)
- ✅ YouTube handles video serving
- ⚠️ Link expiration risk

**Option B: Download & Store Media**
- ❌ High storage costs
- ❌ Copyright concerns (YouTube)
- ❌ Complex implementation
- ❌ Privacy issues (downloading Google Photos)

**Decision:** Store links only (Option A)

### 10.2 Single Media Field vs. Separate Fields

**Option A: Separate Fields (Recommended)**
- ✅ Clear data model
- ✅ Easy querying ("get all with YouTube videos")
- ✅ Type-specific validation
- ✅ Future: Multiple photos field

**Option B: JSON Media Array**
- ⚠️ Less queryable
- ⚠️ More complex validation
- ✅ Flexible (can add more media types)

**Decision:** Separate fields (Option A)

### 10.3 Commentary vs. Notes Integration

**Option A: Separate Table (Recommended)**
- ✅ Better performance
- ✅ Supports multiple entries
- ✅ Media links need separate storage
- ✅ Future: Threading, replies

**Option B: Extend `archers.notes_current`**
- ⚠️ Single entry per archer
- ⚠️ Mixing text and media links
- ⚠️ Less queryable

**Decision:** Separate table (Option A)

---

## 11. Success Metrics

**Adoption:**
- Number of commentary entries created per week
- Percentage of archers with commentary
- Media link usage (Google Photos vs. YouTube)

**Engagement:**
- Archer views of commentary
- Media click-through rate
- Time spent viewing media

**Quality:**
- Average commentary length
- Media link validity (no broken links)
- Coach satisfaction with feature

---

## 12. Open Questions

1. **Google Photos Link Expiration:**
   - How to handle expired links?
   - Should we validate links periodically?
   - Should we notify coach if link breaks?

2. **Multiple Media per Commentary:**
   - Support multiple Google Photos links?
   - Support multiple YouTube videos?
   - When to add this feature?

3. **Commentary Threading:**
   - Allow archers to reply?
   - Allow coaches to add follow-up comments?
   - When to add this feature?

4. **Notification System:**
   - Notify archer when new commentary added?
   - Email or in-app notification?
   - When to add this feature?

5. **Export/Print:**
   - Export commentary as PDF?
   - Print-friendly view?
   - When to add this feature?

---

## 13. Recommendations

### Immediate (Phase 3.1 MVP)

1. ✅ **Start with separate `coach_commentary` table**
   - Better than extending notes_current
   - Supports future enhancements

2. ✅ **Use shareable links (no OAuth initially)**
   - Faster implementation
   - Can add OAuth later if needed

3. ✅ **Store normalized YouTube embed URLs**
   - Consistent format
   - Easy to display

4. ✅ **Cache YouTube thumbnails**
   - Better performance
   - Better UX

5. ✅ **Mobile-first UI design**
   - 99% phone usage
   - Responsive media previews

### Future Enhancements

1. ⏳ **Google Photos API integration** (if link expiration becomes issue)
2. ⏳ **Multiple media per commentary** (if coaches request)
3. ⏳ **Commentary threading** (if engagement is high)
4. ⏳ **Notification system** (if archers want alerts)
5. ⏳ **Export/print functionality** (if coaches request)

---

## 14. Next Steps

1. **Review & Approval:**
   - Review this evaluation with stakeholders
   - Confirm approach and priorities

2. **Database Migration:**
   - Create `coach_commentary` table
   - Add indexes
   - Test schema

3. **API Development:**
   - Implement POST /v1/coach-commentary
   - Implement GET /v1/coach-commentary
   - Add URL validation

4. **Frontend Development:**
   - Add commentary UI to coach.html/archer_list.html
   - Create commentary modal
   - Add media preview components

5. **Testing:**
   - Test with various URL formats
   - Test mobile responsiveness
   - Test authentication

6. **Documentation:**
   - Update API documentation
   - Create user guide for coaches
   - Create user guide for archers

---

## Appendix A: Example API Requests

### Create Commentary with YouTube

```bash
curl -X POST https://tryentist.com/wdv/api/v1/coach-commentary \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wdva26" \
  -d '{
    "archerId": "abc-123-def",
    "commentText": "Great improvement on follow-through! Watch this video for more tips.",
    "commentType": "technique",
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "isPrivate": false
  }'
```

### Create Commentary with Google Photos

```bash
curl -X POST https://tryentist.com/wdv/api/v1/coach-commentary \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wdva26" \
  -d '{
    "archerId": "abc-123-def",
    "roundId": "round-456-ghi",
    "commentText": "Your form looks great in these photos!",
    "commentType": "feedback",
    "googlePhotosUrl": "https://photos.app.goo.gl/ABC123XYZ",
    "isPrivate": false,
    "isPinned": true
  }'
```

### Get Commentary for Archer

```bash
curl "https://tryentist.com/wdv/api/v1/coach-commentary?archerId=abc-123-def&includePrivate=true" \
  -H "X-API-Key: wdva26"
```

---

## Appendix B: URL Validation Regex

```javascript
// Google Photos validation
const GOOGLE_PHOTOS_PATTERN = /^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com\/share\/|lh3\.googleusercontent\.com\/)/;

// YouTube validation
const YOUTUBE_PATTERN = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)/;

// Extract YouTube video ID
function extractYouTubeVideoId(url) {
  const patterns = [
    /[?&]v=([^&]+)/,           // watch?v=VIDEO_ID
    /youtu\.be\/([^?&]+)/,     // youtu.be/VIDEO_ID
    /embed\/([^?&]+)/,         // embed/VIDEO_ID
    /shorts\/([^?&]+)/         // shorts/VIDEO_ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}
```

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Next Review:** After Phase 3.1 implementation

