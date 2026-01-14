<?php
/**
 * Test script to verify GET /v1/archers returns all fields
 * Run this to check if any fields are missing from the response
 */

require_once __DIR__ . '/../api/db.php';

try {
    $pdo = db();
    
    // Get actual database columns
    $stmt = $pdo->query("SHOW COLUMNS FROM archers");
    $dbColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $dbFieldNames = array_column($dbColumns, 'Field');
    
    // Fields that should be in GET response (camelCase versions)
    $expectedResponseFields = [
        'id', 'extId', 'firstName', 'lastName', 'nickname', 'photoUrl',
        'school', 'grade', 'gender', 'level', 'status', 'faves',
        'domEye', 'domHand', 'heightIn', 'wingspanIn', 'drawLengthSugg',
        'riserHeightIn', 'limbLength', 'limbWeightLbs',
        'notesGear', 'notesCurrent', 'notesArchive',
        'email', 'email2', 'phone', 'dob', 'nationality', 'ethnicity', 'discipline',
        'streetAddress', 'streetAddress2', 'city', 'state', 'postalCode',
        'disability', 'campAttendance', 'validFrom', 'clubState', 'membershipType',
        'addressCountry', 'addressLine3', 'disabilityList', 'militaryService',
        'introductionSource', 'introductionOther', 'nfaaMemberNo',
        'schoolType', 'schoolFullName', 'usArcheryId', 'jvPr', 'varPr',
        'shirtSize', 'pantSize', 'hatSize', 'createdAt', 'updatedAt'
    ];
    
    // Convert camelCase to snake_case for comparison
    function camelToSnake($camel) {
        return strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $camel));
    }
    
    $expectedSnake = array_map('camelToSnake', $expectedResponseFields);
    // Handle special cases
    $expectedSnake = array_map(function($f) {
        if ($f === 'createdat') return 'created_at';
        if ($f === 'updatedat') return 'updated_at';
        return $f;
    }, $expectedSnake);
    
    // Compare
    $missingFromResponse = array_diff($dbFieldNames, $expectedSnake);
    $extraInResponse = array_diff($expectedSnake, $dbFieldNames);
    
    // Remove metadata fields from missing list
    $missingFromResponse = array_filter($missingFromResponse, function($f) {
        return !in_array($f, ['id', 'created_at', 'updated_at']);
    });
    
    echo "=== GET /v1/archers Field Verification ===\n\n";
    echo "Database columns: " . count($dbFieldNames) . "\n";
    echo "Expected in response: " . count($expectedResponseFields) . "\n\n";
    
    echo "Database columns:\n";
    foreach ($dbFieldNames as $col) {
        echo "  - $col\n";
    }
    
    echo "\nMissing from GET response:\n";
    if (count($missingFromResponse) > 0) {
        foreach ($missingFromResponse as $field) {
            echo "  ❌ $field\n";
        }
    } else {
        echo "  ✅ NONE - All fields are included\n";
    }
    
    echo "\nExtra in GET response (not in DB):\n";
    if (count($extraInResponse) > 0) {
        foreach ($extraInResponse as $field) {
            echo "  ⚠️  $field\n";
        }
    } else {
        echo "  ✅ NONE\n";
    }
    
    // Test actual API call
    echo "\n=== Testing Actual API Response ===\n";
    $testUrl = 'http://localhost:8001/api/v1/archers?limit=1';
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Content-Type: application/json'
        ]
    ]);
    
    $response = @file_get_contents($testUrl, false, $context);
    if ($response) {
        $data = json_decode($response, true);
        if (isset($data['archers']) && count($data['archers']) > 0) {
            $archer = $data['archers'][0];
            $responseFields = array_keys($archer);
            
            echo "Fields in actual API response: " . count($responseFields) . "\n";
            echo "Sample archer fields:\n";
            foreach ($responseFields as $field) {
                $value = $archer[$field];
                $display = is_array($value) ? '[' . count($value) . ' items]' : (is_null($value) ? 'null' : substr(strval($value), 0, 20));
                echo "  - $field: $display\n";
            }
            
            // Check for size fields
            $hasShirtSize = isset($archer['shirtSize']);
            $hasPantSize = isset($archer['pantSize']);
            $hasHatSize = isset($archer['hatSize']);
            
            echo "\nSize fields check:\n";
            echo "  shirtSize: " . ($hasShirtSize ? "✅ Present" : "❌ MISSING") . "\n";
            echo "  pantSize: " . ($hasPantSize ? "✅ Present" : "❌ MISSING") . "\n";
            echo "  hatSize: " . ($hasHatSize ? "✅ Present" : "❌ MISSING") . "\n";
        } else {
            echo "⚠️  No archers in response to test\n";
        }
    } else {
        echo "⚠️  Could not test API (server may not be running)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
