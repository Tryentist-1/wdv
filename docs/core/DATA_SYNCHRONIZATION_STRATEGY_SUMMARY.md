# Data Synchronization Strategy - Quick Reference

**Date:** January 21, 2025  
**Status:** Quick Reference Guide  
**Master Document:** [DATA_SYNCHRONIZATION_STRATEGY.md](DATA_SYNCHRONIZATION_STRATEGY.md)

---

## 🎯 Purpose

Quick reference guide for the universal data synchronization rules. For complete details, see the [master strategy document](DATA_SYNCHRONIZATION_STRATEGY.md).

---

## 📋 The 6 Universal Rules

### Rule 1: Server is Source of Truth for Metadata
✅ Always fetch metadata (division, IDs, timestamps) from server  
❌ Never use cached metadata from localStorage

### Rule 2: Scores Use "Last Write Wins" with Sync Status
✅ Server if synced, local if pending/failed, server if newer  
❌ Never blindly overwrite local with server

### Rule 3: Atomic Data Units - Fetch Complete Units
✅ Fetch complete atomic unit (Scorecard Group, Match, etc.)  
❌ Never merge data from different sources/units

### Rule 4: Clear State Before Hydration
✅ Always clear state before loading from server  
❌ Never mix old and new data

### Rule 5: UUID-Only for Entity Identification
✅ Always normalize to UUID format before use  
❌ Never use extId, composite IDs, or legacy formats

### Rule 6: Centralized Hydration Function
✅ Use single hydration function per module  
❌ Never create ad-hoc merge logic

---

## 🔧 Implementation Pattern

```javascript
async function hydrateEntity(entityId, context, options = {}) {
    // 1. Clear state
    clearState();
    
    // 2. Validate inputs
    validateInputs(entityId, context);
    
    // 3. Fetch atomic unit from server
    const serverData = await fetchAtomicUnit(entityId, context);
    
    // 4. Validate atomic unit integrity
    validateAtomicUnit(serverData, entityId, context);
    
    // 5. Merge scores (if applicable)
    const mergedData = options.mergeLocal 
        ? await mergeWithLocal(serverData, entityId, context)
        : serverData;
    
    // 6. Populate state
    populateState(mergedData);
    
    // 7. Save session
    saveSession(entityId, context);
    
    return state;
}
```

---

## 📊 Module Examples

### Ranking Rounds
- **Atomic Unit:** Scorecard Group (RoundID + Bale Number)
- **Function:** `hydrateScorecardGroup(roundId, baleNumber)`

### Solo Matches
- **Atomic Unit:** Match (MatchID)
- **Function:** `hydrateMatch(matchId)`

### Team Matches
- **Atomic Unit:** Match (MatchID)
- **Function:** `hydrateTeamMatch(matchId)`

---

## ✅ Quick Checklist

Before implementing data hydration:
- [ ] Clear state first
- [ ] Fetch complete atomic unit from server
- [ ] Validate unit integrity
- [ ] Merge scores with sync status
- [ ] Use UUIDs only
- [ ] Save session for recovery

---

## 📚 Related Documentation

- [Master Strategy](DATA_SYNCHRONIZATION_STRATEGY.md) - Complete rules and implementation
- [Deprecation Plan](DATA_SYNCHRONIZATION_DEPRECATION_PLAN.md) - Older docs being replaced

---

**Last Updated:** January 21, 2025  
**Version:** 1.0

