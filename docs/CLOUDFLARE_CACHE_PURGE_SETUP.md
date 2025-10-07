# Cloudflare Cache Purge Setup

## Overview

The deployment script (`DeployFTP.sh`) now automatically purges the Cloudflare cache after deploying code changes. This ensures users immediately see the latest version without waiting for cache expiry.

## Setup Instructions

### Step 1: Get Your Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Choose one of these options:
   - **Option A (Recommended)**: Use template **"Edit zone DNS"**
   - **Option B**: Create custom token with **"Zone.Cache Purge"** permission
4. Select your zone (tryentist.com)
5. Click **"Continue to summary"**
6. Click **"Create Token"**
7. **IMPORTANT**: Copy the token immediately (you'll only see it once!)

**Example Token**: `your_api_token_here_32_characters_long`

### Step 2: Get Your Cloudflare Zone ID

1. Go to: https://dash.cloudflare.com/
2. Click on your domain (**tryentist.com**)
3. Scroll down on the right sidebar to the **"API"** section
4. Copy the **"Zone ID"**

**Example Zone ID**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### Step 3: Add to .env File

Open or create `.env` in your project root:

```bash
cd /Users/terry/web-mirrors/tryentist/wdv
nano .env
```

Add these lines (replace with your actual values):

```bash
# FTP Credentials (already exists)
FTP_PASSWORD=your_ftp_password

# Cloudflare Credentials (NEW)
CLOUDFLARE_API_TOKEN=your_actual_api_token_here
CLOUDFLARE_ZONE_ID=your_actual_zone_id_here
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Verify .env is Ignored by Git

The `.env` file should already be in `.gitignore`. Verify:

```bash
grep ".env" .gitignore
```

You should see:
```
.env
.env.local
.env.*.local
```

## How It Works

When you run the deployment script:

```bash
bash DeployFTP.sh
```

**Step 5** (new) will automatically:
1. Check if Cloudflare credentials are set
2. Make an API call to purge the entire cache
3. Display success/failure message

**Output Example**:
```
--- Step 5: Purging Cloudflare cache ---
✓ Cloudflare cache purged successfully!
```

If credentials are not set:
```
--- Step 5: Skipping Cloudflare cache purge (credentials not set) ---
To enable cache purging, add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to .env
```

## Testing

Test the cache purge manually:

```bash
# Set environment variables temporarily (for testing)
export CLOUDFLARE_API_TOKEN="your_token_here"
export CLOUDFLARE_ZONE_ID="your_zone_id_here"

# Test the API call
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

**Expected Response**:
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "..."
  }
}
```

## Selective Cache Purge (Optional)

If you want to purge only specific files instead of everything, you can modify the script:

**Current (purge everything)**:
```bash
--data '{"purge_everything":true}'
```

**Alternative (purge specific files)**:
```bash
--data '{
  "files": [
    "https://tryentist.com/wdv/js/ranking_round_300.js",
    "https://tryentist.com/wdv/js/ranking_round.js",
    "https://tryentist.com/wdv/js/coach.js"
  ]
}'
```

## Troubleshooting

### Issue: "✗ Cloudflare cache purge failed"

**Check**:
1. API token is correct (no extra spaces)
2. Zone ID is correct
3. Token has "Cache Purge" permission
4. Token is not expired

**Verify credentials**:
```bash
echo $CLOUDFLARE_API_TOKEN
echo $CLOUDFLARE_ZONE_ID
```

### Issue: "credentials not set"

**Check**:
1. `.env` file exists in project root
2. Variables are named exactly: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID`
3. No quotes around values in .env
4. Script loads .env properly (check line 7-13 in DeployFTP.sh)

### Issue: Token expired

Cloudflare API tokens can expire. Create a new token if needed.

## Security Notes

- ✅ `.env` is in `.gitignore` (credentials never committed to git)
- ✅ API token is **not** displayed in script output
- ✅ Cache purge is optional (script works without it)
- ✅ Use least-privilege token (only "Cache Purge" permission needed)

## Benefits

✅ **Instant updates** - Users see changes immediately
✅ **No manual cache purge** - Automated in deployment
✅ **No downtime** - Cache purge is instant
✅ **Safe fallback** - Skips if credentials not set

## Example .env File

Your `.env` file should look like this:

```bash
# FTP Credentials
FTP_PASSWORD=mySecretFTPPassword123

# Cloudflare Credentials
CLOUDFLARE_API_TOKEN=abcd1234efgh5678ijkl9012mnop3456
CLOUDFLARE_ZONE_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**IMPORTANT**: Never commit this file to git!
