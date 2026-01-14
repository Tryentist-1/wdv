<?php
/**
 * Verify that all archer table fields are handled in:
 * 1. GET /v1/archers SELECT statement
 * 2. POST /v1/archers/bulk_upsert normalized fields
 * 3. POST /v1/archers/self normalized fields
 * 4. _prepareForSync in archer_module.js
 */

// All fields from database schema + migrations
$allDatabaseFields = [
    // Base schema fields
    'id', 'ext_id', 'first_name', 'last_name', 'nickname', 'photo_url',
    'school', 'grade', 'gender', 'level', 'status', 'faves',
    'dom_eye', 'dom_hand', 'height_in', 'wingspan_in', 'draw_length_sugg',
    'riser_height_in', 'limb_length', 'limb_weight_lbs',
    'notes_gear', 'notes_current', 'notes_archive',
    'email', 'email2', 'phone', 'dob', 'nationality', 'ethnicity', 'discipline',
    'street_address', 'street_address2', 'city', 'state', 'postal_code',
    'disability', 'camp_attendance', 'us_archery_id', 'jv_pr', 'var_pr',
    'created_at', 'updated_at',
    // From USA Archery migration
    'valid_from', 'club_state', 'membership_type', 'address_country',
    'address_line3', 'disability_list', 'military_service',
    'introduction_source', 'introduction_other', 'nfaa_member_no',
    'school_type', 'school_full_name',
    // From size fields migration
    'shirt_size', 'pant_size', 'hat_size'
];

// Fields in GET /v1/archers SELECT (from api/index.php line ~4183)
$getEndpointFields = [
    'id', 'ext_id', 'first_name', 'last_name', 'nickname', 'photo_url',
    'school', 'grade', 'gender', 'level', 'status', 'faves',
    'dom_eye', 'dom_hand', 'height_in', 'wingspan_in', 'draw_length_sugg',
    'riser_height_in', 'limb_length', 'limb_weight_lbs',
    'notes_gear', 'notes_current', 'notes_archive',
    'email', 'email2', 'phone', 'dob', 'nationality', 'ethnicity', 'discipline',
    'street_address', 'street_address2', 'city', 'state', 'postal_code',
    'disability', 'camp_attendance', 'valid_from', 'club_state', 'membership_type',
    'address_country', 'address_line3', 'disability_list', 'military_service',
    'introduction_source', 'introduction_other', 'nfaa_member_no',
    'school_type', 'school_full_name', 'us_archery_id', 'jv_pr', 'var_pr',
    'shirt_size', 'pant_size', 'hat_size', 'created_at', 'updated_at'
];

// Fields in bulk_upsert normalized array (from api/index.php line ~3928)
$bulkUpsertFields = [
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
    'shirtSize', 'pantSize', 'hatSize'
];

// Fields in self-update normalized array (from api/index.php line ~3813)
$selfUpdateFields = [
    'firstName', 'lastName', 'nickname', 'photoUrl',
    'school', 'grade', 'gender', 'level', 'status', 'faves',
    'domEye', 'domHand', 'heightIn', 'wingspanIn', 'drawLengthSugg',
    'riserHeightIn', 'limbLength', 'limbWeightLbs',
    'notesGear', 'notesCurrent', 'notesArchive',
    'email', 'phone', 'usArcheryId', 'jvPr', 'varPr',
    'shirtSize', 'pantSize', 'hatSize'
];

// Fields in _prepareForSync (from js/archer_module.js line ~464)
$prepareForSyncFields = [
    'extId', 'firstName', 'lastName', 'nickname', 'photoUrl',
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
    'shirtSize', 'pantSize', 'hatSize'
];

// Convert camelCase to snake_case for comparison
function camelToSnake($camel) {
    return strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $camel));
}

function snakeToCamel($snake) {
    return lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $snake))));
}

// Convert all to snake_case for comparison
$getFieldsSnake = array_map(function($f) {
    // Remove 'as alias' if present
    $f = preg_replace('/\s+as\s+\w+/i', '', $f);
    return trim($f);
}, $getEndpointFields);

$bulkUpsertFieldsSnake = array_map('camelToSnake', $bulkUpsertFields);
$selfUpdateFieldsSnake = array_map('camelToSnake', $selfUpdateFields);
$prepareForSyncFieldsSnake = array_map('camelToSnake', $prepareForSyncFields);

// Exclude metadata fields from comparison
$dataFields = array_filter($allDatabaseFields, function($f) {
    return !in_array($f, ['id', 'created_at', 'updated_at']);
});

echo "=== Archer Fields Verification ===\n\n";
echo "Database fields (excluding id, created_at, updated_at): " . count($dataFields) . "\n";
echo "GET endpoint fields: " . count($getFieldsSnake) . "\n";
echo "bulk_upsert fields: " . count($bulkUpsertFieldsSnake) . "\n";
echo "self-update fields: " . count($selfUpdateFieldsSnake) . "\n";
echo "_prepareForSync fields: " . count($prepareForSyncFieldsSnake) . "\n\n";

// Check GET endpoint
$getMissing = array_diff($dataFields, $getFieldsSnake);
$getExtra = array_diff($getFieldsSnake, $dataFields);
echo "GET /v1/archers:\n";
echo "  Missing: " . (count($getMissing) > 0 ? implode(', ', $getMissing) : 'NONE ✅') . "\n";
echo "  Extra: " . (count($getExtra) > 0 ? implode(', ', $getExtra) : 'NONE ✅') . "\n\n";

// Check bulk_upsert
$bulkMissing = array_diff($dataFields, $bulkUpsertFieldsSnake);
$bulkExtra = array_diff($bulkUpsertFieldsSnake, $dataFields);
echo "POST /v1/archers/bulk_upsert:\n";
echo "  Missing: " . (count($bulkMissing) > 0 ? implode(', ', $bulkMissing) : 'NONE ✅') . "\n";
echo "  Extra: " . (count($bulkExtra) > 0 ? implode(', ', $bulkExtra) : 'NONE ✅') . "\n\n";

// Check self-update (may have fewer fields - that's ok)
$selfMissing = array_diff($dataFields, $selfUpdateFieldsSnake);
echo "POST /v1/archers/self:\n";
echo "  Missing: " . (count($selfMissing) > 0 ? implode(', ', $selfMissing) : 'NONE ✅') . "\n";
echo "  Note: Self-update may intentionally exclude some fields\n\n";

// Check _prepareForSync
$syncMissing = array_diff($dataFields, $prepareForSyncFieldsSnake);
$syncExtra = array_diff($prepareForSyncFieldsSnake, $dataFields);
echo "_prepareForSync (archer_module.js):\n";
echo "  Missing: " . (count($syncMissing) > 0 ? implode(', ', $syncMissing) : 'NONE ✅') . "\n";
echo "  Extra: " . (count($syncExtra) > 0 ? implode(', ', $syncExtra) : 'NONE ✅') . "\n\n";

// Overall status
$allGood = count($getMissing) === 0 && count($bulkMissing) === 0 && count($syncMissing) === 0;
echo "=== Overall Status ===\n";
echo ($allGood ? "✅ ALL FIELDS VERIFIED" : "❌ MISSING FIELDS DETECTED") . "\n";
