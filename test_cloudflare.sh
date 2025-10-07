#!/bin/bash

# Test Cloudflare API credentials
# Run: bash test_cloudflare.sh

# Load .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "=== Cloudflare API Test ==="
echo ""

# Check if variables are set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN is not set in .env"
  exit 1
fi

if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
  echo "❌ CLOUDFLARE_ZONE_ID is not set in .env"
  exit 1
fi

echo "✓ Variables loaded from .env"
echo "  Token length: ${#CLOUDFLARE_API_TOKEN} characters"
echo "  Zone ID length: ${#CLOUDFLARE_ZONE_ID} characters"
echo ""

# Test 1: Verify Zone ID
echo "Test 1: Verifying Zone ID..."
ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

if echo "$ZONE_RESPONSE" | grep -q '"success":true'; then
  ZONE_NAME=$(echo "$ZONE_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✓ Zone ID is valid!"
  echo "  Zone name: $ZONE_NAME"
else
  echo "✗ Zone ID verification failed:"
  echo "$ZONE_RESPONSE" | grep -o '"message":"[^"]*"'
  exit 1
fi
echo ""

# Test 2: Check Token Permissions
echo "Test 2: Verifying token permissions..."
TOKEN_VERIFY=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

if echo "$TOKEN_VERIFY" | grep -q '"success":true'; then
  echo "✓ Token is valid!"
  echo "  Status: $(echo "$TOKEN_VERIFY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
else
  echo "✗ Token verification failed:"
  echo "$TOKEN_VERIFY"
  exit 1
fi
echo ""

# Test 3: Purge Cache
echo "Test 3: Attempting cache purge..."
PURGE_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')

if echo "$PURGE_RESPONSE" | grep -q '"success":\s*true'; then
  echo "✓ Cache purge successful!"
  echo "  All cache cleared for $ZONE_NAME"
else
  echo "✗ Cache purge failed:"
  echo "$PURGE_RESPONSE"
  echo ""
  echo "Common fixes:"
  echo "  1. Go to Cloudflare Dashboard → API Tokens"
  echo "  2. Edit your token and ensure it has 'Zone.Cache Purge' permission"
  echo "  3. Make sure the token is not expired"
  exit 1
fi
echo ""

echo "=== All tests passed! ==="
echo "Your Cloudflare integration is working correctly."
