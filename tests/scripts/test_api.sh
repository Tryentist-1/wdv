#!/bin/bash
# Production API health check
# Tests: https://archery.tryentist.com/api/v1/
# Usage: ./tests/scripts/test_api.sh (run from project root)

API_BASE="${API_BASE_URL:-https://archery.tryentist.com/api/v1}"
set -e

echo "=== Production API Health Check ==="
echo "Base: $API_BASE"
echo ""

echo "1. GET /health..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health")
if [ "$HTTP" = "200" ]; then
  echo "   ✅ 200 OK"
  curl -s "$API_BASE/health" | python3 -m json.tool 2>/dev/null || curl -s "$API_BASE/health"
else
  echo "   ❌ $HTTP (expected 200)"
  exit 1
fi

echo ""
echo "2. GET /events/recent (public)..."
curl -s "$API_BASE/events/recent" | python3 -m json.tool | head -25

echo ""
echo "=== All checks complete ==="
