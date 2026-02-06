# Development Environment

**Single source of truth:** WDV local development runs **only in OrbStack (Docker)**. Do not use Homebrew MySQL, Homebrew PHP, or `npm run serve` for this project.

---

## Stack (OrbStack / Docker Compose)

| Service   | Container | Role                    | Port / Notes                    |
|----------|-----------|-------------------------|----------------------------------|
| **Web**  | `wdv_web` | nginx (static + PHP proxy) | **8001** → 80                  |
| **PHP**  | `wdv_php` | PHP 8.2 FPM             | Used by nginx (no host port)     |
| **DB**   | `wdv_db`  | MariaDB 10.6            | Internal only (not host 3306)   |

- **App URL:** http://localhost:8001  
- **Config:** `config.docker.php` is mounted as `api/config.local.php` (DB: `host=db`, `wdv_user` / `wdv_password`, database `wdv`).  
- **Code:** Project root is mounted into containers; edit locally and refresh the browser.  
- **Data:** DB data persists in `./mysql` (Docker volume or bind mount per `docker-compose.yml`).

---

## Commands

```bash
# Start (from repo root)
docker compose up -d

# Stop
docker compose down

# Logs
docker compose logs -f

# DB shell
docker exec -it wdv_db mysql -u wdv_user -pwdv_password wdv
```

---

## Restore prod snapshot into dev

1. Fix backup if needed (e.g. `DEFAULT uuid()` → `DEFAULT (UUID())` for MySQL 8+).
2. Restore **base tables only** (skip view INSERTs); e.g. create `wdv_tables_only.sql`.
3. Run:  
   `docker exec -i wdv_db mysql -u root -prootpassword wdv < /path/to/wdv_tables_only.sql`

---

## Why OrbStack only?

- One consistent environment (no confusion between host MySQL/PHP and containers).
- Matches a single, reproducible setup for all devs and tools.
- Host MySQL and PHP have been stopped for this project to avoid port/process conflicts.

---

## References

- **Workflow:** [.agent/workflows/start-dev-servers.md](../../.agent/workflows/start-dev-servers.md)  
- **Docker:** [docker-compose.yml](../../docker-compose.yml), [config.docker.php](../../config.docker.php)  
- **Detailed setup:** [guides/LOCAL_DEVELOPMENT_SETUP.md](../guides/LOCAL_DEVELOPMENT_SETUP.md)
