# WDV Development Server Management

This directory contains scripts to easily manage your local development servers for the WDV project.

## 🚀 Quick Start

### Manual Start (Recommended for Development)

Simply run:
```bash
./scripts/dev/start-dev.sh
```

This will:
1. Start MySQL (if not already running)
2. Verify MySQL connectivity
3. Start the PHP development server on http://localhost:8001

**Press Ctrl+C to stop the PHP server when done.**

---

## 🔄 Auto-Start on Login/Reboot

If you want the dev servers to start automatically every time you log in:

### Install Auto-Start
```bash
./scripts/dev/setup-autostart.sh install
```

This creates a macOS LaunchAgent that will:
- Start the PHP dev server automatically when you log in
- MySQL is already configured to auto-start via Homebrew

### Check Status
```bash
./scripts/dev/setup-autostart.sh status
```

### Remove Auto-Start
```bash
./scripts/dev/setup-autostart.sh uninstall
```

---

## 📋 What Gets Started

### 1. MySQL Database Server
- **Managed by:** Homebrew services
- **Auto-start:** Already configured by Homebrew
- **Manual control:**
  ```bash
  brew services start mysql    # Start
  brew services stop mysql     # Stop
  brew services restart mysql  # Restart
  ```

### 2. PHP Development Server
- **Port:** 8001
- **Managed by:** npm script (`npm run serve`)
- **Auto-start:** Optional (via `scripts/dev/setup-autostart.sh install`)

---

## 🌐 Access Points

Once the servers are running:

- **Main Application:** http://localhost:8001/index.html
- **Coach Console:** http://localhost:8001/coach.html
- **Component Library:** http://localhost:8001/style-guide.html
- **API Test Harness:** http://localhost:8001/api/test_harness.html

---

## 📝 Logs

When using auto-start, logs are written to:
- `dev-server.log` - Standard output
- `dev-server-error.log` - Error output

---

## 🛠️ Troubleshooting

### MySQL won't start
```bash
# Check MySQL status
brew services list | grep mysql

# Try restarting
brew services restart mysql

# Check if it's responding
mysqladmin ping -h localhost
```

### Port 8001 already in use
```bash
# Find what's using the port
lsof -i :8001

# Kill the process if needed
kill -9 <PID>
```

### Auto-start not working
```bash
# Check status
./scripts/dev/setup-autostart.sh status

# Reinstall
./scripts/dev/setup-autostart.sh uninstall
./scripts/dev/setup-autostart.sh install

# Check LaunchAgent logs
cat dev-server.log
cat dev-server-error.log
```

---

## 🔧 Advanced Usage

### Run PHP server on different port

Edit `package.json` and change the `serve` script:
```json
"serve": "php -S localhost:8002"
```

### Keep PHP server running in background (manual)

```bash
nohup npm run serve > dev-server.log 2>&1 &
```

To stop it later:
```bash
# Find the process
ps aux | grep "php -S localhost:8001"

# Kill it
kill <PID>
```

---

## 📚 Related Documentation

- [QUICK_START_LOCAL.md](QUICK_START_LOCAL.md) - Complete local development setup
- [docs/LOCAL_DEVELOPMENT_SETUP.md](docs/LOCAL_DEVELOPMENT_SETUP.md) - Detailed setup guide

---

## ⚙️ Configuration Files

- `scripts/dev/start-dev.sh` - Main startup script
- `scripts/dev/setup-autostart.sh` - Auto-start configuration manager
- `~/Library/LaunchAgents/com.wdv.devserver.plist` - LaunchAgent config (created by setup-autostart.sh)
