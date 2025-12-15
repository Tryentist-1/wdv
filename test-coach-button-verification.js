/**
 * Coach Button Visibility Verification Script
 * 
 * Run this in the browser console on archer_list.html after logging in as coach
 * Copy and paste the entire script into the console
 */

(function() {
    console.log('=== Coach Button Visibility Verification ===\n');
    
    // Check coach mode
    function isCoachMode() {
        try {
            const configRaw = localStorage.getItem('live_updates_config') || '{}';
            const config = JSON.parse(configRaw);
            const coachKey = (config && config.apiKey) || localStorage.getItem('coach_api_key') || '';
            return !!(coachKey && coachKey.trim());
        } catch (_) {
            return false;
        }
    }
    
    const coachMode = isCoachMode();
    console.log('1. Coach Mode Detection:');
    console.log('   ✅ Coach Mode:', coachMode ? 'DETECTED' : 'NOT DETECTED');
    console.log('   📋 coach_api_key:', localStorage.getItem('coach_api_key') || 'NOT SET');
    console.log('   📋 live_updates_config:', localStorage.getItem('live_updates_config') || 'NOT SET');
    console.log('');
    
    // Check buttons
    const buttons = [
        { id: 'export-roster-btn', name: 'Export Roster' },
        { id: 'import-usa-archery-btn', name: 'Import USA' },
        { id: 'export-usa-archery-btn', name: 'Export USA' }
    ];
    
    console.log('2. Button Status:');
    buttons.forEach(btnInfo => {
        const btn = document.getElementById(btnInfo.id);
        if (!btn) {
            console.log(`   ❌ ${btnInfo.name}: NOT FOUND IN DOM`);
            return;
        }
        
        const hasHidden = btn.classList.contains('hidden');
        const computedDisplay = getComputedStyle(btn).display;
        const inlineDisplay = btn.style.display;
        const isVisible = computedDisplay !== 'none' && !hasHidden;
        
        console.log(`   ${isVisible ? '✅' : '❌'} ${btnInfo.name}:`);
        console.log(`      - In DOM: YES`);
        console.log(`      - Has 'hidden' class: ${hasHidden}`);
        console.log(`      - Computed display: ${computedDisplay}`);
        console.log(`      - Inline display: ${inlineDisplay || '(none)'}`);
        console.log(`      - Visible: ${isVisible ? 'YES' : 'NO'}`);
        console.log(`      - Classes: ${btn.className}`);
        console.log('');
    });
    
    // Check footer
    const footer = document.querySelector('footer');
    if (footer) {
        const footerButtons = footer.querySelectorAll('button');
        console.log('3. Footer Button Count:', footerButtons.length);
        footerButtons.forEach((btn, idx) => {
            const display = getComputedStyle(btn).display;
            const isVisible = display !== 'none';
            console.log(`   ${isVisible ? '✅' : '❌'} Button ${idx + 1}: ${btn.id || '(no id)'} - display: ${display}`);
        });
    }
    
    console.log('\n=== Verification Complete ===');
    console.log('\nIf buttons are not visible but coach mode is detected:');
    console.log('1. Check browser console for [Button Visibility] logs');
    console.log('2. Try manually running: updateCoachButtonsVisibility()');
    console.log('3. Check if buttons are hidden by parent container CSS');
})();

