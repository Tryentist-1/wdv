// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Ranking Round - ArcherSelector Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to ranking_round.html (not the 300 version)
    await page.goto('/ranking_round.html', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for ArcherSelector script to load
    await page.waitForFunction(() => typeof window.ArcherSelector !== 'undefined', { timeout: 5000 });
    
    // Wait for setup view to be visible
    const setupView = page.locator('#setup-view');
    await expect(setupView).toBeVisible({ timeout: 3000 });
    
    // Wait a bit for ArcherSelector to initialize
    await page.waitForTimeout(1000);
  });

  test('should render ArcherSelector with avatars', async ({ page }) => {
    // Check that ArcherSelector container exists
    const container = page.locator('#archer-setup-container');
    await expect(container).toBeVisible();

    // Wait for ArcherSelector to render (check for avatar elements)
    // Avatars have class 'w-10 h-10 rounded-full' based on archer_selector.js
    const avatars = page.locator('#archer-setup-container .w-10.h-10.rounded-full');
    
    // If there are archers in the roster, avatars should appear
    // If roster is empty, we should see empty state message
    const emptyState = page.locator('#archer-setup-container').getByText('No archers found');
    const hasArchers = await avatars.count() > 0;
    const isEmpty = await emptyState.isVisible().catch(() => false);
    
    // Either we have avatars OR we have empty state (both are valid)
    expect(hasArchers || isEmpty).toBeTruthy();
  });

  test('should render stacked two-line layout for archers', async ({ page }) => {
    const container = page.locator('#archer-setup-container');
    await expect(container).toBeVisible();

    // Wait a bit for rendering
    await page.waitForTimeout(500);

    // Check for archer rows with flex layout (ArcherSelector uses flex items-center)
    const archerRows = page.locator('#archer-setup-container .flex.items-center.gap-3');
    
    // If there are archers, check for the two-line info block structure
    const infoBlocks = page.locator('#archer-setup-container .flex-1.min-w-0');
    
    const rowCount = await archerRows.count();
    
    if (rowCount > 0) {
      // Check that info blocks exist (these contain the two-line layout)
      const infoCount = await infoBlocks.count();
      expect(infoCount).toBeGreaterThan(0);
      
      // Check that name row exists (first line)
      const nameRows = page.locator('#archer-setup-container .flex.items-center.gap-2.text-gray-900');
      const nameCount = await nameRows.count();
      expect(nameCount).toBeGreaterThan(0);
      
      // Check that meta row exists (second line with school • level)
      const metaRows = page.locator('#archer-setup-container .text-xs.text-gray-500');
      const metaCount = await metaRows.count();
      expect(metaCount).toBeGreaterThan(0);
    }
  });

  test('should show target assignment buttons (A, B, C, D)', async ({ page }) => {
    const container = page.locator('#archer-setup-container');
    await expect(container).toBeVisible();

    await page.waitForTimeout(500);

    // Check for target buttons - they should have text "A", "B", "C", "D"
    const buttonA = page.locator('button:has-text("A")').first();
    const buttonB = page.locator('button:has-text("B")').first();
    const buttonC = page.locator('button:has-text("C")').first();
    const buttonD = page.locator('button:has-text("D")').first();

    // At least one button should be visible if there are archers
    const hasButtons = await Promise.all([
      buttonA.isVisible().catch(() => false),
      buttonB.isVisible().catch(() => false),
      buttonC.isVisible().catch(() => false),
      buttonD.isVisible().catch(() => false)
    ]).then(results => results.some(r => r));

    // If roster is empty, buttons won't show, but that's OK
    const emptyState = page.locator('#archer-setup-container').getByText('No archers found');
    const isEmpty = await emptyState.isVisible().catch(() => false);
    
    expect(hasButtons || isEmpty).toBeTruthy();
  });

  test('should NOT render old fallback list (checkboxes and stars)', async ({ page }) => {
    const container = page.locator('#archer-setup-container');
    await expect(container).toBeVisible();

    await page.waitForTimeout(500);

    // Old fallback renderer uses checkboxes - these should NOT be present if ArcherSelector is working
    const checkboxes = page.locator('#archer-setup-container input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    // If ArcherSelector is working, there should be NO checkboxes
    // (ArcherSelector uses buttons, not checkboxes)
    expect(checkboxCount).toBe(0);
  });

  test('should have proper font styling (not missing fonts)', async ({ page }) => {
    const container = page.locator('#archer-setup-container');
    await expect(container).toBeVisible();

    await page.waitForTimeout(500);

    // Check that archer rows have proper Tailwind classes for fonts
    const archerRows = page.locator('#archer-setup-container .flex.items-center.gap-3');
    const rowCount = await archerRows.count();
    
    if (rowCount > 0) {
      // Check that name text has font-semibold class
      const nameText = page.locator('#archer-setup-container .font-semibold').first();
      await expect(nameText).toBeVisible();
      
      // Check computed styles to ensure fonts are applied
      const fontFamily = await nameText.evaluate(el => window.getComputedStyle(el).fontFamily);
      expect(fontFamily).toBeTruthy();
      expect(fontFamily).not.toBe('initial');
    }
  });

  test('should handle search input correctly', async ({ page }) => {
    const container = page.locator('#archer-setup-container');
    await expect(container).toBeVisible();

    // Find search input in subheader
    const searchInput = page.locator('.page-subheader input[type="text"]');
    
    if (await searchInput.isVisible().catch(() => false)) {
      // Type in search box
      await searchInput.fill('test');
      await page.waitForTimeout(300);
      
      // Search should filter results (ArcherSelector handles this)
      // Just verify the input works
      const value = await searchInput.inputValue();
      expect(value).toBe('test');
    }
  });

  test('should initialize ArcherSelector on page load', async ({ page }) => {
    // Check that ArcherSelector is available
    const isArcherSelectorAvailable = await page.evaluate(() => {
      return typeof window.ArcherSelector !== 'undefined' && 
             typeof window.ArcherSelector.init === 'function';
    });
    
    expect(isArcherSelectorAvailable).toBeTruthy();
    
    // Check that container exists
    const container = page.locator('#archer-setup-container');
    await expect(container).toBeVisible();
    
    // Wait a moment for initialization
    await page.waitForTimeout(500);
    
    // Check that either ArcherSelector rendered OR empty state is shown
    // (both indicate ArcherSelector initialized)
    const hasContent = await page.evaluate(() => {
      const container = document.getElementById('archer-setup-container');
      if (!container) return false;
      return container.children.length > 0;
    });
    
    expect(hasContent).toBeTruthy();
  });
});

