---
description: Start the WDV development environment
---

# Start Development Environment

The entire dev environment runs in Docker Compose via OrbStack. All services auto-start when OrbStack launches.

## Prerequisites

- OrbStack installed and running

## Services

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `wdv_web` | nginx:alpine | **:8001** | Web server |
| `wdv_php` | php:8.2-fpm-alpine | (internal) | PHP-FPM app server |
| `wdv-mysql` | mysql:8.0 | **:3306** | MySQL database |

## Daily Workflow

1. **Open OrbStack** — containers auto-start (all set to `restart: unless-stopped`)
2. **Open browser** — http://localhost:8001/index.html
3. **Done.**

## First Time / After Changes

```bash
# Start or rebuild everything
docker compose up -d
```

## Verify Services

```bash
# Container status
docker compose ps

# API health
curl http://localhost:8001/api/v1/health

# Database
docker exec wdv-mysql mysql -u wdv_user -pwdv_dev_password wdv -e "SELECT COUNT(*) FROM archers;"
```

## Access Points

- **Main App:** http://localhost:8001/index.html
- **Coach Console:** http://localhost:8001/coach.html (passcode: `wdva26`)
- **Event Dashboard:** http://localhost:8001/event_dashboard.html?event={event_id}
- **Style Guide:** http://localhost:8001/tests/components/style-guide.html
- **API Base:** http://localhost:8001/api/v1/

## DBeaver / Database Client

| Setting | Value |
|---------|-------|
| Host | `127.0.0.1` |
| Port | `3306` |
| Database | `wdv` |
| User | `wdv_user` |
| Password | `wdv_dev_password` |

## Managing Services

```bash
# View logs
docker compose logs -f        # All services
docker compose logs -f web    # Nginx only
docker compose logs -f php    # PHP only
docker compose logs -f db     # MySQL only

# Restart after config changes (e.g., nginx.conf)
docker compose restart web

# Stop everything (keeps data)
docker compose stop

# Stop and remove containers (keeps data volume)
docker compose down
```

## Troubleshooting

### Port 8001 Already in Use
```bash
lsof -ti:8001
```

### MySQL Container Not Healthy
```bash
docker compose logs db
docker compose restart db
```

### Can't Connect to MySQL
```bash
docker exec wdv-mysql mysqladmin ping -u wdv_user -pwdv_dev_password
```

### PHP Errors
```bash
docker compose logs php
```

## Configuration Files

- **`docker-compose.yml`** — Defines all three services
- **`nginx.conf`** — Web server config (routes `/api/*` to PHP-FPM)
- **`config.docker.php`** — PHP database credentials (mounted into container as `config.local.php`)

## Notes

- Database data persists in Docker named volume `wdv_wdv_mysql_data`
- `docker compose down` removes containers but keeps the data volume
- File edits (HTML, JS, PHP) are reflected immediately via volume mounts
- Tailwind CSS changes require `npm run build:css` on the host

## Related Workflows

- **Coach Testing:** [Coach Login Start](coach-login-start.md)
- **Bug Fixes:** [Bug Fix Workflow](bug-workflow.md)
- **Post-Deployment:** [Post-Deployment Testing](post-deployment-testing.md)

## Updated

**Last Updated:** 2026-02-15
**Change:** Consolidated to full Docker Compose stack (nginx + PHP-FPM + MySQL). No more hybrid setup or manual `npm run serve`.
