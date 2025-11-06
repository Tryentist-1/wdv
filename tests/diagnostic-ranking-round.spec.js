// diagnostic-ranking-round.spec.js
// Quick diagnostic test to capture errors when opening ranking round page
const { test, expect } = require('@playwright/test');

test('diagnostic: capture errors when opening ranking round', async ({ page }) => {
  const errors = [];
  const warnings = [];
  
  // Clear localStorage first to test fresh state
  await page.addInitScript(() => {
    try {
      const config = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
      if (config.apiBase && config.apiBase.includes('tryentist.com')) {
        delete config.apiBase;
        localStorage.setItem('live_updates_config', JSON.stringify(config));
      }
    } catch (e) {}
  });
  
  // Capture console errors and warnings
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    }
  });
  
  // Capture network failures
  page.on('requestfailed', request => {
    errors.push(`Network request failed: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  // Capture unhandled promise rejections
  page.on('pageerror', error => {
    errors.push(`Page error: ${error.message}`);
  });
  
  // Navigate to ranking round page
  await page.goto('/ranking_round_300.html');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  
  // Wait a bit for any async initialization
  await page.waitForTimeout(2000);
  
  // Check if key elements exist
  const setupView = await page.locator('#setup-view').isVisible();
  const eventModal = await page.locator('#event-modal').isVisible();
  
  console.log('\n=== DIAGNOSTIC RESULTS ===');
  console.log(`Setup view visible: ${setupView}`);
  console.log(`Event modal visible: ${eventModal}`);
  console.log(`\nErrors (${errors.length}):`);
  errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
  
  // Check for common issues
  const apiInfo = await page.evaluate(() => {
    const liveUpdatesApiBase = (window.LiveUpdates && window.LiveUpdates._state && window.LiveUpdates._state.config) 
      ? window.LiveUpdates._state.config.apiBase 
      : null;
    
    // Check if ranking_round_300.js has set API_BASE (it's in a closure, so we can't access it directly)
    // But we can check what fetch calls are being made by looking at network requests
    
    return {
      liveUpdatesApiBase,
      hostname: window.location.hostname,
      port: window.location.port || '8001',
      expectedLocalApi: `http://${window.location.hostname}:${window.location.port || '8001'}/api/index.php/v1`
    };
  });
  
  console.log(`\nAPI Info:`);
  console.log(`  Hostname: ${apiInfo.hostname}`);
  console.log(`  Port: ${apiInfo.port}`);
  console.log(`  Expected Local API: ${apiInfo.expectedLocalApi}`);
  console.log(`  LiveUpdates API Base: ${apiInfo.liveUpdatesApiBase || 'NOT SET'}`);
  
  // Take a screenshot for visual debugging
  await page.screenshot({ path: 'test-results/diagnostic-ranking-round.png', fullPage: true });
  console.log('\nScreenshot saved to: test-results/diagnostic-ranking-round.png');
});

