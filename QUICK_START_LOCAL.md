# Quick Start: Local Development Setup

**WDV dev runs only in OrbStack (Docker).** See [docs/core/DEVELOPMENT_ENVIRONMENT.md](docs/core/DEVELOPMENT_ENVIRONMENT.md) for the single source of truth.

---

## Quick Setup (OrbStack / Docker)

```bash
# From repo root
docker compose up -d
```

- **App:** http://localhost:8001/index.html  
- **Coach:** http://localhost:8001/coach.html  
- **Style guide:** http://localhost:8001/tests/components/style-guide.html  
- **API test harness:** http://localhost:8001/tests/api/harness/test_harness.html  

Stop when done: `docker compose down` (data in `./mysql` is kept).

---

## First-time / Restore DB

Schema is applied automatically from `api/sql/schema.mysql.sql` when the DB container is first created. To restore a prod snapshot into the OrbStack DB:

1. Prepare a tables-only SQL file (fix `DEFAULT uuid()` → `DEFAULT (UUID())` if needed; omit view INSERTs).
2. Run:  
   `docker exec -i wdv_db mysql -u root -prootpassword wdv < /path/to/wdv_tables_only.sql`

---

## Build Tailwind

After editing `css/tailwind.css`:

```bash
npm run build:css
```

Refresh the browser (code is mounted into the container).

---

## Switching Between Local and Production

- **Local (OrbStack):** App at http://localhost:8001 uses `config.docker.php` → DB in container `wdv_db`.  
- **Production:** https://archery.tryentist.com uses production config on the server.  
- Do not point the local app at production DB. Use prod backups restored into OrbStack when you need prod-like data.

---

## References

- [docs/core/DEVELOPMENT_ENVIRONMENT.md](docs/core/DEVELOPMENT_ENVIRONMENT.md) – dev stack and commands  
- [.agent/workflows/start-dev-servers.md](.agent/workflows/start-dev-servers.md) – workflow  
- [docs/guides/LOCAL_DEVELOPMENT_SETUP.md](docs/guides/LOCAL_DEVELOPMENT_SETUP.md) – detailed setup
