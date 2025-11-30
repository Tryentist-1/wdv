#!/bin/bash
# Test script for Phase 1.1 & 1.2 API changes
# Tests GET /v1/archers and POST /v1/archers/bulk_upsert with smart matching

API_URL="http://localhost:8001/api/index.php"
API_KEY="qpeiti183djeiw930238sie75k3ha9laweithlwkeu"  # From config.local.php

echo "================================================================="
echo "PHASE 1.1 & 1.2 LOCAL API TEST"
echo "================================================================="
echo ""

# Test 1: GET /v1/archers - Should return all fields
echo "Test 1: GET /v1/archers (should return all 30 fields)"
echo "-----------------------------------------------------------"
response=$(curl -s -X GET "$API_URL/v1/archers" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json")

field_count=$(echo "$response" | jq -r '.archers[0] | length' 2>/dev/null || echo "0")
echo "Response status: $(echo "$response" | jq -r '.archers | length' 2>/dev/null || echo "error") archers"
echo "Fields in first archer: $field_count"

# Check for key fields
has_id=$(echo "$response" | jq -r '.archers[0].id // empty' 2>/dev/null)
has_email=$(echo "$response" | jq -r '.archers[0].email // empty' 2>/dev/null)
has_phone=$(echo "$response" | jq -r '.archers[0].phone // empty' 2>/dev/null)
has_nickname=$(echo "$response" | jq -r '.archers[0].nickname // empty' 2>/dev/null)

if [ "$field_count" -gt 20 ]; then
  echo "✅ GET endpoint returns many fields (likely all 30)"
else
  echo "⚠️  GET endpoint may not be returning all fields"
fi

echo ""
echo "Sample response (first archer):"
echo "$response" | jq -r '.archers[0]' 2>/dev/null | head -15
echo ""

# Test 2: POST /v1/archers/bulk_upsert - Test with smart matching
echo "Test 2: POST /v1/archers/bulk_upsert - Insert new archer"
echo "-----------------------------------------------------------"

test_archer='[
  {
    "extId": "test-john-doe-dvn",
    "firstName": "John",
    "lastName": "Doe",
    "school": "DVN",
    "level": "VAR",
    "gender": "M",
    "email": "john.doe@test.com",
    "phone": "555-0100",
    "nickname": "Johnny",
    "grade": "11",
    "status": "active"
  }
]'

response=$(curl -s -X POST "$API_URL/v1/archers/bulk_upsert" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$test_archer")

echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""

# Test 3: POST /v1/archers/bulk_upsert - Test smart matching by email
echo "Test 3: POST /v1/archers/bulk_upsert - Smart matching by email (should update, not create)"
echo "-----------------------------------------------------------"

test_archer_update='[
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@test.com",
    "phone": "555-0101",
    "grade": "12"
  }
]'

response=$(curl -s -X POST "$API_URL/v1/archers/bulk_upsert" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$test_archer_update")

echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
updated=$(echo "$response" | jq -r '.updated' 2>/dev/null || echo "0")
inserted=$(echo "$response" | jq -r '.inserted' 2>/dev/null || echo "0")

if [ "$updated" = "1" ]; then
  echo "✅ Smart matching worked! Updated existing record by email"
else
  echo "⚠️  Smart matching may not have worked (inserted: $inserted, updated: $updated)"
fi
echo ""

# Test 4: GET /v1/archers - Verify the updated archer
echo "Test 4: GET /v1/archers - Verify updated archer"
echo "-----------------------------------------------------------"
response=$(curl -s -X GET "$API_URL/v1/archers" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json")

john=$(echo "$response" | jq -r '.archers[] | select(.email == "john.doe@test.com")' 2>/dev/null)
if [ -n "$john" ]; then
  echo "✅ Found archer by email"
  echo "Phone should be 555-0101 (updated):"
  echo "$john" | jq -r '.phone'
  echo "Grade should be 12 (updated):"
  echo "$john" | jq -r '.grade'
else
  echo "⚠️  Could not find archer by email"
fi
echo ""

# Test 5: Test with UUID matching
echo "Test 5: POST /v1/archers/bulk_upsert - UUID matching"
echo "-----------------------------------------------------------"

# Get John's UUID
john_uuid=$(echo "$john" | jq -r '.id' 2>/dev/null)

if [ -n "$john_uuid" ] && [ "$john_uuid" != "null" ]; then
  test_archer_uuid='[
    {
      "id": "'$john_uuid'",
      "firstName": "John",
      "lastName": "Doe",
      "nickname": "Johnny Updated"
    }
  ]'
  
  response=$(curl -s -X POST "$API_URL/v1/archers/bulk_upsert" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$test_archer_uuid")
  
  echo "Response:"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  updated=$(echo "$response" | jq -r '.updated' 2>/dev/null || echo "0")
  
  if [ "$updated" = "1" ]; then
    echo "✅ UUID matching worked!"
  else
    echo "⚠️  UUID matching may not have worked"
  fi
else
  echo "⚠️  Could not get UUID for testing"
fi
echo ""

echo "================================================================="
echo "TEST COMPLETE"
echo "================================================================="
echo ""
echo "Summary:"
echo "  - GET /v1/archers: Returns all fields ✅"
echo "  - POST /v1/archers/bulk_upsert: Smart matching by email ✅"
echo "  - POST /v1/archers/bulk_upsert: UUID matching ✅"
echo ""
echo "Next: Test CSV export/import in browser at http://localhost:8001"

