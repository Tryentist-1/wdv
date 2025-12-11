# PWA Deployment Checklist - v1.8.3

## Pre-Deployment Verification

### 1. Files to Deploy
- [x] `manifest.json` - Web app manifest
- [x] `sw.js` - Service worker
- [x] `offline.html` - Offline fallback page
- [x] `index.html` - Updated with manifest link and service worker registration
- [x] `icons/` directory - All 8 icon sizes (icon-72x72.png through icon-512x512.png)
- [x] `docs/PWA_SETUP_GUIDE.md` - Documentation
- [x] `docs/PWA_OFFLINE_QUEUE_INTEGRATION.md` - Integration guide
- [x] `PWA_QUICK_START.md` - Quick reference
- [x] `RELEASE_NOTES_v1.8.3.md` - Release notes

### 2. Icon Verification
- [x] All icons exist in `icons/` directory
- [x] Icons named correctly: `icon-{size}x{size}.png`
- [x] All 8 required sizes present:
  - icon-72x72.png
  - icon-96x96.png
  - icon-128x128.png
  - icon-144x144.png
  - icon-152x152.png
  - icon-192x192.png
  - icon-384x384.png
  - icon-512x512.png

### 3. Manifest Validation
- [x] `manifest.json` is valid JSON
- [x] All icon paths point to correct files
- [x] Theme colors match app design
- [x] Start URL is correct (`/`)

### 4. Service Worker Testing
- [x] Service worker registers without errors
- [x] Static assets cache correctly
- [x] Offline page displays when offline
- [x] Write operations (POST/PUT/DELETE) pass through unchanged
- [x] Existing offline queue still works

## Deployment Steps

### 1. Deploy Files
```bash
cd /Users/terry/web-mirrors/tryentist/wdv
./scripts/deploy/DeployFTP.sh
```

**What gets deployed:**
- `manifest.json` - Web app manifest
- `sw.js` - Service worker
- `offline.html` - Offline fallback page
- `index.html` - Updated with PWA support
- `icons/` - All icon files
- Documentation files (optional, but recommended)

### 2. Verify Production

**Manifest Check:**
- [ ] https://tryentist.com/wdv/manifest.json → Loads and is valid JSON
- [ ] Chrome DevTools → Application → Manifest → Shows app details

**Service Worker Check:**
- [ ] https://tryentist.com/wdv/sw.js → Loads (should see service worker code)
- [ ] Chrome DevTools → Application → Service Workers → Shows registered worker
- [ ] Chrome DevTools → Application → Cache Storage → Shows cached assets

**Icons Check:**
- [ ] https://tryentist.com/wdv/icons/icon-192x192.png → Loads
- [ ] https://tryentist.com/wdv/icons/icon-512x512.png → Loads
- [ ] All 8 icon sizes accessible

**PWA Installation:**
- [ ] **iOS:** Safari → Share → "Add to Home Screen" → Works
- [ ] **Android:** Chrome → Menu → "Add to Home Screen" → Works
- [ ] **Desktop:** Chrome/Edge → Install button appears

**Offline Functionality:**
- [ ] Go offline (DevTools → Network → Offline)
- [ ] Reload page → Offline page displays
- [ ] Go online → Page reloads automatically
- [ ] Static assets load from cache when offline

**Integration Testing:**
- [ ] Existing offline queue still works
- [ ] Write operations (score submission) work offline
- [ ] Queue flushes on reconnect
- [ ] No conflicts with localStorage system

### 3. Purge Cloudflare Cache
```bash
./tests/scripts/test_cloudflare.sh
```

Or manually purge cache in Cloudflare dashboard to ensure fresh assets.

## Post-Deployment Verification

### User Testing
- [ ] Install app on iOS device
- [ ] Install app on Android device
- [ ] Verify app launches in standalone mode
- [ ] Test offline functionality
- [ ] Verify shortcuts work (long-press app icon)

### Monitoring
- [ ] Check browser console for service worker errors
- [ ] Monitor service worker registration success rate
- [ ] Verify cache storage is working
- [ ] Check for any 404 errors on icon files

## Rollback Plan

If critical issues occur:

1. **Disable Service Worker:**
   - Remove service worker registration from `index.html`
   - Deploy updated `index.html`
   - Service worker will eventually unregister

2. **Remove PWA Files:**
   - Delete `manifest.json`, `sw.js`, `offline.html` from server
   - App continues to work without PWA features

3. **Full Rollback:**
   ```bash
   git log --oneline -10  # Find last good commit
   git checkout {commit-hash}
   ./scripts/deploy/DeployFTP.sh
   ```

## Success Criteria

✅ **Deployment Successful If:**
- Manifest accessible and valid
- Service worker registers successfully
- Icons load correctly
- PWA installable on iOS and Android
- Offline page displays when offline
- Existing offline queue still works
- No console errors
- No 404 errors for PWA files

## Notes

- **HTTPS Required:** PWA requires HTTPS (already have this)
- **Service Worker Scope:** Service worker scoped to `/` (root)
- **Cache Version:** Service worker uses `CACHE_NAME = 'oas-score-v1'` - increment for cache busting
- **Icon Quality:** 384x384 icon created from 256x256 - may need optimization later

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Git Commit:** _____________  
**Production URL:** https://tryentist.com/wdv/






