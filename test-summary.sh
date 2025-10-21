#!/bin/bash
# Quick test summary for sharing with AI

echo "=== PLAYWRIGHT TEST SUMMARY ==="
echo ""

if [ -f "playwright-report/index.html" ]; then
    echo "✓ Test report exists"
    echo "View with: npx playwright show-report"
else
    echo "ℹ️  No test report found. Run: npm test"
fi

echo ""
echo "Recent test results:"
if [ -d "test-results" ]; then
    echo "Failed tests: $(ls test-results/ 2>/dev/null | wc -l | xargs)"
    
    if [ "$(ls test-results/ 2>/dev/null | wc -l)" -gt 0 ]; then
        echo ""
        echo "Failed test folders:"
        ls test-results/ | head -5
        echo ""
        echo "To see screenshots:"
        echo "  open test-results/"
    fi
else
    echo "ℹ️  No failed tests (or tests haven't run yet)"
fi

echo ""
echo "=== QUICK COMMANDS ==="
echo "View report:      npx playwright show-report"
echo "Run tests again:  npm test"
echo "Test local:       npm run test:local"

