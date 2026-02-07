---
description: Start PHP and MySQL dev servers for WDV
---

# Start Development Servers

This workflow starts the local PHP development server and ensures MySQL is running (via Docker) for the wdv project.

## Prerequisites

- Docker Desktop or OrbStack running
- MySQL container (`wdv-mysql`) available
- Node.js and npm installed

## Steps

// turbo-all

1. **Verify Docker MySQL is running**
   ```bash
   docker ps | grep wdv-mysql
   ```
   
   If not running, start it:
   ```bash
   docker-compose up -d
   ```

2. **Start PHP development server (background)**
   ```bash
   npm run serve
   ```

3. **Verify services are running**
   ```bash
   # Check MySQL
   docker ps | grep wdv-mysql
   
   # Check PHP server
   curl -I http://localhost:8001/index.html
   ```

## Quick Start (All-in-One)

```bash
# Ensure MySQL is up and start PHP server
docker-compose up -d && npm run serve
```

## Access Points

- **Main App:** http://localhost:8001/index.html
- **Coach Console:** http://localhost:8001/coach.html (passcode: `wdva26`)
- **Event Dashboard:** http://localhost:8001/event_dashboard.html?event={event_id}
- **API Base:** http://localhost:8001/api/v1/

## Stopping Services

```bash
# Stop PHP server (Ctrl+C in terminal or kill process)
lsof -ti:8001 | xargs kill

# Stop MySQL (keeps data)
docker-compose stop

# Stop and remove MySQL (removes containers, keeps volumes)
docker-compose down
```

## Troubleshooting

### Port 8001 Already in Use
```bash
# Find process using port
lsof -ti:8001

# Kill it
lsof -ti:8001 | xargs kill
```

### MySQL Container Not Healthy
```bash
# Check logs
docker-compose logs mysql

# Restart container
docker-compose restart mysql
```

### Can't Connect to MySQL
```bash
# Verify container is running and healthy
docker ps | grep wdv-mysql

# Test connection
docker exec -it wdv-mysql mysql -u root -p
```

## Docker Configuration

The project uses Docker Compose for MySQL:
- **Container:** `wdv-mysql`
- **Image:** `mysql:8.0`
- **Port:** `3306` (host) → `3306` (container)
- **Volumes:** Persisted data in Docker volume

## Notes

- The PHP server will run on http://localhost:8001
- MySQL runs in Docker and persists data between restarts
- To stop MySQL: `docker-compose stop`
- The PHP server will stay running until you terminate it
- PHP version: 8.5.2 (as of 2026-02-07)

## Related Workflows

- **Coach Testing:** [Coach Login Start](coach-login-start.md) - After starting servers, test coach features
- **Bug Fixes:** [Bug Fix Workflow](bug-workflow.md) - If you encounter issues during development
- **Post-Deployment:** [Post-Deployment Testing](post-deployment-testing.md) - Testing after deploying changes

## Updated

**Last Updated:** 2026-02-07  
**Change:** Updated to reflect Docker-based MySQL setup (previously used `brew services`)
