<?php
// Simple API test harness
require_once __DIR__ . '/db.php';

function test_api($endpoint, $method = 'GET', $data = null, $headers = []) {
    $url = "https://tryentist.com/wdv/api/v1$endpoint";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge([
        'Content-Type: application/json',
        'X-Passcode: wdva26'
    ], $headers));
    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'body' => json_decode($response, true),
        'raw' => $response
    ];
}

echo "=== API Test Harness ===\n\n";

// Test 1: Health check
echo "1. Health check:\n";
$result = test_api('/health');
echo "   Code: {$result['code']}\n";
echo "   Body: " . json_encode($result['body']) . "\n\n";

// Test 2: Create round
echo "2. Create round:\n";
$result = test_api('/rounds', 'POST', [
    'roundType' => 'R300',
    'date' => '2025-09-22',
    'baleNumber' => 1
]);
echo "   Code: {$result['code']}\n";
echo "   Body: " . json_encode($result['body']) . "\n";
$roundId = $result['body']['roundId'] ?? null;
echo "   Round ID: $roundId\n\n";

if ($roundId) {
    // Test 3: Create archer
    echo "3. Create archer:\n";
    $result = test_api("/rounds/$roundId/archers", 'POST', [
        'archerName' => 'Test Archer',
        'school' => 'WDV',
        'level' => 'V',
        'gender' => 'M',
        'targetAssignment' => 'A'
    ]);
    echo "   Code: {$result['code']}\n";
    echo "   Body: " . json_encode($result['body']) . "\n";
    $archerId = $result['body']['roundArcherId'] ?? null;
    echo "   Archer ID: $archerId\n\n";
    
    if ($archerId) {
        // Test 4: Post end score
        echo "4. Post end score:\n";
        $result = test_api("/rounds/$roundId/archers/$archerId/ends", 'POST', [
            'endNumber' => 1,
            'a1' => '10',
            'a2' => '10', 
            'a3' => '10',
            'endTotal' => 30,
            'runningTotal' => 30,
            'tens' => 3,
            'xs' => 0,
            'deviceTs' => date('c')
        ]);
        echo "   Code: {$result['code']}\n";
        echo "   Body: " . json_encode($result['body']) . "\n\n";
        
        // Test 5: Get round snapshot
        echo "5. Get round snapshot:\n";
        $result = test_api("/rounds/$roundId/snapshot");
        echo "   Code: {$result['code']}\n";
        echo "   Body: " . json_encode($result['body']) . "\n\n";
    }
}

// Test 6: Try duplicate round (should return existing)
echo "6. Try duplicate round:\n";
$result = test_api('/rounds', 'POST', [
    'roundType' => 'R300',
    'date' => '2025-09-22',
    'baleNumber' => 1
]);
echo "   Code: {$result['code']}\n";
echo "   Body: " . json_encode($result['body']) . "\n\n";

echo "=== Test Complete ===\n";
?>
