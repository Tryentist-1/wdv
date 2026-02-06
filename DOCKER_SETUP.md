# Docker (OrbStack) Setup for WDV

**WDV local dev runs only in OrbStack (Docker Compose).** One stack provides web, PHP, and DB. See [docs/core/DEVELOPMENT_ENVIRONMENT.md](docs/core/DEVELOPMENT_ENVIRONMENT.md) for the single source of truth.

---

## Stack

| Service | Container | Port / Role |
|---------|-----------|-------------|
| Web     | `wdv_web` | nginx, **8001** → 80 |
| PHP     | `wdv_php` | PHP 8.2 FPM (used by nginx) |
| DB      | `wdv_db`  | MariaDB 10.6 (internal) |

- **App URL:** http://localhost:8001  
- **Config:** `config.docker.php` is mounted as `api/config.local.php` (DB host `db`, database `wdv`, user `wdv_user`, password `wdv_password`).

---

## Commands

```bash
# Start
docker compose up -d

# Stop (keeps data in ./mysql)
docker compose down

# Logs
docker compose logs -f

# DB shell
docker exec -it wdv_db mysql -u wdv_user -pwdv_password wdv

# Restore prod snapshot (tables-only SQL)
docker exec -i wdv_db mysql -u root -prootpassword wdv < /path/to/wdv_tables_only.sql
```

---

## Data

- DB data: persisted in `./mysql` (bind mount in `docker-compose.yml`).  
- Code: project root is mounted; edit locally and refresh the browser.

---

## Troubleshooting

- **Port 8001 in use:** Another process is using it; stop it or change `ports: "8001:80"` in `docker-compose.yml`.  
- **DB connection fails:** Ensure containers are up (`docker ps`), then check `config.docker.php` and that `wdv_db` is healthy.  
- **Reset DB:** Remove `./mysql` (or the volume), then `docker compose up -d` again; schema is applied from `api/sql/schema.mysql.sql` on first init.

---

**Related:** [QUICK_START_LOCAL.md](QUICK_START_LOCAL.md), [.agent/workflows/start-dev-servers.md](.agent/workflows/start-dev-servers.md)
