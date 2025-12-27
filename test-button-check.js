// Quick test script to check button visibility logic
const testCoachMode = () => {
    // Simulate localStorage
    const mockLocalStorage = {
        'coach_api_key': 'wdva26',
        'live_updates_config': JSON.stringify({ apiKey: 'wdva26', enabled: true })
    };
    
    function isCoachMode() {
        try {
            const configRaw = mockLocalStorage['live_updates_config'] || '{}';
            const config = JSON.parse(configRaw);
            const coachKey = (config && config.apiKey) || mockLocalStorage['coach_api_key'] || '';
            return !!(coachKey && coachKey.trim());
        } catch (_) {
            return false;
        }
    }
    
    const isCoach = isCoachMode();
    console.log('Coach Mode Test:', {
        isCoach,
        hasApiKey: !!mockLocalStorage['coach_api_key'],
        hasConfig: !!mockLocalStorage['live_updates_config']
    });
    
    return isCoach;
};

console.log('Testing coach mode detection...');
const result = testCoachMode();
console.log('Result:', result ? '✅ Coach mode detected' : '❌ Coach mode NOT detected');
