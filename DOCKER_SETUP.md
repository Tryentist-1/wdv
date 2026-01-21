# Docker Setup for WDV Project

This project uses Docker for local MySQL database management. This keeps your database isolated from other projects and makes it easy to start/stop.

## 🚀 Quick Start

### First Time Setup

1. **Make sure Docker Desktop is running**

2. **Start the development servers:**
   ```bash
   ./scripts/dev/docker-start.sh
   ```

   This will:
   - Start MySQL in Docker (if not already running)
   - Wait for MySQL to be ready
   - Import the database schema (if needed)
   - Start the PHP development server on http://localhost:8001

3. **Access the application:**
   - Main app: http://localhost:8001/index.html
   - Coach console: http://localhost:8001/coach.html
   - Style guide: http://localhost:8001/tests/components/style-guide.html

### Daily Development

Just run:
```bash
./scripts/dev/docker-start.sh
```

The MySQL container will persist between sessions, so you don't need to re-import data.

## 🐳 Docker Commands

### Start MySQL only
```bash
docker-compose up -d mysql
```

### Stop MySQL (keeps data)
```bash
docker-compose stop mysql
```

### Start MySQL again
```bash
docker-compose start mysql
```

### Stop and remove MySQL (⚠️ deletes data)
```bash
docker-compose down
```

### View MySQL logs
```bash
docker-compose logs -f mysql
```

### Access MySQL command line
```bash
docker exec -it wdv-mysql mysql -uroot -psecret wdv
```

### Import SQL file manually
```bash
docker exec -i wdv-mysql mysql -uroot -psecret wdv < api/sql/schema.mysql.sql
```

## 📊 Database Configuration

The Docker MySQL setup uses:
- **Host:** `127.0.0.1` (or `localhost`)
- **Port:** `3306`
- **Database:** `wdv`
- **Root user:** `root`
- **Root password:** `secret`
- **Database user:** `wdv_user`
- **Database password:** `wdv_dev_password`

These match the settings in `api/config.local.php`.

## 💾 Data Persistence

Database data is stored in a Docker volume named `wdv_mysql_data`. This means:
- ✅ Data persists when you stop the container
- ✅ Data persists when you restart your computer
- ✅ Data is isolated to this project
- ⚠️ Data is deleted if you run `docker-compose down -v`

## 🔄 Working with Multiple Projects

Each project should have its own `docker-compose.yml` file. Docker Compose automatically:
- Creates separate containers for each project
- Uses different volume names (based on project directory)
- Keeps databases completely isolated

**Example:** If you have another project in `/Users/terry/makeitso/other-project`, it can also use port 3306 because Docker containers are isolated. Just make sure each project's `docker-compose.yml` uses a unique container name.

## 🛠️ Troubleshooting

### MySQL container won't start
```bash
# Check if port 3306 is already in use
lsof -i :3306

# If something else is using it, stop it or change the port in docker-compose.yml
```

### Database connection fails
1. Check if container is running: `docker ps | grep wdv-mysql`
2. Check container logs: `docker-compose logs mysql`
3. Verify config: Check `api/config.local.php` matches Docker settings

### Need to reset the database
```bash
# Stop and remove container + data
docker-compose down -v

# Start fresh
docker-compose up -d mysql

# Wait for MySQL to be ready, then import schema
docker exec -i wdv-mysql mysql -uroot -psecret wdv < api/sql/schema.mysql.sql
```

### Container name conflicts
If you get "container name already in use" errors:
```bash
# Remove the old container
docker rm -f wdv-mysql

# Start fresh
docker-compose up -d mysql
```

## 📚 More Information

- **Docker Compose docs:** https://docs.docker.com/compose/
- **MySQL Docker image:** https://hub.docker.com/_/mysql
- **Project setup:** See `QUICK_START_LOCAL.md` for full setup instructions
