# PWA Setup Guide

This guide explains the Progressive Web App (PWA) setup for OAS Score & Tools and how to complete the installation.

## What's Been Added

The following PWA components have been created:

### 1. Web App Manifest (`manifest.json`)
- Defines app metadata (name, description, theme colors)
- Specifies icon sizes and display mode
- Includes app shortcuts for quick access to Ranking, Solo, and Team matches
- Configured for mobile-first experience (portrait orientation)

### 2. Service Worker (`sw.js`)
- Caches static assets (CSS, JS, HTML) for offline access
- Implements cache-first strategy for static resources
- Implements network-first strategy for API calls (with cache fallback)
- **Designed to work WITH your existing localStorage-based offline queue** in `live_updates.js`
- Does NOT interfere with write operations (POST/PUT/DELETE pass through)
- Supports background sync as an enhancement to your existing queue system
- See `docs/PWA_OFFLINE_QUEUE_INTEGRATION.md` for detailed integration notes

### 3. Offline Fallback Page (`offline.html`)
- Shown when the app is completely offline
- Provides user feedback and retry options
- Automatically reloads when connection is restored

### 4. Service Worker Registration
- Added to `index.html` to register the service worker
- Handles updates and new version notifications
- Checks for updates hourly

## What You Need to Do

### Step 1: Create App Icons

The PWA requires icons in multiple sizes. You have three options:

#### Option A: Use the Placeholder Generator (Quick Start)

1. Open `icons/create-placeholder-icon.html` in a browser
2. Click "Generate All Icons" to preview
3. Click "Download All as ZIP" to download all sizes
4. Place the downloaded PNG files in the `icons/` directory

#### Option B: Generate from Your Logo

If you have a logo image (at least 512x512 pixels):

```bash
cd icons
./generate-icons.sh ../path/to/your-logo.png
```

This requires ImageMagick:
- macOS: `brew install imagemagick`
- Linux: `sudo apt-get install imagemagick`

#### Option C: Use Online Tools

1. Create or obtain a square logo (512x512 minimum)
2. Use an online PWA icon generator:
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/
3. Download all required sizes and place in `icons/` directory

**Required icon sizes:**
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### Step 2: Test the PWA

#### On Desktop (Chrome/Edge)

1. Open the app in Chrome or Edge
2. Open DevTools (F12) → Application tab
3. Check "Manifest" section - should show your app details
4. Check "Service Workers" section - should show registered worker
5. Check "Cache Storage" - should show cached assets

#### On Mobile (iOS Safari)

1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Verify the icon appears correctly
5. Open the app from home screen - should launch in standalone mode

#### On Mobile (Android Chrome)

1. Open the app in Chrome
2. Look for the "Add to Home Screen" banner (may appear automatically)
3. Or tap the menu (⋮) → "Add to Home Screen"
4. Verify installation and icon appearance

### Step 3: Verify HTTPS

PWAs require HTTPS (except for localhost). Ensure your production site is served over HTTPS:

- ✅ Production: `https://tryentist.com/wdv/` (already HTTPS)
- ✅ Local development: `http://localhost:8001` (allowed for development)

### Step 4: Test Offline Functionality

1. Open the app in Chrome DevTools
2. Go to Network tab → Check "Offline"
3. Reload the page - should show offline.html
4. Uncheck "Offline" - page should reload automatically
5. Test that cached pages load without network

## PWA Features Enabled

### ✅ Installable
- Users can add the app to their home screen
- App launches in standalone mode (no browser UI)
- Custom splash screen on Android

### ✅ Offline Support
- Static assets cached for offline access
- API calls queued when offline (via existing `live_updates.js`)
- Graceful degradation with offline fallback page

### ✅ Fast Loading
- Assets cached for instant loading
- Service worker pre-caches critical resources
- Network-first for dynamic content, cache-first for static

### ✅ App Shortcuts
- Quick access to Ranking Round, Solo Match, Team Match
- Appears in long-press menu on Android

## Configuration

### Updating the Manifest

Edit `manifest.json` to customize:
- App name and description
- Theme colors (currently blue: `#2563eb`)
- Icon paths (if you use different filenames)
- Shortcuts (quick access actions)

### Updating the Service Worker

The service worker (`sw.js`) caches:
- Static assets (CSS, JS, HTML)
- External resources (Font Awesome)
- API responses (for offline fallback)

To update cached assets:
1. Change the `CACHE_NAME` version in `sw.js`
2. Deploy the update
3. Users will get the new version on next visit

### Cache Management

The service worker uses two caches:
- `oas-score-v1`: Static assets (installed on first visit)
- `oas-runtime-v1`: Runtime cache (API responses, dynamic content)

To clear all caches (for testing):
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

Or use the "Reset Data" button in the app (already clears caches).

## Troubleshooting

### Icons Not Showing
- Verify icons exist in `icons/` directory
- Check file names match manifest.json exactly
- Ensure icons are valid PNG files
- Clear browser cache and service worker

### Service Worker Not Registering
- Check browser console for errors
- Verify `sw.js` is accessible at `/sw.js`
- Ensure HTTPS (required for production)
- Check browser supports service workers

### App Not Installable
- Verify manifest.json is valid JSON
- Check all required icons exist
- Ensure HTTPS (or localhost for development)
- Check manifest is linked in index.html
- Verify service worker is registered

### Offline Not Working
- Check service worker is active (DevTools → Application → Service Workers)
- Verify assets are cached (DevTools → Application → Cache Storage)
- Check network tab to see what's being requested
- Clear cache and re-register service worker

## Best Practices

1. **Update Icons**: Replace placeholder icons with your brand icons
2. **Test Regularly**: Test PWA features after each deployment
3. **Monitor Cache**: Keep cache sizes reasonable (current setup is fine)
4. **Version Control**: Update `CACHE_NAME` when making breaking changes
5. **User Communication**: Consider showing update notifications when new version is available

## Next Steps (Optional Enhancements)

- [ ] Push notifications for event updates
- [ ] Background sync for offline score submissions
- [ ] Install prompt UI (custom "Add to Home Screen" button)
- [ ] Update notification when new version is available
- [ ] Analytics for PWA installs and usage

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

