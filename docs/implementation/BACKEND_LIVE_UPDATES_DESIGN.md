# Backend Design: Live Updates and Scoring Data Platform

**Status:** Draft  
**Date:** 2025-09-16  
**Owner:** Terry

---

## 1. Goals

- Live updates: write per-end scoring data in near-real-time so coaches can monitor active rounds.
- Persist scoring data for historical analytics and season/team rankings.
- Minimal friction for clients (mobile web), resilient to poor connectivity.

Non-goals (initially): full user accounts, complex RBAC, heavy server-rendered UI.

---

## 2. Architecture Options

1) Serverless JSON API + DB (Recommended for speed)
- API Gateway + Functions (e.g., Cloudflare Workers/Pages Functions, Vercel Functions, AWS Lambda) + managed DB (e.g., Supabase/Postgres, Neon, PlanetScale/MySQL).
- Pros: Fast to launch, low ops, built-in HTTPS, easy CI/CD.
- Cons: Cold starts (mitigated by edge), DB networking considerations.

2) Lightweight Node service (Express/Fastify) + Managed DB
- Pros: Full control, expandable.
- Cons: More ops, hosting needed.

3) Realtime-first (Supabase Realtime, Firebase)
- Pros: Built-in subscriptions for coach dashboard.
- Cons: Provider lock-in, pricing, schema constraints.

Recommendation: Start with Option 1 on Cloudflare/Workers + Neon/Supabase Postgres. Add WebSocket or server-sent events later if needed.

---

## 3. Data Model (Postgres)

### 3.1 Entities

- archers
  - id (uuid)
  - first_name (text)
  - last_name (text)
  - school (text)
  - level (text)  // Varsity/JV
  - gender (text)
  - created_at (timestamptz)

- rounds
  - id (uuid)
  - round_type (text) // 'R300' | 'R360' | 'SOLO' | 'TEAM'
  - date (date)
  - bale_number (int)
  - created_at (timestamptz)

- round_archers
  - id (uuid)
  - round_id (uuid) -> rounds.id
  - archer_id (uuid) -> archers.id (nullable if ad-hoc)
  - archer_name (text) // denormalized for performance
  - school (text)
  - level (text)
  - gender (text)
  - target_assignment (text) // A-H
  - created_at (timestamptz)

- end_events  // one row per archer per end entry/update
  - id (uuid)
  - round_id (uuid)
  - round_archer_id (uuid)
  - end_number (int) // 1..10 (R300) or 1..12 (R360)
  - a1 (text) // 'X','10','9'..'1','M'
  - a2 (text)
  - a3 (text)
  - end_total (int)
  - running_total (int)
  - tens (int)
  - xs (int)
  - device_ts (timestamptz) // client timestamp
  - server_ts (timestamptz default now())

- coach_views (optional, materialized view)
  - useful denormalized view for live dashboards: latest end per archer per round

Indexes: (round_id, end_number), (round_archer_id, end_number), (server_ts), (school, level, date) for season stats.

---

## 4. API Surface (REST, JSON)

Base path: `/api/v1`

Auth: Shared secret via header `X-API-Key` (rotatable). Later: per-team keys.

### 4.1 Create/ensure Round
POST `/rounds`
```json
{
  "roundType": "R300",
  "date": "2025-09-16",
  "baleNumber": 2
}
```
Response:
```json
{ "roundId": "uuid" }
```

Idempotency: `(roundType,date,baleNumber)` unique per day per device, or client can send `clientSessionId`.

### 4.2 Add/ensure Round Archer
POST `/rounds/{roundId}/archers`
```json
{
  "archerName": "Alex Rider",
  "school": "WDV",
  "level": "Varsity",
  "gender": "M",
  "targetAssignment": "A",
  "archerId": "optional-uuid"
}
```
Response: `{ "roundArcherId": "uuid" }`

### 4.3 Upsert End Event (Live Update)
POST `/rounds/{roundId}/archers/{roundArcherId}/ends`
```json
{
  "endNumber": 3,
  "a1": "X",
  "a2": "10",
  "a3": "9",
  "endTotal": 29,
  "runningTotal": 85,
  "tens": 2,
  "xs": 1,
  "deviceTs": "2025-09-16T18:30:00Z"
}
```
Response: `{ "eventId": "uuid" }`

Notes: Treat as idempotent on (roundArcherId,endNumber) replacing previous row.

### 4.4 Get Live Round Snapshot (Coach)
GET `/rounds/{roundId}/snapshot`
Response:
```json
{
  "round": { "id": "uuid", "roundType": "R300", "date": "2025-09-16", "baleNumber": 2 },
  "archers": [
    {
      "roundArcherId": "uuid",
      "archerName": "Alex Rider",
      "targetAssignment": "A",
      "currentEnd": 3,
      "endTotal": 29,
      "runningTotal": 85,
      "tens": 2,
      "xs": 1,
      "scores": [ ["X","10","9"], ["9","9","8"], ["10","9","10"] ]
    }
  ]
}
```

### 4.5 Season/Team Aggregates
GET `/stats/teams?school=WDV&level=Varsity&from=2025-09-01&to=2025-12-31`
Response includes per-archer totals/averages and team rankings across sessions.

---

## 5. Security, Privacy, and Integrity

- Use `X-API-Key` and restrict origins via CORS.
- Rate limit writes per device (e.g., 10 rps burst) and per IP.
- Validate payloads server-side: allowed score values, end range, totals.
- Do not store PII beyond names/schools; consider anonymized IDs if needed.

---

## 6. Client Integration (Minimal Changes)

- In `ranking_round_300.js` and `ranking_round.js`, hook into `handleScoreInput` and `changeEnd` to post updates:
  - Ensure round: POST `/rounds` once per session.
  - Ensure archer: POST `/rounds/{roundId}/archers` during setup selection.
  - On each end input (or on end advance), POST `/ends` with computed totals.
- Include `X-API-Key` from config; no secrets in repo (use environment on deploy or build-time injection).

Failure handling:
- Queue writes in `localStorage` on network errors and retry with backoff.
- Debounce rapid edits; send final state when the end is complete or after 2s idle.

---

## 7. Deployment

- Host API on Cloudflare Workers (or Vercel) with a Postgres backend (Neon/Supabase).
- CI/CD: on push to `main`, deploy functions; run DB migrations via sqitch/tern.
- Config via secrets: API keys, DB URL.

---

## 8. Future: Realtime Subscriptions

- Add a lightweight websocket or SSE endpoint: `/rounds/{roundId}/stream` to push coach dashboards instantly.
- Or leverage Supabase Realtime on `end_events` channel with row-level filtering.

---

## 9. Appendix: Table DDL (sketch)

```sql
create table archers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  school text,
  level text,
  gender text,
  created_at timestamptz default now()
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  round_type text not null,
  date date not null,
  bale_number int not null,
  created_at timestamptz default now()
);

create table round_archers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  archer_id uuid references archers(id),
  archer_name text not null,
  school text,
  level text,
  gender text,
  target_assignment text,
  created_at timestamptz default now()
);

create table end_events (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  round_archer_id uuid not null references round_archers(id) on delete cascade,
  end_number int not null,
  a1 text, a2 text, a3 text,
  end_total int,
  running_total int,
  tens int,
  xs int,
  device_ts timestamptz,
  server_ts timestamptz default now(),
  unique(round_archer_id, end_number)
);

create index idx_end_events_round on end_events(round_id, end_number);
create index idx_end_events_ts on end_events(server_ts);
```



