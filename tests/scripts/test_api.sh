#!/bin/bash
echo "=== Testing Ranking Round API Endpoints ==="

echo -e "\n1. Testing /events/recent (public)..."
curl -s "https://tryentist.com/wdv/api/v1/events/recent" | python3 -m json.tool | head -20

echo -e "\n2. Testing /events/verify with 'tuesday' code..."
curl -s -X POST "https://tryentist.com/wdv/api/v1/events/verify" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"2e43821b-7b2f-4341-87e2-f85fe0831d76","entryCode":"tuesday"}' | python3 -m json.tool

echo -e "\n3. Testing event snapshot..."
curl -s "https://tryentist.com/wdv/api/v1/events/2e43821b-7b2f-4341-87e2-f85fe0831d76/snapshot" | python3 -m json.tool | head -30

echo -e "\n=== All tests complete ==="
