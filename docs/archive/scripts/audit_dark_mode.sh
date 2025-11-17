#!/bin/bash

# Dark Mode Audit Script
# Finds potential dark mode issues in HTML and JS files

echo "=== DARK MODE AUDIT ==="
echo ""

# 1. Find bg-gray without text color in same class attribute
echo "1. Checking for bg-gray-* dark:bg-gray-* without text colors..."
echo "---"
grep -rn --include="*.html" --include="*.js" 'class="[^"]*bg-gray-[0-9]* dark:bg-gray-[0-9]*[^"]*"' . 2>/dev/null | \
  grep -v 'text-gray' | \
  grep -v 'text-white' | \
  grep -v 'text-black' | \
  grep -v 'text-primary' | \
  grep -v 'text-success' | \
  grep -v 'text-danger' | \
  grep -v 'node_modules' | \
  grep -v '.git' | \
  grep -v 'test-results' | \
  grep -v 'playwright-report' | \
  head -50
echo ""

# 2. Find bg-white dark:bg-gray without text color
echo "2. Checking for bg-white dark:bg-gray-* without text colors..."
echo "---"
grep -rn --include="*.html" --include="*.js" 'class="[^"]*bg-white dark:bg-gray-[0-9]*[^"]*"' . 2>/dev/null | \
  grep -v 'text-gray' | \
  grep -v 'text-white' | \
  grep -v 'text-black' | \
  grep -v 'node_modules' | \
  grep -v '.git' | \
  grep -v 'test-results' | \
  grep -v 'playwright-report' | \
  head -50
echo ""

# 3. Find elements with only dark: background but no dark: text
echo "3. Checking for dark:bg-* without dark:text-*..."
echo "---"
grep -rn --include="*.html" --include="*.js" 'dark:bg-' . 2>/dev/null | \
  grep -v 'dark:text-' | \
  grep -v 'node_modules' | \
  grep -v '.git' | \
  grep -v 'test-results' | \
  grep -v 'playwright-report' | \
  grep -v 'dark:bg-transparent' | \
  grep -v 'dark:bg-opacity' | \
  head -50
echo ""

# 4. Find inline styles (potential dark mode issues)
echo "4. Checking for inline styles (style=) that might need dark mode..."
echo "---"
grep -rn --include="*.html" --include="*.js" 'style="[^"]*color:' . 2>/dev/null | \
  grep -v 'node_modules' | \
  grep -v '.git' | \
  grep -v 'test-results' | \
  grep -v 'playwright-report' | \
  head -30
echo ""

# 5. Find CSS classes that might not have dark mode variants
echo "5. Checking for custom CSS classes in main.css without dark mode..."
echo "---"
if [ -f "css/main.css" ]; then
  grep -n "^\." css/main.css | \
    grep -v "dark:" | \
    grep "color:" | \
    head -30
fi
echo ""

echo "=== AUDIT COMPLETE ==="
echo ""
echo "Review the results above for potential dark mode issues."
echo "Focus on:"
echo "  - Elements with backgrounds but no text colors"
echo "  - Inline styles that set colors"
echo "  - Custom CSS classes without dark mode variants"

