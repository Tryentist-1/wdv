# Authentication Flows - Visual Guide

## Archer User Flow (Expected vs Actual)

### EXPECTED FLOW ✅

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARCHER OPENS APP                            │
│                    (No Auth Required)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              GET /v1/archers (PUBLIC)                           │
│              → Fetch full archer roster                         │
│              → Display profile selection screen                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│            ARCHER SELECTS THEIR PROFILE                         │
│            → Store in cookie: oas_archer_id                     │
│            → Continue to event selection                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         ARCHER SCANS QR CODE OR ENTERS EVENT CODE               │
│         → URL: ?event=<id>&code=<entryCode>                     │
│         → POST /v1/events/verify (PUBLIC)                       │
│         → Store event code in localStorage                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              ARCHER JOINS BALE / SELECTS DIVISION               │
│              → POST /v1/rounds (Auth: Event Code)               │
│              → POST /v1/rounds/{id}/archers/bulk                │
│              → Receive round_archer_id for scorecard            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ARCHER SCORES ENDS                            │
│                   → POST /v1/end-events                         │
│                   → Auth: Event Code (from localStorage)        │
│                   → Scores sync to server                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ARCHER COMPLETES ROUND                         │
│                  → PATCH /v1/scorecards/{id}/lock               │
│                  → View results                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ACTUAL FLOW (Current Implementation) ❌

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARCHER OPENS APP                            │
│                    (No Auth Required)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              GET /v1/archers (REQUIRES AUTH) ❌                 │
│              → Returns 401 Unauthorized                         │
│              → Archer cannot see roster                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ⚠️ FLOW BLOCKED                              │
│                                                                 │
│  Archer must either:                                            │
│  1. Enter coach passcode (they shouldn't have) ❌               │
│  2. Enter event code first (breaks expected UX) ❌              │
│  3. Use cached roster from previous session (if exists) ⚠️      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Coach User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    COACH OPENS CONSOLE                          │
│                    (coach.html)                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              CHECK COOKIE: coach_auth                           │
│              → If 'true': Skip to dashboard                     │
│              → If missing: Show passcode modal                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              COACH ENTERS PASSCODE: 'wdva26'                    │
│              → Store cookie: coach_auth=true (90 days)          │
│              → Store localStorage: coach_api_key, coach_passcode│
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COACH DASHBOARD LOADED                       │
│                    → Full access to all endpoints               │
│                    → X-API-Key: wdva26 sent with all requests   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   COACH OPERATIONS                              │
│                                                                 │
│  ✓ Create Events         (POST /v1/events)                     │
│  ✓ View All Events       (GET /v1/events/recent)               │
│  ✓ Create Rounds         (POST /v1/rounds)                     │
│  ✓ View All Scorecards   (GET /v1/events/{id}/rounds)          │
│  ✓ Edit Any Scorecard    (PATCH /v1/end-events/{id})           │
│  ✓ Manage Archer Roster  (POST /v1/archers/bulk-upsert)        │
│  ✓ Generate Reports      (GET /v1/events/{id}/results)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Decision Tree

```
                    ┌─────────────────────┐
                    │  API Request Made   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Is endpoint PUBLIC? │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
        ┌───────────┐                ┌───────────────┐
        │    YES    │                │      NO       │
        └─────┬─────┘                └───────┬───────┘
              │                              │
              ▼                              ▼
    ┌──────────────────┐        ┌───────────────────────┐
    │  Allow Request   │        │  Check Headers:       │
    │  No Auth Needed  │        │  - X-API-Key          │
    └──────────────────┘        │  - X-Passcode         │
                                └───────────┬───────────┘
                                            │
                                            ▼
                                ┌───────────────────────┐
                                │ X-API-Key = API_KEY?  │
                                │ (Static coach key)    │
                                └───────────┬───────────┘
                                            │
                        ┌───────────────────┴───────────────────┐
                        │                                       │
                        ▼                                       ▼
                ┌──────────────┐                      ┌─────────────┐
                │     YES      │                      │     NO      │
                │ (Coach Auth) │                      │ Check Pass  │
                └──────┬───────┘                      └──────┬──────┘
                       │                                     │
                       │                                     ▼
                       │                      ┌──────────────────────────┐
                       │                      │ X-Passcode = PASSCODE?   │
                       │                      │ (Static: 'wdva26')       │
                       │                      └──────────┬───────────────┘
                       │                                 │
                       │              ┌──────────────────┴─────────────────┐
                       │              │                                    │
                       │              ▼                                    ▼
                       │      ┌──────────────┐                    ┌────────────┐
                       │      │     YES      │                    │     NO     │
                       │      │ (Coach Auth) │                    │  Try DB    │
                       │      └──────┬───────┘                    └─────┬──────┘
                       │             │                                  │
                       │             │                                  ▼
                       │             │                    ┌─────────────────────────┐
                       │             │                    │ SELECT FROM events      │
                       │             │                    │ WHERE entry_code =      │
                       │             │                    │ LOWER(X-Passcode)       │
                       │             │                    └──────────┬──────────────┘
                       │             │                               │
                       │             │                ┌──────────────┴─────────────┐
                       │             │                │                            │
                       │             │                ▼                            ▼
                       │             │        ┌────────────┐              ┌────────────┐
                       │             │        │   FOUND    │              │ NOT FOUND  │
                       │             │        │ (Event     │              │ (401       │
                       │             │        │  Auth)     │              │  Error)    │
                       │             │        └─────┬──────┘              └────────────┘
                       │             │              │
                       └─────────────┴──────────────┘
                                     │
                                     ▼
                          ┌────────────────────┐
                          │  AUTHORIZED        │
                          │  Process Request   │
                          └────────────────────┘
```

---

## Data Storage Patterns

### Cookies (Browser-Managed, Has Expiry)

```
┌──────────────────────────────────────────────────────────────┐
│  Cookie: oas_archer_id                                       │
│  ├─ Value: UUID (e.g., "a3f2d1e4-...")                       │
│  ├─ Expires: 365 days                                        │
│  ├─ Path: /                                                  │
│  ├─ Scope: All pages in domain                               │
│  └─ Purpose: Persistent archer identification                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Cookie: coach_auth                                          │
│  ├─ Value: 'true' or absent                                  │
│  ├─ Expires: 90 days                                         │
│  ├─ Path: /                                                  │
│  ├─ Scope: All pages in domain                               │
│  └─ Purpose: Coach authentication state                      │
└──────────────────────────────────────────────────────────────┘
```

### localStorage (Per-Origin, No Expiry)

```
┌──────────────────────────────────────────────────────────────┐
│  Key: event_entry_code                                       │
│  ├─ Value: "ABC123" (current event code)                     │
│  ├─ Expires: Never (until manually cleared)                  │
│  └─ Purpose: Current event authentication                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Key: event:<eventId>:meta                                   │
│  ├─ Value: { entryCode, eventName, date }                    │
│  ├─ Expires: Never                                           │
│  └─ Purpose: Per-event metadata cache                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Key: rankingRound300_<date>                                 │
│  ├─ Value: { roundId, eventId, archers, currentEnd, ... }    │
│  ├─ Expires: Never                                           │
│  └─ Purpose: Session state persistence                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Key: coach_api_key                                          │
│  ├─ Value: "wdva26"                                          │
│  ├─ Expires: Never                                           │
│  └─ Purpose: Coach API key for requests                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Key: live_updates_config                                    │
│  ├─ Value: { apiKey, apiBase, enabled }                      │
│  ├─ Expires: Never                                           │
│  └─ Purpose: Live sync configuration                         │
└──────────────────────────────────────────────────────────────┘
```

---

## API Request Headers

### Public Request (No Auth)

```http
GET /v1/events/recent HTTP/1.1
Host: tryentist.com
Content-Type: application/json

(No authentication headers needed)
```

### Archer Request (Event Code)

```http
POST /v1/rounds HTTP/1.1
Host: tryentist.com
Content-Type: application/json
X-Passcode: ABC123

{
  "roundType": "R300",
  "date": "2025-11-17",
  "division": "BVAR",
  "eventId": "event-uuid-here"
}
```

### Coach Request (API Key)

```http
POST /v1/events HTTP/1.1
Host: tryentist.com
Content-Type: application/json
X-API-Key: wdva26
X-Passcode: wdva26

{
  "name": "Weekly Practice",
  "date": "2025-11-17",
  "status": "Active",
  "entryCode": "PRACTICE123"
}
```

### Alternative Coach Request (Bearer Token)

```http
GET /v1/archers HTTP/1.1
Host: tryentist.com
Content-Type: application/json
Authorization: Bearer wdva26

(Body empty for GET)
```

---

## Event Code Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Archer receives QR code or manual entry:                       │
│  https://tryentist.com/wdv/ranking_round_300.html               │
│  ?event=abc-123-def&code=MEET2024                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  JavaScript extracts URL params:                                │
│  - urlEventId = "abc-123-def"                                   │
│  - urlEntryCode = "MEET2024"                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Call: POST /v1/events/verify (PUBLIC ENDPOINT)                 │
│  Body: { eventId: "abc-123-def", entryCode: "MEET2024" }        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  API queries database:                                          │
│  SELECT * FROM events                                           │
│  WHERE id = 'abc-123-def'                                       │
│    AND LOWER(entry_code) = LOWER('MEET2024')                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌────────────────┐                  ┌──────────────────┐
│  Event Found   │                  │  Event Not Found │
│  Code Matches  │                  │  or Code Invalid │
└────────┬───────┘                  └────────┬─────────┘
         │                                   │
         ▼                                   ▼
┌──────────────────────────┐      ┌───────────────────────┐
│  Return 200:             │      │  Return 403:          │
│  {                       │      │  {                    │
│    verified: true,       │      │    verified: false,   │
│    event: {              │      │    error: "Invalid    │
│      id, name,           │      │      entry code"      │
│      date, status        │      │  }                    │
│    }                     │      └───────────────────────┘
│  }                       │
└──────────┬───────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  JavaScript stores event data:                                  │
│  - state.activeEventId = "abc-123-def"                          │
│  - localStorage.setItem('event_entry_code', 'MEET2024')         │
│  - localStorage.setItem('event:abc-123-def:meta', ...)          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Archer can now make authenticated requests using event code    │
│  All subsequent API calls include: X-Passcode: MEET2024         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Session Recovery Flow

### Scenario: Archer closes browser mid-scoring and reopens

```
┌─────────────────────────────────────────────────────────────────┐
│  Archer reopens app → JavaScript DOMContentLoaded fires         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Check for saved session in localStorage:                       │
│  - Key: rankingRound300_<today's date>                          │
│  - Contains: roundId, eventId, baleNumber, archers, currentEnd  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌────────────────┐                  ┌──────────────────┐
│  Session Found │                  │  No Session      │
└────────┬───────┘                  │  Start Fresh     │
         │                          └──────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Check for event code:                                          │
│  1. Try: localStorage.getItem('event_entry_code')               │
│  2. Try: localStorage.getItem('event:<eventId>:meta')           │
│  3. Scan all event metadata keys as fallback                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌────────────────┐                  ┌──────────────────────┐
│  Code Found    │                  │  Code Lost           │
└────────┬───────┘                  │  Prompt Re-entry     │
         │                          │  or Reset Session    │
         │                          └──────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Restore session state:                                         │
│  - Show scoring view (not setup)                                │
│  - Render archer cards with current scores                      │
│  - Resume from currentEnd                                       │
│  - Enable sync button                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Multiple Devices / Profiles

### Scenario: Two archers sharing a tablet

```
┌──────────────────────────────────────────────────────────┐
│  Archer A uses tablet:                                   │
│  - Cookie: oas_archer_id = UUID-A                        │
│  - localStorage: event_entry_code = "MEET2024"           │
│  - localStorage: rankingRound300_<date> = Archer A state │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Archer A finishes, hands tablet to Archer B             │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Archer B must manually:                                 │
│  1. Select their profile (updates oas_archer_id cookie)  │
│  2. Might see Archer A's session state initially ⚠️      │
│  3. If same event: can continue (event code persists) ✅ │
│  4. If different event: must scan new QR code            │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  ⚠️ POTENTIAL ISSUE:                                     │
│  - oas_archer_id cookie is per-device, not per-session   │
│  - If Archer B selects their profile, cookie overwrites  │
│  - Archer A's profile lost if they return to this device │
│                                                           │
│  WORKAROUND:                                             │
│  - Use browser profiles (Chrome guest mode, etc.)        │
│  - Clear cookies between archers                         │
│  - Or: Accept that device = one archer at a time         │
└──────────────────────────────────────────────────────────┘
```

**Recommendation:** Add UI to "Switch Profile" that explicitly clears session data.

---

## Security Threat Model

### Threat: Unauthorized Score Modification

```
┌─────────────────────────────────────────────────────────────────┐
│  Attacker Scenario:                                             │
│  - Archer A obtains event code "MEET2024"                       │
│  - Archer A inspects network traffic in browser DevTools        │
│  - Discovers Archer B's round_archer_id: "xyz-789"              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Attacker crafts malicious request:                             │
│  POST /v1/end-events                                            │
│  X-Passcode: MEET2024                                           │
│  {                                                              │
│    roundArcherId: "xyz-789",  ← Archer B's ID                   │
│    endNumber: 5,                                                │
│    arrows: [10, 10, 10],      ← Perfect score                   │
│    ...                                                          │
│  }                                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Current API Behavior:                                          │
│  ✓ Event code validates (attacker has valid code)               │
│  ✓ round_archer_id exists (Archer B's scorecard)                │
│  ✓ Request accepted ⚠️                                          │
│  → Archer B's scores modified by Archer A!                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Mitigations (Current):                                         │
│  1. UI doesn't expose other archers' round_archer_ids           │
│  2. Archers unlikely to inspect network traffic                 │
│  3. Coach can review/lock scorecards                            │
│                                                                 │
│  Mitigations (Recommended):                                     │
│  1. Add scorecard ownership validation                          │
│  2. Require archer_id to match oas_archer_id cookie             │
│  3. Log all score modifications with IP/timestamp               │
│  4. Rate limit score submissions per archer                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Future Enhancements

### JWT Token-Based Authentication

```
Current:  Static passcode "wdva26" (never expires, same for all coaches)
Problem:  Cannot revoke access, cannot track who did what

Future:   JWT tokens with expiry and refresh
          - Coach logs in → receives JWT (expires in 8 hours)
          - JWT includes: coachId, permissions, issued timestamp
          - Token can be revoked server-side
          - Audit trail: "Coach John modified Event X at 3:45 PM"
```

### Per-Archer Event Access Tokens

```
Current:  Event code shared by all archers (static)
Problem:  If leaked, all archers' data at risk

Future:   Per-archer tokens
          - Archer scans QR → receives personal token
          - Token scoped to: archer + event + expiry
          - Can only modify own scorecard
          - Automatic expiry after event ends
```

---

**Document Version:** 1.0  
**Last Updated:** November 17, 2025  
**Companion Doc:** `AUTHENTICATION_ANALYSIS.md`

