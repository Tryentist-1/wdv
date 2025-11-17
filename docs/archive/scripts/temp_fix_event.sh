#!/bin/bash
# Temporary fix script to update event metadata
# Usage: ./temp_fix_event.sh <event-id>

EVENT_ID="${1:-8457c3e4-2cf1-4abf-ae82-66f2bf3b5d9f}"
API_KEY="wdva26"

echo "Updating event $EVENT_ID to auto_assign mode..."

curl -X PATCH "https://tryentist.com/wdv/api/v1/events/$EVENT_ID" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"eventType":"auto_assign"}' \
  -v

echo ""
echo "Done! Refresh the ranking round page to see the pre-assigned bale list."
