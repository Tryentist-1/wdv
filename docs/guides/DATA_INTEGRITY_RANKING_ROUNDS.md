# Data Integrity: Ranking Rounds

## Rule: Every Arrow Must Have a Value

For ranking rounds, **every arrow for every end must have something entered** (0–10, M, X, or 10). Blanks are not allowed once an end is considered “in progress.” Reasons:

- **Sync:** If a device has an end pending sync, the server may have no row or a partial row; blanks can mean “not synced yet” or “forgotten.”
- **Totals:** Running totals and round totals must be computed from complete ends; blanks make integrity checks (e.g. sum of end_total vs running_total) fail.
- **Verification:** Coaches verify scorecards; incomplete ends should be fixed before lock.

So: **no blank arrows for any end that is in progress.** If there is a blank, the app should **prompt to correct** (e.g. before advancing to the next end, before “Sync End,” or before “Complete Round”).

## Report: Cards With Blanks Before End 8

To find scorecards that may need correction (e.g. pending sync or missed arrow):

### API (coach / API key required)

```http
GET /v1/reports/ranking-blank-cards
X-Passcode: <coach passcode>
```

**Response:** JSON array of cards that are “in process” (have at least one end 1–7) and have at least one blank in ends 1–7:

```json
{
  "cards": [
    {
      "roundArcherId": "...",
      "archerName": "Brandon Garcia",
      "baleNumber": 2,
      "roundId": "...",
      "division": "BVAR",
      "eventName": "RR Jan 28",
      "eventDate": "2026-01-28",
      "blankEnds": [3, 4]
    }
  ]
}
```

`blankEnds` lists end numbers (1–7) that have a blank arrow (no row for that end, or a1/a2/a3 null/empty).

### SQL (run in MySQL/MariaDB)

From the repo:

```bash
docker exec -i wdv_db mysql -u wdv_user -pwdv_password wdv < api/sql/check_ranking_blank_cards_before_end8.sql
```

Or in a client:

```sql
SOURCE api/sql/check_ranking_blank_cards_before_end8.sql;
```

The query returns one row per scorecard (round_archer_id, archer_name, event, round, bale). For per-end blank detail, use the API.

## UI Follow-up: Prompt to Correct

**Intended behavior (to implement):** Before advancing to the next end, or before “Sync End” / “Complete Round,” validate that every end 1 through current (or 1–7 if “before end 8” is the rule) has all three arrows filled. If any arrow is blank, show a message and block until corrected (e.g. “End 3 has a blank arrow. Enter a score or M for every arrow before continuing.”).

This ensures devices don’t leave ends half-entered and that sync doesn’t push incomplete ends.

## Related

- [RANKING_ROUND_DROPPED_ARROW_SYNC_BUG.md](../bugs/RANKING_ROUND_DROPPED_ARROW_SYNC_BUG.md) – sync/ordering fixes
- [check_ranking_round_integrity.sql](../../api/sql/check_ranking_round_integrity.sql) – sum(end_total) vs running_total
