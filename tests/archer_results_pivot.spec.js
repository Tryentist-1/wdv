// @ts-check
/**
 * Archer Results Pivot - verification tests.
 * Verifies one row per archer (no duplicates) and basic UI behavior.
 */
const { test, expect } = require('@playwright/test');

test.describe('Archer Results Pivot', () => {
  test('should show one row per archer (no duplicate dedupe keys in table)', async ({ page }) => {
    await page.goto('/archer_results_pivot.html');

    const pivotLoc = page.locator('#pivot-container:not(.hidden)');
    const errorLoc = page.locator('#error-state:not(.hidden)');

    await Promise.race([
      pivotLoc.waitFor({ state: 'visible', timeout: 15000 }),
      errorLoc.waitFor({ state: 'visible', timeout: 15000 }),
    ]);

    const pivotVisible = await pivotLoc.isVisible().catch(() => false);
    const errorVisible = await errorLoc.isVisible().catch(() => false);

    if (!pivotVisible && errorVisible) {
      const msg = await page.locator('#error-message').textContent();
      test.skip(true, `No pivot data: ${msg}. Add events/rounds to verify deduplication.`);
      return;
    }

    if (!pivotVisible) {
      throw new Error('Pivot table did not appear within 15s (no table, no error).');
    }

    const rows = page.locator('#pivot-tbody tr');
    const count = await rows.count();
    if (count === 0) {
      test.skip(true, 'Pivot table has no rows.');
      return;
    }

    const keys = [];
    for (let i = 0; i < count; i++) {
      const k = await rows.nth(i).getAttribute('data-archer-dedupe-key');
      keys.push(k ?? '');
    }

    const unique = [...new Set(keys)];
    const duplicates = keys.length - unique.length;
    const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(duplicates, `Expected one row per archer (by dedupe key). Found ${duplicates} duplicate(s).`).toBe(0);
  });
});
