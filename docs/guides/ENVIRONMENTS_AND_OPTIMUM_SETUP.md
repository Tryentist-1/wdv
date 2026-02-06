# Environments and Optimum Setup

**Your setup:** Mac Mini M1 (always-on server + light dev), MacBook Pro M5 (day-to-day dev), OrbStack on both, production on Interserver shared hosting. You want one codebase that works everywhere, clean Docker, and to work on branches and merge across projects.

---

## 1. The Three Environments (Comparison)

| Aspect | **M1 Mini (always-on server)** | **M5 MacBook (daily dev)** | **Interserver (prod)** |
|--------|-------------------------------|----------------------------|-------------------------|
| **Role** | Always-on instance + occasional light dev | Heavy dev, tests, multiple branches | Live site (archery.tryentist.com) |
| **Hardware** | M1, 8 GB RAM | M5, 32 GB | Shared; you don’t control it |
| **Runtime** | OrbStack → Docker (recommended) or `php -S` for quick checks | OrbStack → Docker or `php -S` | Apache (or nginx) + PHP + MySQL (Interserver default) |
| **How app runs** | Same repo, `docker-compose up` (or `npm run serve`) | Same repo, switch branch → run Docker or PHP | FTP deploy to `public_html/wdv`; no Docker |
| **API base** | Same code: relative `api/index.php/v1` or localhost detection | Same code | Same code; server must route to `api/index.php` |
| **Database** | Docker MariaDB (or local MySQL) | Same Docker MariaDB when using Docker | Interserver MySQL (separate DB) |
| **Config** | `config.docker.php` in Docker; or none for `php -S` (uses api defaults) | Same | `config.local.php` on server (DB credentials, etc.) |
| **Deploy** | No deploy; just run containers | No deploy; merge to main then deploy from here (or M1) | FTP via `DeployFTP.sh` to da100.is.cc → public_html/wdv |

**Important:** The **application code** (HTML, JS, PHP under `api/`) is the same everywhere. What changes per environment is **how** it’s run (Docker vs PHP built-in vs shared hosting) and **config** (DB host, credentials). So one codebase, multiple runtimes.

---

## 2. Differences That Actually Matter

### 2.1 API URL (the “404 in dev” issue)

- **Docker (OrbStack):** Nginx is configured so that `api/index.php/v1/...` is routed to `api/index.php` with path info. So the app must use **`api/index.php/v1`** as the API base (relative to the site URL).
- **PHP built-in server (`php -S localhost:8001`):** No rewrite. Only paths that hit `api/index.php` work. So again: **`api/index.php/v1`**. Using `api/v1` alone returns 404.
- **Interserver (prod):** Depends on their Apache/nginx. Often they support path-info (e.g. `api/index.php/v1/...`). If they only expose “pretty” URLs like `api/v1`, that’s a rewrite on their side. **Optimum:** use **relative** `api/index.php/v1` in the app everywhere so the same code works on M1, M5, and prod without env-specific URLs.

So the only “environment difference” in code should be: **we use one rule everywhere — relative `api/index.php/v1`.** No “if localhost use X else use production URL” in the app; that’s what makes it brittle.

### 2.2 Database

- **M1 / M5 with Docker:** Same: `config.docker.php` → host `db`, user `wdv_user`, DB `wdv`.
- **M1 / M5 with `php -S` only:** If you point to a DB at all, it’s usually `config.local.php` (or env) with `localhost` and your local MySQL/MariaDB.
- **Prod:** Interserver MySQL; credentials in `config.local.php` on the server (not in repo). Different host/DB name.

So: **config is per-environment; code is not.**

### 2.3 What runs where

- **M1:** Run the stack (Docker) so others can hit it (e.g. on your LAN or via Tailscale). Optionally run tests or light dev there; no need for heavy Playwright/Jest on the Mini.
- **M5:** Run the same stack for integration testing, run full test suite, switch branches, do merges. Deploy to prod from here (or from M1) via the same deploy script.
- **Prod:** No “run” step; you deploy files. Interserver runs Apache/PHP/MySQL.

---

## 3. Optimum Setup Per Machine

### 3.1 Mac Mini M1 (8 GB) – always-on server + light dev

**Optimum:**

- **Primary:** Run the app via **OrbStack + Docker** (same `docker-compose.yml` as in the repo).
  - Same behavior on M1 and M5.
  - Port 8001 → nginx → PHP → MariaDB.
  - Use the same API base in the app (`api/index.php/v1`), so no special cases.
- **Light dev:** When you do small edits on the M1, either:
  - Edit in repo, reload in browser (containers use volume mounts), or
  - Use `php -S localhost:8001` in the repo root for a quick check (still use relative `api/index.php/v1` in the app).
- **Avoid on M1:** Heavy parallel test runs or many containers from other projects at once; 8 GB is enough for one WDV stack + a bit of headroom.

**Concrete:**

- Clone repo (or sync via Git).
- `cd` to project, `docker compose up -d` (OrbStack).
- App at `http://localhost:8001` (or your machine’s IP if you want other devices to hit it).
- For deploy to prod: either run `npm run deploy:fast` from M1 when the branch you want is checked out, or do deploys from M5 only.

### 3.2 MacBook Pro M5 (32 GB) – daily dev and heavy lifting

**Optimum:**

- **Primary:** Same **OrbStack + Docker** for this project when you want “production-like” behavior and integration tests.
- **Also:** Use **`php -S localhost:8001`** when you want fast iteration (no container restart). Same repo, same API base rule.
- **Branches:** Work on feature/fix branches; run either Docker or PHP server on the branch you have checked out. No env-specific code; only branch-specific code.
- **Tests:** Run full suite here (Playwright, Jest, etc.). Optionally run a subset on M1 if needed.
- **Merges:** Merge branches in Git (on M5 or M1); then deploy to prod from the branch that’s merged to main (usually from M5).

**Concrete:**

- Clone repo (or pull). `git checkout feature/xyz` → work → run `docker compose up -d` or `npm run serve` → test.
- Merge: `git checkout main && git merge feature/xyz` (and push). Deploy: `npm run deploy:fast` (requires .env with FTP_PASSWORD).
- Multiple projects: OrbStack can run multiple compose projects; each WDV run is one compose. Other projects = other directories, other compose files. No conflict if ports differ (e.g. this app stays on 8001).

### 3.3 Interserver (production)

**Optimum:**

- **Deploy:** Only deploy from a clean, tested state (e.g. after merge to main). Use `DeployFTP.sh` (or `npm run deploy:fast`) from M5 (or M1).
- **Server config:** Ensure the docroot for archery.tryentist.com (or wherever WDV lives) can execute `api/index.php` and pass path info (e.g. `.../api/index.php/v1/archers`). Most shared Apache setups support this. If you get 404s on prod for API calls, the host may need a rewrite; the app should still call `api/index.php/v1` so one codebase works everywhere.
- **Config:** Keep `api/config.local.php` on the server with production DB credentials; do not commit that file. FTP deploy script already excludes it or overwrites only what you deploy.

---

## 4. One Codebase, Branches, and Merges

- **One codebase:** The same repo (same HTML, JS, PHP, CSS) runs on M1, M5, and prod. Only config (and optionally .env for deploy) is local or server-specific.
- **Branches:** Create branches on M5 (or M1), e.g. `feature/xyz`, `fix/abc`. Run the app (Docker or `php -S`) on that branch to test. No “environment” branch; only feature/fix branches.
- **Merges:** Merge when ready into `main` (or your default branch). Do the merge on the machine that has the latest state (usually M5). Then deploy from that machine so prod matches the merged code.
- **Different projects:** Other projects = other repos/directories. Each has its own OrbStack stack (different port if needed). Merging “different projects” means merging different repos (e.g. submodules or a monorepo); for a single WDV repo, “different branches” is what you merge.

So: **environment = where it runs (M1 / M5 / prod); not a branch.** Branches are for features/fixes; the same environment rules apply to every branch.

---

## 5. Recommended “Optimum” Settings Summary

| Item | Recommendation |
|------|----------------|
| **API base in app** | Use **relative** `api/index.php/v1` everywhere (no hostname, no “if localhost”). Same code on M1, M5, and prod. |
| **M1** | OrbStack + Docker for the WDV stack; occasional `php -S` for quick checks. Same repo, same code. |
| **M5** | OrbStack + Docker for integration; `php -S` for speed; run tests here; do branches and merges here; deploy to prod from here. |
| **Prod** | Deploy via existing FTP script; ensure server can run `api/index.php` with path info. |
| **Config** | Docker: `config.docker.php`. Prod: `config.local.php` on server. Not committed. |
| **Branches** | Use Git branches for features/fixes; run any branch with the same Docker or PHP command; merge to main then deploy. |

That way you get:

- **Clean Docker across projects:** One compose per project; OrbStack on both Macs; same behavior.
- **Work on different branches:** Check out branch → run → test → merge.
- **Merge different work:** Standard Git merge (and deploy from the merged branch).
- **No environment brittleness:** One API base rule; no “works on M5 but 404 on M1/prod” due to URL differences.

If you want, next step can be to change the app so **every** API call uses the single relative base `api/index.php/v1` (and remove the “production URL” fallback in JS), and add a one-line note in the deploy checklist that prod must support `api/index.php` with path info.
