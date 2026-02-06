---
description: Start WDV dev environment (OrbStack/Docker only)
---

# Start Development Servers

WDV dev runs **only in OrbStack** (Docker): one stack for web, PHP, and MySQL. Do not use Homebrew MySQL or `npm run serve` for this project.

## Steps

1. **Start the OrbStack stack**
   ```bash
   cd /path/to/wdv
   docker compose up -d
   ```
   Or use the project script if you have one:
   ```bash
   ./scripts/dev/docker-start.sh
   ```

2. **Verify services**
   ```bash
   docker ps
   ```
   You should see `wdv_web` (port 8001), `wdv_php`, and `wdv_db` running.

3. **Optional: check DB**
   ```bash
   docker exec wdv_db mysql -u wdv_user -pwdv_password wdv -e "SELECT COUNT(*) FROM archers;"
   ```

## Notes

- **App URL:** http://localhost:8001 (nginx → PHP → MariaDB in containers)
- **DB:** MariaDB in container `wdv_db`; credentials in `config.docker.php` (wdv_user / wdv_password, database `wdv`)
- **Code:** Project directory is mounted into the containers; edit locally and refresh the browser
- **Stop:** `docker compose down` (data in `./mysql` is kept unless you remove the volume)
- **Coach console:** http://localhost:8001/coach.html

## Restore prod snapshot into OrbStack

If you have a prod backup and want it in dev:

1. Fix UUID defaults and strip view INSERTs (see earlier restore steps), then:
   ```bash
   docker exec -i wdv_db mysql -u root -prootpassword wdv < /tmp/wdv_tables_only.sql
   ```

## Related Workflows

- **Coach Testing:** [Coach Login Start](coach-login-start.md)
- **Bug Fixes:** [Bug Fix Workflow](bug-workflow.md)
- **Post-Deployment:** [Post-Deployment Testing](post-deployment-testing.md)
