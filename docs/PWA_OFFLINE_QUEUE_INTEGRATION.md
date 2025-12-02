# PWA Service Worker Integration with Offline Queue

## Overview

The PWA service worker (`sw.js`) is designed to work **alongside** your existing localStorage-based offline queue system in `live_updates.js`, not replace it. This document explains how they interact.

## How They Work Together

### Your Existing System (`live_updates.js`)

Your app already has a robust offline queue system:

1. **Network Error Detection**: When API calls fail due to network errors, they're caught and queued
2. **localStorage Queue**: Failed requests stored in localStorage with keys like:
   - `luq:${roundId}` - Ranking round queue
   - `luq:solo:${matchId}` - Solo match queue  
   - `luq:team:${matchId}` - Team match queue
3. **Auto-Flush**: Queues automatically flush when connection is restored (listens to `online` event)
4. **Manual Flush**: `flushQueue()`, `flushSoloQueue()`, `flushTeamQueue()` methods

### Service Worker Role

The service worker **complements** this system by:

1. **Caching Static Assets**: CSS, JS, HTML files cached for offline access
2. **NOT Interfering with Write Operations**: POST/PUT/DELETE requests pass through unchanged so your queue system can detect network failures
3. **Caching Read-Only Data**: GET requests to API are cached, but failures still propagate so the app knows it's offline
4. **Background Sync Support**: Provides background sync events (if browser supports it)

## Request Flow

### Write Operations (POST/PUT/DELETE)

```
User Action → live_updates.js → fetch() → Service Worker (passes through) → Network
                                                                    ↓
                                                              Network Error
                                                                    ↓
                                                          live_updates.js catches error
                                                                    ↓
                                                          Queues in localStorage
                                                                    ↓
                                                          Auto-flush on reconnect
```

**Key Point**: Service worker does NOT intercept write operations, so network errors are properly detected by your queue system.

### Read Operations (GET)

```
User Action → live_updates.js → fetch() → Service Worker → Network
                                                      ↓
                                                Success: Cache response
                                                      ↓
                                                Failure: Try cache
                                                      ↓
                                          No cache: Propagate error
                                                      ↓
                                          App knows it's offline
```

**Key Point**: GET requests can use cached data when offline, but failures still propagate so the app maintains correct offline state.

## Integration Points

### 1. Online/Offline Events

Your existing code already listens to `online` events:

```javascript
// In ranking_round_300.js
window.addEventListener('online', () => { 
  LiveUpdates.flushQueue && LiveUpdates.flushQueue(); 
});
```

The service worker **does not interfere** with this. It also listens and can trigger flushes via messages, but your existing event listeners continue to work.

### 2. Queue Flushing

The service worker can request queue flushes via messages:

```javascript
// Service worker sends message
client.postMessage({ type: 'FLUSH_QUEUES' });

// Page receives and flushes
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'FLUSH_QUEUES') {
    LiveUpdates.flushQueue();
  }
});
```

This is **additive** - your existing `online` event handlers still work.

### 3. Background Sync

If the browser supports Background Sync API, the service worker can trigger sync events:

```javascript
// Service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    // Notify page to flush queues
  }
});
```

This provides **additional** sync opportunities beyond the `online` event.

## What the Service Worker Does NOT Do

1. **Does NOT replace your queue system** - Your localStorage-based queue remains the primary mechanism
2. **Does NOT mask network failures** - Write operations pass through so errors are detected
3. **Does NOT interfere with existing flush logic** - Your `flushQueue()` methods work unchanged
4. **Does NOT cache write operations** - Only GET requests are cached

## Benefits of This Integration

1. **Faster Loading**: Static assets cached for instant loading
2. **Better Offline Experience**: Read-only data (archer lists, events) available offline
3. **No Breaking Changes**: Your existing queue system works exactly as before
4. **Enhanced Sync**: Additional sync opportunities via background sync API
5. **Progressive Enhancement**: Works even if service worker fails or is unsupported

## Testing

To verify the integration works correctly:

1. **Test Offline Queue**:
   - Go offline
   - Submit a score
   - Verify it's queued in localStorage (`luq:${roundId}`)
   - Go online
   - Verify queue flushes automatically

2. **Test Service Worker Caching**:
   - Load the app
   - Go offline
   - Reload page
   - Verify static assets (CSS, JS) load from cache
   - Verify HTML pages load from cache

3. **Test Write Operations**:
   - Go offline
   - Submit a score
   - Verify network error is caught (not masked by service worker)
   - Verify request is queued
   - Go online
   - Verify queue flushes

## Troubleshooting

### Queue Not Flushing

- Check that `online` event listeners are still active
- Verify `LiveUpdates.flushQueue()` is being called
- Check browser console for errors
- Service worker messages are additive, not required

### Service Worker Masking Errors

- Verify service worker doesn't intercept POST/PUT/DELETE (it shouldn't)
- Check that network errors propagate correctly
- Look for `X-Cache-Status: stale` header on cached GET responses

### Cache Conflicts

- Clear service worker cache: DevTools → Application → Cache Storage
- Clear localStorage queues if needed
- Use "Reset Data" button in app (already clears both)

## Summary

The service worker and your offline queue system work **together**:

- **Service Worker**: Handles static asset caching and read-only data
- **Your Queue System**: Handles write operations and sync logic
- **Integration**: Service worker enhances but doesn't replace your system

This design ensures:
- ✅ No breaking changes to existing functionality
- ✅ Better offline experience for static assets
- ✅ Your queue system continues to work as designed
- ✅ Progressive enhancement

