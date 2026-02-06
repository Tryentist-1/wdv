# WDV Development Server Management

**WDV dev runs only in OrbStack (Docker).** There is no separate “dev server” to manage on the host. See [core/DEVELOPMENT_ENVIRONMENT.md](../core/DEVELOPMENT_ENVIRONMENT.md).

---

## Commands (OrbStack / Docker Compose)

From the repo root:

| Action   | Command |
|----------|---------|
| Start    | `docker compose up -d` |
| Stop     | `docker compose down` |
| Logs     | `docker compose logs -f` |
| Status   | `docker ps` (look for `wdv_web`, `wdv_php`, `wdv_db`) |

---

## Access points

- **Main app:** http://localhost:8001/index.html  
- **Coach console:** http://localhost:8001/coach.html  
- **Style guide:** http://localhost:8001/tests/components/style-guide.html  
- **API test harness:** http://localhost:8001/tests/api/harness/test_harness.html  

---

## DB access

```bash
# Shell into MariaDB
docker exec -it wdv_db mysql -u wdv_user -pwdv_password wdv
```

---

## Troubleshooting

- **Port 8001 in use:** Another process (e.g. another stack) is using it. Stop that or change `ports: "8001:80"` in `docker-compose.yml`.
- **Containers not starting:** Run `docker compose logs` and fix any config/volume errors.
- **DB empty or wrong:** Restore a prod snapshot (see [LOCAL_DEVELOPMENT_SETUP.md](LOCAL_DEVELOPMENT_SETUP.md)).

---

**Related:** [.agent/workflows/start-dev-servers.md](../../.agent/workflows/start-dev-servers.md)
