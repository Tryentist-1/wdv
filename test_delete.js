const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('http://localhost:8001/coach.html');

        // Auth
        await page.waitForSelector('#coach-auth-modal', { state: 'visible' });
        await page.fill('#coach-passcode-input', 'wdva26');
        await page.click('#auth-submit-btn');
        await page.waitForSelector('#coach-auth-modal', { state: 'hidden' });

        // Create an event
        await page.waitForSelector('#create-event-btn', { state: 'visible' });
        await page.click('#create-event-btn');

        await page.fill('#event-name', 'Test Playwright Delete Event');
        await page.fill('#event-date', '2026-10-20');
        await page.click('#submit-event-btn');

        // Wait for event list to reload and the new event to appear
        await page.waitForTimeout(2000);

        // Find our new event's edit button
        const editBtn = page.locator('button[title="Edit Event"]').first();
        await editBtn.click();

        // Click delete
        await page.waitForSelector('#edit-delete-event-btn');
        await page.click('#edit-delete-event-btn');

        // Ensure custom modal appears
        await page.waitForSelector('#confirm-modal', { state: 'visible' });
        console.log('Custom modal is VISIBLE.');

        const titleText = await page.locator('#confirm-modal-title').innerText();
        console.log(`Modal Title: ${titleText}`);

        // Click cancel first
        await page.click('#confirm-modal-cancel');
        await page.waitForSelector('#confirm-modal', { state: 'hidden' });
        console.log('Modal HIDDEN after Cancel.');

        const editDialogVisible = await page.isVisible('#edit-event-modal');
        console.log(`Edit dialog still visible after cancel: ${editDialogVisible}`);

        // Click delete again
        await page.click('#edit-delete-event-btn');
        await page.waitForSelector('#confirm-modal', { state: 'visible' });

        // Intercept native alert
        let alertMsg = '';
        page.on('dialog', async dialog => {
            alertMsg = dialog.message();
            console.log(`[Alert intercepted] ${alertMsg}`);
            await dialog.dismiss();
        });

        // Accept custom modal
        await page.click('#confirm-modal-ok');

        // Wait for the deletion request to finish and modal to hide
        await page.waitForSelector('#confirm-modal', { state: 'hidden' });
        console.log('Modal HIDDEN after OK.');
        await page.waitForTimeout(1000); // Give time for alert to show up

    } catch (err) {
        console.error('Error during test:', err);
    } finally {
        await browser.close();
    }
})();
