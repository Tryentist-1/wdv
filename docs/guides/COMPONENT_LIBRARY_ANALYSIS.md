# Component Library Analysis: style-guide.html

**Purpose:** Determine the true nature of `style-guide.html` and recommend better name/location  
**Date:** December 2025

---

## 🔍 What It Actually Is

### Current Name: `style-guide.html`
**Problem:** The "test-" prefix suggests it's only for testing, but it serves multiple critical purposes.

### Actual Purposes

1. **Style Guide** ⭐⭐⭐⭐⭐
   - Complete UI component showcase
   - Design system reference
   - Visual standards documentation

2. **Component Library** ⭐⭐⭐⭐⭐
   - All UI components in one place
   - Reference implementation
   - Copy-paste templates

3. **Visual Testing Tool** ⭐⭐⭐⭐
   - Light/dark mode preview
   - Mobile responsiveness testing
   - Visual regression reference

4. **Core Documentation** ⭐⭐⭐⭐⭐
   - Source of truth for UI patterns
   - Referenced 86+ times in codebase
   - Developers match code to it

5. **Design System** ⭐⭐⭐⭐
   - Tailwind CSS patterns
   - Color system (score colors)
   - Typography and spacing

---

## 📊 Usage Analysis

### How It's Referenced

**In Code:**
- `js/scorecard_view.js` - "MATCHES style-guide.html"
- `js/archer_selector.js` - "Match style-guide.html standards"
- Multiple files reference it as the standard

**In Documentation:**
- Referenced 86+ times
- Called "Component Library"
- Called "Style Guide"
- Called "Visual Testing Tool"
- Called "Design System Reference"

**In Development:**
- Used to verify UI consistency
- Used to preview light/dark mode
- Used to test mobile responsiveness
- Used as copy-paste template source

---

## 🎯 Recommended Solution

### Option 1: Rename to `style-guide.html` (Recommended)

**Pros:**
- ✅ Clear purpose (style guide)
- ✅ Recognizable term
- ✅ Emphasizes it's a reference/guide
- ✅ Still indicates it's for testing/verification

**Cons:**
- ⚠️ Need to update 86+ references
- ⚠️ Less emphasis on "component library"

**Best for:** Emphasizing it's a style guide and design system reference

### Option 2: Rename to `component-library.html`

**Pros:**
- ✅ Clear and descriptive
- ✅ Matches how it's already referenced
- ✅ Emphasizes component showcase

**Cons:**
- ⚠️ Doesn't emphasize "style guide" aspect
- ⚠️ Need to update 86+ references

**Best for:** Emphasizing it's a component showcase

### Option 3: Rename to `ui-style-guide.html`

**Pros:**
- ✅ Most descriptive
- ✅ Clear it's UI-focused
- ✅ Emphasizes both "style" and "guide"

**Cons:**
- ⚠️ Longer name
- ⚠️ Need to update 86+ references

**Best for:** Maximum clarity

### Option 4: Keep Name, Move Location

**Keep:** `style-guide.html`  
**Move to:** `style-guide/style-guide.html` or `components/style-guide.html`

**Pros:**
- ✅ No reference updates needed
- ✅ Better organization

**Cons:**
- ⚠️ Name still misleading
- ⚠️ Need to update paths in docs

---

## 💡 Recommendation

### Best Approach: **Rename to `style-guide.html`**

**Why:**
1. **Clear Purpose** - Immediately understood as a style guide
2. **Recognizable** - Standard term in web development
3. **Accurate** - It IS a style guide (not just a test)
4. **Professional** - Matches industry standards

**Location:** **Keep in root** (high visibility, frequently accessed)

**Rationale:**
- Referenced constantly during development
- Used for visual testing
- Source of truth for UI patterns
- High-frequency access justifies root location

---

## 🔄 Migration Plan

### Step 1: Rename File
```bash
mv style-guide.html style-guide.html
```

### Step 2: Update References (Automated)
```bash
# Find all references
grep -r "style-guide.html" . --exclude-dir=node_modules

# Update references (use find/replace)
# style-guide.html → style-guide.html
```

### Step 3: Update Documentation
- Update README.md
- Update 01-SESSION_QUICK_START.md
- Update all docs/testing/*.md files
- Update tests/README.md

### Step 4: Update Code Comments
- Update js/*.js files that reference it
- Update any inline comments

---

## 📝 Alternative: Dual Purpose Name

If you want to keep both aspects clear, consider:

**`style-guide.html`** (primary name)  
**Alias:** `component-library.html` (symlink or redirect)

Or document it as:
- **File:** `style-guide.html`
- **Also known as:** Component Library, Design System Reference

---

## ✅ Final Recommendation

**Rename to:** `style-guide.html`  
**Location:** Root (keep current location)  
**Reason:** It's a style guide first, testing tool second

**Benefits:**
- ✅ Clear purpose
- ✅ Professional naming
- ✅ Matches industry standards
- ✅ Still accessible for testing
- ✅ Better for LLMs (clear what it is)

**Update Strategy:**
1. Rename file
2. Use find/replace for references
3. Update documentation
4. Commit changes

---

## 📚 Related Documentation

- **[TEST_SPRAWL_ANALYSIS.md](TEST_SPRAWL_ANALYSIS.md)** - Test file organization
- **[DOCUMENTATION_ORGANIZATION_GUIDE.md](DOCUMENTATION_ORGANIZATION_GUIDE.md)** - File location rules

