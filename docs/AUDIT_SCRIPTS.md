# Audit Scripts Documentation

This document describes the audit scripts available for maintaining code quality and consistency.

---

## Dark Mode Audit Script

**Location:** `/audit_dark_mode.sh`

### Purpose
Automatically scans the codebase for potential dark mode issues, including:
- Background colors without corresponding text colors
- Inline styles with hardcoded colors
- CSS classes without dark mode variants

### Usage

```bash
# From project root
./audit_dark_mode.sh

# Or with full path
bash /Users/terry/web-mirrors/tryentist/wdv/audit_dark_mode.sh
```

### What It Checks

1. **bg-gray-* dark:bg-gray-* without text colors**
   - Finds elements with gray backgrounds but no text color classes
   - Most container elements are OK (text color inherited)
   - Focus on table cells, buttons, and text-containing elements

2. **bg-white dark:bg-gray-* without text colors**
   - Similar to above, for white/gray combinations
   - Common in cards and modals

3. **dark:bg-* without dark:text-***
   - Finds any dark mode background without dark mode text
   - Helps catch incomplete dark mode implementations

4. **Inline styles with color:**
   - Finds `style="...color:..."` attributes
   - These bypass Tailwind's dark mode system
   - **Priority fix:** Replace with Tailwind classes

5. **CSS classes without dark mode**
   - Scans `css/main.css` for classes with `color:` but no `dark:` variants
   - Legacy classes that need updating

### Output

The script outputs 5 sections:
- Each section shows file path, line number, and the problematic code
- Results are limited to 50 per section for readability
- Excludes `node_modules`, `.git`, `test-results`, etc.

### Interpreting Results

**✅ Safe to Ignore:**
- `<body>` tags with backgrounds (text color inherited)
- Container `<div>` and `<section>` elements
- Elements where text color is set on child elements

**⚠️ Needs Attention:**
- Table cells (`<td>`, `<th>`) with backgrounds
- Inline styles with `color:` or `background:`
- Status badges and labels
- Error/success messages

**🚨 Critical:**
- Any element with text that's unreadable in dark mode
- Inline styles in dynamically generated content (JS files)

### When to Run

- Before committing major styling changes
- After adding new components
- When dark mode issues are reported
- As part of code review process

### Example Workflow

```bash
# 1. Run the audit
./audit_dark_mode.sh > dark_mode_audit_results.txt

# 2. Review the results
cat dark_mode_audit_results.txt

# 3. Fix issues (see DARK_MODE_ISSUES_TO_FIX.md)

# 4. Re-run to verify fixes
./audit_dark_mode.sh

# 5. Commit changes
git add -A
git commit -m "Fix dark mode issues found in audit"
```

---

## Future Audit Scripts

### Planned Scripts

1. **`audit_accessibility.sh`**
   - Check for missing alt text on images
   - Verify ARIA labels
   - Check color contrast ratios
   - Verify touch target sizes (44px minimum)

2. **`audit_responsive.sh`**
   - Find hardcoded widths/heights
   - Check for mobile-first breakpoints
   - Verify safe-area-inset usage

3. **`audit_performance.sh`**
   - Find large images without optimization
   - Check for unused CSS/JS
   - Identify render-blocking resources

4. **`audit_security.sh`**
   - Check for exposed API keys
   - Verify CSP headers
   - Check for SQL injection risks
   - Verify input sanitization

---

## Contributing

To add a new audit script:

1. Create the script in project root: `audit_[name].sh`
2. Make it executable: `chmod +x audit_[name].sh`
3. Add documentation to this file
4. Test thoroughly before committing
5. Add to `.gitignore` if it generates output files

---

## Related Documentation

- [DARK_MODE_ISSUES_TO_FIX.md](./DARK_MODE_ISSUES_TO_FIX.md) - Current dark mode issues inventory
- [TAILWIND_SETUP.md](./TAILWIND_SETUP.md) - Tailwind CSS configuration
- [COACH_MODULE_COMPLETE_INVENTORY.md](./COACH_MODULE_COMPLETE_INVENTORY.md) - Coach module audit
- [RANKING_ROUND_MODULE_COMPLETE_INVENTORY.md](./RANKING_ROUND_MODULE_COMPLETE_INVENTORY.md) - Ranking Round audit

---

**Last Updated:** November 7, 2025

