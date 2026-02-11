# Config File Setup

## Overview

Application config uses a layered approach:

| File | Committed? | Purpose |
|------|------------|---------|
| `api/config.php` | ✅ Yes | Defaults and structure; safe to commit |
| `api/config.local.php.example` | ✅ Yes | Template with placeholders; copy to create local config |
| `api/config.local.php` | ❌ No | Your actual credentials; **never committed** |

## Local Development

1. Copy the template:
   ```bash
   cp api/config.local.php.example api/config.local.php
   ```

2. Edit `api/config.local.php` if needed. For Docker, the example defaults work as-is.

3. Never commit `config.local.php` — it's in `.gitignore`.

## Production

1. Create `api/config.local.php` **on the server only** (via File Manager or FTP).

2. Use credentials from your hosting panel (Databases → MySQL).

3. The deploy script **never uploads** `config.local.php` — prod config stays on the server.

## Files With Credentials (Never Commit)

These are in `.gitignore`:

- `.env` — FTP password, Cloudflare tokens
- `.env.local` — Local env overrides
- `config.local.php` — DB credentials, API keys
- `api/config.local.php.production` — Production config template with real credentials (if you created one locally)

## Template Workflow

```
config.local.php.example  →  copy  →  config.local.php  →  add your credentials
       (committed)                      (gitignored)           (never commit)
```
