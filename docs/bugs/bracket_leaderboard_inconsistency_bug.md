# Bracket Results Bug: Leaderboard Inconsistency

**Date:** 2026-02-24
**Page/Module:** `bracket_results.html` & `api/index.php`
**Severity:** High
**Status:** 🔴 Open

---

## 🐛 Bug Description

**What's broken:**
The Swiss Bracket leaderboard displays incorrect win/loss records and points for archers who have participated in tie-breaker shoot-offs. For example, an archer who won 2 matches (one outright, one via shoot-off) and lost 1 match shows a record of 1-1 instead of 2-1 on the leaderboard.

**User Impact:**
- Archers and coaches see inaccurate standings and rankings.
- Trust in the tournament scoring system is reduced.
- It can affect seeding and advancement in tournaments if the standings are used for further bracket generation.

---

## 🔍 Steps to Reproduce

1. Wait for or create a Swiss bracket match that ends in a 5-5 tie.
2. Complete the shoot-off (set 6) to determine a winner, and lock/verify the match.
3. Navigate to the bracket results leaderboard (`bracket_results.html?bracket=[ID]`).
4. Observe: The tie match is completely omitted from both archers' win/loss records (e.g., if it's their second match, their record stays at 1-0 or 0-1).
5. Expected: The winner of the shoot-off should receive a win and point, and the loser should receive a loss.

---

## 🔍 Root Cause Analysis

### The Problem
The function `recalculate_swiss_standings()` in `api/index.php` calculates wins and losses by summing the set points for sets 1 through 5. It explicitly ignores the shoot-off set (set 6) and does not fall back to checking the match's explicit winner.

### Code Flow
In `api/index.php` around line 830:
```php
$e1Sets = min(6, (int) ($matchEntries[0]['sets_won'] ?? 0));
$e2Sets = min(6, (int) ($matchEntries[1]['sets_won'] ?? 0));
if ($e1Sets > $e2Sets) {
    $standings[$matchEntries[0]['archer_id']]['wins']++;
    $standings[$matchEntries[1]['archer_id']]['losses']++;
} elseif ($e2Sets > $e1Sets) {
    $standings[$matchEntries[1]['archer_id']]['wins']++;
    $standings[$matchEntries[0]['archer_id']]['losses']++;
}
// MISSING: Handling for $e1Sets === $e2Sets (tie-breakers)
```

### Why This Happens
If `$e1Sets` equals `$e2Sets` (e.g., a 5-5 tie), neither the `if` nor the `elseif` block executes. The function fails to check the shoot-off score (set 6) or the `winner_archer_id` column to determine the match winner. Consequently, the match effectively doesn't exist for the purpose of the standings calculation.

---

## ✅ Solution

### Fix Strategy
Update `recalculate_swiss_standings()` in `api/index.php` to properly account for tie-breaker wins. If the set points are tied, the function should determine the winner by checking the `winner_archer_id` column of the `solo_matches` table, which serves as the canonical source of truth for the match winner. The same fix may also be required for TEAM matches if they implement a similar shoot-off tie-breaking mechanism.

---

**Status:** 🔴 Open
**Priority:** High
**Reported by:** Antigravity AI
