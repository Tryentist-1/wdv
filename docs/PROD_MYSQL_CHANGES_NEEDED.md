# Production MySQL Changes for Bracket + Import Release

**If you pushed the code but didn’t run SQL on the shared/production MySQL**, the app may 500 on pages that load archers (e.g. home, archer list, assignment list) or the API may fail when returning `assignment`.

---

## What the code expects

- **Table:** `archers`
- **New column:** `assignment`  
  - Type: string, 2–4 chars  
  - Values: `''`, `S1`–`S8`, `T1`–`T6`  
  - Used for: Position filter in Coach “Add Archers”, Import Roster Games CSV, Assignment List, API `GET /v1/archers`
- **Column:** `ranking_avg` (DECIMAL(5,2) NULL) – used by GET /v1/archers; **missing = 500**
- **Optional:** index `idx_archers_assignment` on `assignment`

The API selects both `assignment` and **`ranking_avg`** in `GET /v1/archers`. If either column is missing, the query fails and the app returns 500.

---

## Option A: Minimal (assignment + ranking_avg)

If you already have most columns but still get 500 on `/api/v1/archers`, add the missing one(s). **Prod often has `assignment` but is missing `ranking_avg`.**

**File:** `api/sql/PROD_RUN_FOR_BRACKET_AND_IMPORT_RELEASE.sql`

Run in your production MySQL (e.g. phpMyAdmin → SQL tab), one statement at a time:

```sql
-- 1. assignment (skip if already exists)
ALTER TABLE archers
  ADD COLUMN assignment VARCHAR(4) NULL DEFAULT '' COMMENT 'S1-S8 solo, T1-T6 team'
  AFTER level;

-- 2. ranking_avg – fixes 500 on GET /v1/archers (skip if already exists)
ALTER TABLE archers ADD COLUMN ranking_avg DECIMAL(5,2) NULL COMMENT 'Ranking round average';

-- 3. Index (skip if already exists)
ALTER TABLE archers ADD INDEX idx_archers_assignment (assignment);
```

- **Duplicate column** or **Duplicate key** → skip that statement and run the next.

---

## Option B: Full production archers migration

If this is the first time you’re applying “archer table” changes on this DB (or you’re not sure), use the full script that adds all required columns for the current app:

**File:** `api/sql/migration_prod_archers_phpmyadmin.sql`

It adds:

1. **assignment** (VARCHAR(4)) – S1–S8, T1–T6
2. **ranking_avg** (DECIMAL)
3. USA Archery / extended profile columns (valid_from, club_state, membership_type, address_country, address_line3, disability_list, military_service, introduction_source, introduction_other, nfaa_member_no, school_type, school_full_name)
4. **shirt_size**, **pant_size**, **hat_size**
5. Index **idx_archers_assignment**

Run each statement one at a time (or in small groups). If you see “Duplicate column” or “Duplicate key”, skip that statement and continue.

---

## Summary

| Change            | Table   | Column / Index              | Required for                          |
|-------------------|---------|-----------------------------|--------------------------------------|
| New column        | archers | `assignment` VARCHAR(4)     | Position filter, Import Roster Games, API |
| Optional index    | archers | `idx_archers_assignment`     | Faster assignment filtering          |

**Minimal script:** `api/sql/PROD_RUN_FOR_BRACKET_AND_IMPORT_RELEASE.sql`  
**Full script:** `api/sql/migration_prod_archers_phpmyadmin.sql`

After running the appropriate SQL on production MySQL, reload the site; archer-dependent pages and Import Roster Games should work.
