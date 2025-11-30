# Cleanup Action Plan - Authentication & Storage Strategy

**Created:** November 17, 2025  
**Status:** Roadmap for Future Improvements  
**Priority:** Medium (non-critical, improve maintainability)

---

## ✅ Already Completed

### Issue #1: Archer List Authentication (CRITICAL) ✅
**Status:** RESOLVED in v1.3.0  
**Date:** November 17, 2025

- Made `GET /v1/archers` endpoint public
- Archers can now load roster without authentication
- Tested and deployed to production

---

## 🔧 Remaining Issues to Address

The authentication analysis identified **3 additional issues** that should be addressed for better maintainability and consistency. These are **NOT critical** but will improve the codebase.

---

## Issue #2: Inconsistent Event Code Storage 🟡 MEDIUM PRIORITY

### Problem
Event codes are stored in multiple localStorage locations with complex fallback logic that's hard to maintain:

1. `localStorage.getItem('event_entry_code')` - Global
2. `localStorage.getItem('event:<eventId>:meta')` - Per-event  
3. Extracted from session state (`rankingRound300_<date>`)

**Current Fallback Chain** (`js/live_updates.js` lines 186-220):
```javascript
// 1. Try global event_entry_code
// 2. Find latest ranking round session
// 3. Extract eventId from session
// 4. Look up event metadata
// 5. Scan ALL event:*:meta keys as last resort
```

### Impact
- If event code is lost, archer may lose access mid-session
- Complex logic makes debugging difficult
- Maintenance burden (logic duplicated across files)

### Recommended Solution

**Simplify to a Primary + Backup Pattern:**

```javascript
// Primary storage (single source of truth)
localStorage.setItem('current_event', JSON.stringify({
  eventId: 'uuid',
  eventName: 'Practice Meet',
  entryCode: 'ABC123',
  date: '2025-11-17'
}));

// Backup: Keep per-event metadata for history
localStorage.setItem('event:uuid:meta', JSON.stringify({
  entryCode: 'ABC123',
  eventName: 'Practice Meet',
  date: '2025-11-17',
  lastAccessed: Date.now()
}));

// Simple retrieval (no complex fallback)
function getCurrentEventCode() {
  const current = JSON.parse(localStorage.getItem('current_event') || '{}');
  if (current.entryCode) {
    return current.entryCode;
  }
  
  // If lost, prompt user to re-enter
  showEventCodePrompt();
  return null;
}
```

**Remove complex fallback logic** - if event code is lost, explicitly prompt user to re-enter it.

### Files to Update
1. **`js/live_updates.js`** (lines 186-220)
   - Simplify `request()` function
   - Remove complex scanning logic
   - Add explicit "event code lost" handler

2. **`js/ranking_round_300.js`** (line 3265)
   - Update event code storage on verification
   - Use simplified retrieval pattern

3. **`js/ranking_round.js`**
   - Same pattern as ranking_round_300.js

### Estimated Effort
- **Time:** 2-3 hours
- **Risk:** Low (add fallback UI for edge cases)
- **Testing:** Test event code loss/recovery flow

---

## Issue #3: Cookie vs localStorage Strategy 🟢 LOW PRIORITY

### Problem
No documented strategy for when to use cookies vs localStorage:

| Data | Current Storage | Issue |
|------|----------------|-------|
| Archer ID | Cookie only (`oas_archer_id`) | ✅ Good |
| Coach auth | Cookie + localStorage | ❌ Redundant |
| Event code | localStorage only | ⚠️ No expiry |

### Impact
- Developer confusion (which storage to use?)
- Redundant storage (coach credentials in both places)
- No expiry mechanism for event codes

### Recommended Solution

**Create Clear Rules:**

**Use Cookies For:**
- ✅ Long-term user identification
  - `oas_archer_id` (365 days)
- ✅ Cross-session authentication
  - `coach_auth` (90 days)
- ✅ Data that needs automatic expiry

**Use localStorage For:**
- ✅ Session-specific data
  - Event codes (cleared manually)
  - Round state (cleared manually)
- ✅ Large data structures
  - Cached archer list
  - Session history
- ✅ Data that persists until cleared

**Don't Store in Both:**
- ❌ Coach credentials should be cookie-only OR localStorage-only (not both)

### Files to Update

1. **Create `docs/COOKIE_STORAGE_STRATEGY.md`**
   - Document the rules above
   - Provide code examples
   - Create decision tree

2. **Update `js/coach.js`**
   - Choose one storage mechanism for coach credentials
   - Recommendation: Keep cookie for auth state, remove localStorage redundancy
   - Or: Use only localStorage and check on page load

3. **Update `README.md`**
   - Add link to storage strategy doc
   - Include in developer onboarding

### Example Decision Tree

```
Need to store data?
│
├─ Should persist across sessions?
│  ├─ YES → Use Cookie (with expiry)
│  └─ NO → Use localStorage
│
├─ Data larger than 4KB?
│  └─ YES → Must use localStorage
│
├─ Need automatic expiry?
│  └─ YES → Must use Cookie
│
└─ Session-specific data?
   └─ YES → Use localStorage
```

### Estimated Effort
- **Time:** 1-2 hours (mostly documentation)
- **Risk:** Very low
- **Testing:** Verify coach login still works after cleanup

---

## Issue #4: Scorecard Ownership Validation 🟢 LOW PRIORITY

### Problem
No server-side validation that an archer owns the scorecard they're editing.

**Current State:**
- Archer with valid event code can technically modify ANY scorecard in that event
- `POST /v1/end-events` requires `round_archer_id` but doesn't verify ownership
- `PATCH /v1/end-events/{id}` same issue

**Theoretical Attack:**
```javascript
// Archer A could:
1. Use browser DevTools to inspect network requests
2. Find Archer B's round_archer_id from bale group API
3. Submit scores for Archer B's scorecard using their event code
```

### Current Mitigation
✅ **Low actual risk because:**
- UI doesn't expose other archers' `round_archer_id` values
- Archers unlikely to inspect network traffic
- Coaches can review/lock scorecards
- No history of abuse

### Recommended Solution

**Add Optional Ownership Validation:**

```php
// api/index.php - Add helper function
function validate_scorecard_ownership($roundArcherId, $submittingArcherId, $isCoach) {
    if ($isCoach) {
        return true; // Coaches can edit any scorecard
    }
    
    if (!$submittingArcherId) {
        return true; // If not provided, trust client (current behavior)
    }
    
    // Validate ownership
    $pdo = db();
    $stmt = $pdo->prepare('
        SELECT archer_id 
        FROM round_archers 
        WHERE id = ? 
        LIMIT 1
    ');
    $stmt->execute([$roundArcherId]);
    $owner = $stmt->fetchColumn();
    
    return ($owner === $submittingArcherId);
}

// In POST /v1/end-events endpoint:
$submittingArcherId = $input['archerId'] ?? null; // Optional
if ($submittingArcherId && !validate_scorecard_ownership($roundArcherId, $submittingArcherId, $isCoach)) {
    json_response(['error' => 'Unauthorized: You can only edit your own scorecard'], 403);
    exit;
}
```

**Client-Side Change (Optional):**
```javascript
// js/ranking_round_300.js - Include archer ID in score submission
const payload = {
  roundArcherId: state.activeRoundArcherId,
  archerId: getCookie('oas_archer_id'), // Add this
  endNumber: state.currentEnd,
  arrows: scores,
  // ...
};
```

### Implementation Options

**Option 1: Strict Validation (Most Secure)**
- Require `archerId` in all score submissions
- Validate on server side
- Reject mismatched requests

**Option 2: Soft Validation (Recommended)**
- Accept `archerId` if provided
- Validate only when present
- Log mismatches for monitoring
- Backward compatible with existing clients

**Option 3: Trust Client (Current)**
- No validation (current behavior)
- Rely on UI design to prevent abuse
- Accept the minor security risk

### Estimated Effort
- **Time:** 2-3 hours (Option 2)
- **Risk:** Low (make it backward compatible)
- **Testing:** Test archer can submit own scores, cannot submit others' scores

---

## 📋 Implementation Roadmap

### Sprint 1: Documentation (Low Effort, High Value)
**Estimated Time:** 2-3 hours

- [ ] Create `docs/COOKIE_STORAGE_STRATEGY.md`
- [ ] Update `README.md` with storage guidelines
- [ ] Document current event code storage pattern
- [ ] Create decision trees for developers

**Deliverables:**
- Clear documentation for future development
- Developer onboarding improved
- Reduced confusion about storage choices

---

### Sprint 2: Event Code Storage Cleanup (Medium Effort)
**Estimated Time:** 3-4 hours

- [ ] Simplify `js/live_updates.js` fallback logic
- [ ] Standardize event code storage pattern
- [ ] Update `js/ranking_round_300.js`
- [ ] Update `js/ranking_round.js`
- [ ] Add "event code lost" recovery UI
- [ ] Test event code recovery flow

**Deliverables:**
- Cleaner, more maintainable code
- Better UX when event code is lost
- Reduced debugging complexity

---

### Sprint 3: Optional Security Hardening (Low Priority)
**Estimated Time:** 2-3 hours

- [ ] Add scorecard ownership validation (Option 2: Soft)
- [ ] Add archer ID to score submission payloads
- [ ] Test validation logic
- [ ] Add logging for mismatches
- [ ] Monitor for abuse patterns

**Deliverables:**
- Improved security posture
- Audit trail for score modifications
- No impact on existing functionality

---

## 🎯 Success Criteria

### For Event Code Cleanup (Issue #2)
- ✅ Single source of truth for current event code
- ✅ Simple retrieval logic (< 10 lines)
- ✅ Explicit UI prompt when code is lost
- ✅ No complex fallback chains
- ✅ All tests pass

### For Storage Strategy (Issue #3)
- ✅ Documentation created and reviewed
- ✅ Clear rules established
- ✅ Examples provided
- ✅ Developer team understands strategy
- ✅ No redundant storage

### For Ownership Validation (Issue #4)
- ✅ Validation function added
- ✅ Backward compatible (doesn't break existing clients)
- ✅ Logging in place
- ✅ Tests pass
- ✅ No false positives

---

## 📊 Priority Matrix

| Issue | Priority | Effort | Risk | Impact |
|-------|----------|--------|------|--------|
| **#1: Archer List Auth** | ✅ CRITICAL | Low | Low | **HIGH** |
| **#2: Event Code Storage** | 🟡 MEDIUM | Medium | Low | Medium |
| **#3: Storage Strategy** | 🟢 LOW | Low | Very Low | Low |
| **#4: Ownership Validation** | 🟢 LOW | Medium | Low | Low |

### Recommendation
- ✅ **Issue #1:** DONE (v1.3.0)
- 🟡 **Issue #2:** Address in next sprint (improves maintainability)
- 🟢 **Issue #3:** Address when convenient (mostly documentation)
- 🟢 **Issue #4:** Consider for future (optional security hardening)

---

## 🚫 What NOT to Do

### Don't Over-Engineer
- ❌ Don't add complex authentication frameworks (overkill for this app)
- ❌ Don't break backward compatibility without good reason
- ❌ Don't fix what's working well (archer flow is good now)

### Don't Rush
- ❌ These aren't critical bugs (take time to do it right)
- ❌ Don't deploy during an event (wait for off-season)
- ❌ Don't skip testing (edge cases matter)

### Don't Create New Issues
- ❌ Keep it simple (complexity = bugs)
- ❌ Document as you go (future you will thank you)
- ❌ Test thoroughly (especially storage/recovery flows)

---

## 📚 Related Documentation

- **🔑 Master Reference:** `docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md`
- **Full Analysis:** `docs/AUTHENTICATION_ANALYSIS.md`
- **Flow Diagrams:** `docs/AUTHENTICATION_FLOWS.md`
- **Quick Reference:** `docs/AUTHENTICATION_QUICK_REFERENCE.md`
- **Recent Fix:** `docs/FIX_SUMMARY_NOV17.md`
- **Release Notes:** `RELEASE_NOTES_v1.3.0.md`

---

## ✅ Next Steps

### Immediate (This Week)
- ✅ Review this action plan
- ✅ Create master architecture document
- ✅ Create unified README
- [ ] Decide which issues to tackle first
- [ ] Schedule sprint planning

### Short Term (Next Sprint)
- Address Issue #3 (documentation - easy win)
- Consider Issue #2 (event code cleanup)
- **NEW:** Begin Phase 2 - Solo/Team integration (see [Integration Plan](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md))

### Long Term (Future)
- Monitor for any ownership abuse (Issue #4)
- Complete Solo/Team database integration
- Revisit quarterly to see if priorities have changed

---

**Created By:** Authentication Analysis (v1.3.0)  
**Status:** Roadmap for continuous improvement  
**Review Date:** Quarterly or before major feature releases

