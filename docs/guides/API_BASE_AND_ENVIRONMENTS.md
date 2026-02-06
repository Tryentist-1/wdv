# API Base URL and Environments

**Purpose:** Clarify when the app works or fails in different environments, and how to keep it **not brittle**.

---

## Will it fail on production? On another dev box?

**Short answer:**

| Environment | Will it fail? | Why |
|-------------|----------------|-----|
| **Your production server** (archery.tryentist.com) | **No**, if the server is set up to handle the API (see below). | Code uses either a relative path or the production URL; both can work. |
| **Another dev box** (e.g. `php -S localhost:8001` or another port) | **No**, if that box uses the **same** API base rule (localhost → `api/index.php/v1`). | Same codebase, same logic. |
| **PHP built-in server** (`php -S ...`) with old hardcoded `api/v1` | **Yes** — 404s. | Built-in server only routes requests that hit `api/index.php`; `api/v1/...` is not routed. |
| **Nginx/Apache without path-info or rewrite** | **Could fail** if the server doesn’t route API requests to `api/index.php`. | Server must either pass path info for `api/index.php/v1/...` or rewrite `api/v1/...` to the PHP script. |

So the app is **brittle only if** (1) the server doesn’t route API requests to `api/index.php`, or (2) frontend code uses `api/v1` on a server that doesn’t rewrite that path (e.g. PHP built-in server).

---

## Why the 404s happened (dev)

- **PHP built-in server** does not rewrite URLs. A request to `api/v1/archers` looks for a **file** at that path; there is none, so you get 404.
- The only way to hit the API is to request a path that is actually handled by PHP, e.g. `api/index.php`. So we use **`api/index.php/v1`** (path after the script is the route).

So in dev we are **not** brittle to “different dev box” — we’re brittle only to **how** the server is run. Once we use `api/index.php/v1` for local dev, any dev box using `php -S` (or the same nginx config) behaves the same.

---

## Will production fail when you upload?

**No**, as long as the production server is configured to run the API. Two common setups:

1. **Path-info style (recommended, matches this repo)**  
   - Request: `https://archery.tryentist.com/api/index.php/v1/archers`  
   - Server sends that request to `api/index.php` and passes path info `/v1/archers`.  
   - The repo’s `nginx.conf` does this (`location ~ \.php(/|$)` and `PATH_INFO`).  
   - So production **will not fail** if it uses this style (or equivalent).

2. **Rewrite style**  
   - Request: `https://archery.tryentist.com/api/v1/archers`  
   - Server rewrites to `api/index.php` (and route `/v1/archers`).  
   - Our code sometimes uses `https://archery.tryentist.com/api/v1` for “production”. That **only** works if the server has this rewrite.  
   - If production uses the repo nginx as-is (no rewrite), then `api/v1` on production would 404; in that case we should use `api/index.php/v1` on production too (see below).

So: **uploading the same codebase does not by itself break production.** What matters is that the server config matches what the frontend uses (`api/index.php/v1` or `api/v1`).

---

## Making the app not brittle: one rule everywhere

**Recommendation:** Use a **single**, **relative** API base everywhere the app runs:

- **API base:** `api/index.php/v1` (relative to the page origin, no hostname).

Then:

- **Any dev box:** Same origin → `api/index.php/v1` works (e.g. `http://localhost:8001/api/index.php/v1/...`).
- **Production:** Same origin → `https://archery.tryentist.com/api/index.php/v1/...`; works if the server handles `api/index.php` with path info (like the repo nginx).
- **No** dependency on “localhost vs production” in the frontend; one code path for all environments.

**Current state:**

- **index.html** already uses relative `api/index.php/v1` → good, works everywhere.
- **live_updates.js**, **solo_card.js**, **team_card.js**, and some HTML pages use:  
  - localhost → full URL with `api/index.php/v1`  
  - else → `https://archery.tryentist.com/api/v1`  

So today we have two patterns. To remove environment brittleness:

- Prefer **relative** `api/index.php/v1` for all same-origin API calls (no hostname, no if-localhost).  
- Ensure production server is configured so that `.../api/index.php/v1/...` is routed to `api/index.php` (path info). The repo `nginx.conf` is already correct for this.

After that, the app will **not** fail when you upload to your webserver (as long as that server is configured like the repo nginx), and **not** fail on a different dev box.

---

## Server requirements (one sentence)

**The server must route requests to `api/index.php` and pass the rest of the path as the route** (e.g. `/api/index.php/v1/archers` → script `api/index.php`, route `/v1/archers`). The repo’s `nginx.conf` and PHP’s built-in server (when using `api/index.php/v1` in the URL) both support this.

---

## Optional: production rewrite for “pretty” `/api/v1` URLs

If you want `https://archery.tryentist.com/api/v1/health` to work (e.g. for docs or external checks), add a rewrite in nginx so `/api/v1/...` is handled by `api/index.php` with the path. The **app** can still use `api/index.php/v1` everywhere; then it never depends on that rewrite and stays non-brittle.
