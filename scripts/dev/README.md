# WDV Development Scripts

**WDV dev runs only in OrbStack (Docker Compose).** Use `docker compose up -d` from the repo root. See [docs/core/DEVELOPMENT_ENVIRONMENT.md](../../docs/core/DEVELOPMENT_ENVIRONMENT.md).

---

## Primary: Docker Compose

From repo root:

```bash
docker compose up -d    # Start (wdv_web, wdv_php, wdv_db)
docker compose down    # Stop
docker compose logs -f # Logs
```

- **App:** http://localhost:8001  
- **DB:** container `wdv_db` (MariaDB), credentials in `config.docker.php`.

---

## Scripts in this folder

- **docker-start.sh** – Can start the Docker stack (alternative to `docker compose up -d`).
- **reset-from-prod.sh** – Reset local DB from a prod backup (restore into OrbStack `wdv_db`; see workflow docs).
- **setup-aliases.sh** – Optional shell aliases; if you use them, point `wdv-start` at `docker compose up -d` and `wdv-stop` at `docker compose down`.

Do not use host MySQL or `npm run serve` for WDV dev.

---

## Access points

- **Main app:** http://localhost:8001/index.html  
- **Coach console:** http://localhost:8001/coach.html  
- **Style guide:** http://localhost:8001/tests/components/style-guide.html  
- **API test:** http://localhost:8001/tests/api/harness/test_harness.html  
