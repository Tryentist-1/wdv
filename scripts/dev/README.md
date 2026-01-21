# WDV Development Server Scripts

Quick commands to manage your local development environment.

## 🚀 Quick Commands

After running `./scripts/dev/setup-aliases.sh`, you can use these shortcuts anywhere in your terminal:

### Start Servers
```bash
wdv-start
```
Starts MySQL (Docker) and PHP development server. Opens on http://localhost:8001

### Stop Servers
```bash
wdv-stop          # Stops PHP server only (MySQL keeps running)
wdv-stop --all    # Stops both PHP server and MySQL
```

### Restart Servers
```bash
wdv-restart       # Restarts PHP server (MySQL stays running)
wdv-restart --all # Restarts both PHP and MySQL
```

### Check Status
```bash
wdv-status
```
Shows if MySQL and PHP server are running.

## 📁 Script Files

All scripts are in `scripts/dev/`:

- `start.sh` - Start MySQL and PHP server
- `stop.sh` - Stop PHP server (optionally MySQL)
- `restart.sh` - Restart servers
- `status.sh` - Check server status
- `reset-from-prod.sh` - Reset local database from production backup
- `restore-prod.sh` - Legacy restore script (use `reset-from-prod.sh` instead)
- `setup-aliases.sh` - Install terminal shortcuts (run once)
- `docker-start.sh` - Legacy script (use `start.sh` instead)

## 🔧 First Time Setup

Run this once to set up the shortcuts:
```bash
./scripts/dev/setup-aliases.sh
```

Then reload your shell:
```bash
source ~/.zshrc
```

Or just open a new terminal window.

## 💡 Usage Tips

1. **Daily workflow:**
   ```bash
   wdv-start    # Start working
   # ... make changes ...
   # Press Ctrl+C to stop PHP server when done
   ```

2. **Check if servers are running:**
   ```bash
   wdv-status
   ```

3. **Restart after config changes:**
   ```bash
   wdv-restart
   ```

4. **Clean shutdown:**
   ```bash
   wdv-stop --all  # Stops everything
   ```

5. **Reset database from production backup:**
   ```bash
   ./scripts/dev/reset-from-prod.sh
   # Or with a specific backup file:
   ./scripts/dev/reset-from-prod.sh backups/db_backup_20260121_135139.sql
   # Or auto-confirm (useful for automation):
   ./scripts/dev/reset-from-prod.sh --yes
   ```

## 🌐 Access Points

Once started, access:
- **Main app:** http://localhost:8001/index.html
- **Coach console:** http://localhost:8001/coach.html
- **Style guide:** http://localhost:8001/tests/components/style-guide.html
- **API test:** http://localhost:8001/tests/api/harness/test_harness.html

## 🐳 Docker Notes

- MySQL runs in Docker container `wdv-mysql`
- Data persists in Docker volume `wdv_mysql_data`
- Container auto-starts when you run `wdv-start`
- Use `docker-compose stop mysql` to stop MySQL manually
- Use `docker-compose down -v` to remove MySQL and all data
