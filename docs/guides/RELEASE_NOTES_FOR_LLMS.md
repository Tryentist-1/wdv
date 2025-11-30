# Release Notes vs Git Commits: Best Practices for LLM Onboarding

**Purpose:** Guide for understanding when and how to use release notes vs git commits for LLM context  
**Audience:** Developers working with AI assistants  
**Last Updated:** December 2025

---

## 🎯 The Core Question

**Are release notes more useful than git commits for LLMs?**

**Short Answer:** **YES, but they serve different purposes.**

Release notes provide **context and understanding**.  
Git commits provide **detailed change history**.

---

## 📊 Comparison: Release Notes vs Git Commits

### What Git Commits Provide

**Strengths:**
- ✅ **Exact changes** - Line-by-line modifications
- ✅ **Chronological order** - When things changed
- ✅ **Author attribution** - Who made changes
- ✅ **Complete history** - Every single change tracked
- ✅ **File-level detail** - Which files were modified

**Weaknesses for LLMs:**
- ❌ **No context** - Why was this change made?
- ❌ **No grouping** - Hard to see related changes together
- ❌ **Technical focus** - Commit messages are developer-oriented
- ❌ **No user impact** - Doesn't explain what users will see
- ❌ **No problem statement** - What problem did this solve?
- ❌ **Fragmented** - One feature might span 20 commits

**Example Git Commit:**
```
fix: Update Active Rounds status logic to match master document
```

**What LLM learns:** "Status logic was updated"  
**What LLM doesn't learn:** Why? What was wrong? What's the correct behavior now?

---

### What Release Notes Provide

**Strengths:**
- ✅ **Context & Purpose** - Why this change matters
- ✅ **Grouped by Feature** - Related changes together
- ✅ **User-Facing Language** - What users will experience
- ✅ **Problem/Solution** - What problem was solved
- ✅ **Complete Picture** - Entire release scope in one place
- ✅ **Technical Details** - When needed, with context
- ✅ **File Locations** - Key files mentioned with purpose

**Weaknesses:**
- ❌ **Not exhaustive** - Doesn't list every single change
- ❌ **Higher-level** - Less line-by-line detail
- ❌ **Requires maintenance** - Must be written and updated

**Example Release Notes:**
```markdown
### 🐛 Dashboard Status Calculation Fixes
**Fixed incorrect status and progress calculations**

- ✅ **Event Status Calculation** – Dynamic based on scorecard activity
  - Status now calculated from actual data, not static database field
  - "Planned" → "Active" → "Completed" based on round activity
  - More accurate event status representation
```

**What LLM learns:** 
- What was wrong (static database field)
- What's fixed (dynamic calculation)
- Why it matters (more accurate)
- How it works (based on round activity)

---

## 🎯 When to Use Each

### Use Release Notes When:

1. **Starting a new session**
   - "What changed recently?"
   - "What's the current state?"
   - "What features are new?"

2. **Understanding context**
   - "Why was this change made?"
   - "What problem does this solve?"
   - "How does this fit into the bigger picture?"

3. **Onboarding to a feature**
   - "What does this feature do?"
   - "How does it work?"
   - "What files are involved?"

4. **Understanding user impact**
   - "What will users see?"
   - "What's the user-facing change?"
   - "How does this affect workflows?"

### Use Git Commits When:

1. **Debugging specific issues**
   - "When was this line changed?"
   - "Who modified this function?"
   - "What was the exact change?"

2. **Tracing change history**
   - "How did this evolve over time?"
   - "What was the sequence of changes?"
   - "What commits are related?"

3. **Finding implementation details**
   - "What files were touched?"
   - "What functions were modified?"
   - "What's the exact diff?"

---

## 💡 Best Practices for Release Notes

### 1. Structure for LLM Consumption

**Recommended Structure:**
```markdown
## 🎯 Overview
[One paragraph: What is this release about?]

## ✨ Major Features
[Grouped by feature, with context]

## 🐛 Bug Fixes
[What was broken, what's fixed, why it matters]

## 🔧 Technical Changes
[Implementation details when relevant]

## 📦 Files Changed
[Key files with purpose, not exhaustive list]
```

### 2. Include Context, Not Just Changes

**❌ Bad:**
```markdown
- Fixed status calculation
- Updated API endpoint
```

**✅ Good:**
```markdown
- ✅ **Event Status Calculation** – Dynamic based on scorecard activity
  - **Problem:** Status was stored in static database field, became stale
  - **Solution:** Calculate dynamically from actual scorecard activity
  - **Impact:** More accurate event status representation
  - **Files:** `api/index.php` (status calculation), `event_dashboard.html` (display)
```

### 3. Group Related Changes

**❌ Bad:** List every commit separately
```markdown
- fix: Update status logic
- fix: Fix status display
- fix: Update status calculation
```

**✅ Good:** Group by feature
```markdown
### Dashboard Status Calculation Fixes
**Fixed incorrect status and progress calculations**

- Event status now calculated dynamically
- Round status logic updated
- Progress bars reflect accurate percentages
```

### 4. Mention Key Files with Purpose

**❌ Bad:**
```markdown
Files changed: api/index.php, event_dashboard.html, js/dashboard.js
```

**✅ Good:**
```markdown
**Modified:** `api/index.php`
- `/v1/events/:id/dashboard` endpoint now calculates status dynamically

**Modified:** `event_dashboard.html`
- Status display updated to show calculated values
- Progress bars use new calculation logic
```

### 5. Explain "Why" Not Just "What"

**❌ Bad:**
```markdown
- Added Complete button to scorecards
```

**✅ Good:**
```markdown
- ✅ **Complete Checkbox** – Archers can mark in-progress cards as complete
  - **Why:** Helps archers signal when they've finished scoring
  - **How:** Integrates with existing PEND → COMP status transition
  - **Where:** Card view header area
```

---

## 🔄 Maintenance Strategy

### When to Write Release Notes

**Write release notes:**
- ✅ After completing a feature
- ✅ Before deploying to production
- ✅ When fixing critical bugs
- ✅ When making user-facing changes

**Don't write release notes:**
- ❌ For every single commit
- ❌ For internal refactoring (unless significant)
- ❌ For documentation-only changes (unless major)

### How to Maintain Release Notes

**Option 1: Per-Release File (Recommended)**
```
RELEASE_NOTES_v1.8.0.md
RELEASE_NOTES_v1.7.0.md
```

**Pros:**
- ✅ Easy to find specific release
- ✅ Can be comprehensive
- ✅ Good for LLM context (one file per release)

**Cons:**
- ❌ Multiple files to manage
- ❌ Need to archive old ones

**Option 2: Single Changelog File**
```
CHANGELOG.md
```

**Pros:**
- ✅ Single file to maintain
- ✅ Easy to see all changes

**Cons:**
- ❌ Can get very long
- ❌ Harder for LLM to find specific release
- ❌ More scrolling needed

**Recommendation:** Use per-release files, archive old ones to `docs/archive/releases/`

---

## 📋 Release Notes Template

```markdown
# Release Notes vX.Y.Z - [Feature Name]

**Release Date:** [Date]  
**Version:** X.Y.Z  
**Deployment:** Production (FTP)  
**Git Branch:** `main`  
**Type:** Feature Release / Bug Fix / Hotfix

## 🎯 Overview

[One paragraph: What is this release about? What problem does it solve?]

## ✨ Major Features

### [Feature Name]
**NEW/ENHANCED:** [Brief description]

- ✅ **[Specific Change]** – [What it does]
  - **Why:** [Problem it solves]
  - **How:** [How it works]
  - **Impact:** [User-facing impact]
  - **Files:** [Key files with purpose]

## 🐛 Bug Fixes

### [Bug Category]
**Fixed:** [What was broken]

- ✅ **[Specific Fix]** – [What's fixed]
  - **Problem:** [What was wrong]
  - **Solution:** [How it's fixed]
  - **Impact:** [Why it matters]
  - **Files:** [Key files]

## 🔧 Technical Changes

### [Technical Area]
**Modified:** [Files/endpoints]

- [Technical details with context]
- [Why this approach]
- [What changed]

## 📦 Files Changed

**Key Files:**
- `path/to/file.js` – [Purpose of changes]
- `path/to/file.html` – [Purpose of changes]

**Full List:** See git log for complete list of changes

## 🚀 Migration Notes

[If applicable: Database migrations, config changes, etc.]

## 📚 Related Documentation

- [Link to relevant docs]
- [Link to architecture decisions]
```

---

## 🎯 For LLM Onboarding

### How LLMs Use Release Notes

1. **Quick Context:** "What changed in recent releases?"
2. **Feature Understanding:** "What does this feature do?"
3. **Problem Context:** "Why was this change made?"
4. **File Discovery:** "What files are involved in this feature?"
5. **Current State:** "What's the latest version? What's included?"

### How LLMs Use Git Commits

1. **Specific Changes:** "What exactly changed in this file?"
2. **Change History:** "When was this modified?"
3. **Implementation Details:** "What's the exact diff?"
4. **Author Context:** "Who made this change?"

### Best Practice: Use Both

**For Session Start:**
1. Read `01-SESSION_QUICK_START.md` (current state)
2. Read latest release notes (recent changes)
3. Reference git commits only when needed (specific debugging)

**For Feature Work:**
1. Read release notes for feature (context)
2. Use git commits for implementation details (specific changes)

---

## ✅ Checklist: Is Your Release Note Good for LLMs?

- [ ] **Overview section** explains what the release is about
- [ ] **Context provided** - Why changes were made, not just what
- [ ] **Grouped logically** - Related changes together
- [ ] **User impact clear** - What users will see/experience
- [ ] **Key files mentioned** - With purpose, not exhaustive list
- [ ] **Problem/Solution** - What was wrong, how it's fixed
- [ ] **Technical details** - When relevant, with context
- [ ] **Structured format** - Easy to scan and understand

---

## 📚 Examples from This Codebase

### Good Release Note Example

See `RELEASE_NOTES_v1.8.0.md`:
- ✅ Clear overview
- ✅ Grouped by feature
- ✅ Context for each change
- ✅ Problem/Solution format
- ✅ Key files mentioned with purpose

### Good Git Commit Example

```
fix: Update Active Rounds status logic to match master document
```

**Why it's good:**
- Clear action (fix)
- Specific area (Active Rounds)
- References documentation (master document)

**What release notes add:**
- Why the logic needed updating
- What the correct behavior is
- How it affects users
- What files are involved

---

## 💬 Summary

**Release Notes > Git Commits for LLM Onboarding Because:**

1. **Context over detail** - LLMs need "why" not just "what"
2. **Grouped information** - Related changes together
3. **User-focused** - Explains impact, not just code changes
4. **Complete picture** - Entire release scope in one place
5. **Problem/Solution** - Helps LLM understand decisions

**But Git Commits Still Valuable For:**

1. **Specific debugging** - Exact changes to specific files
2. **Change history** - When things changed
3. **Implementation details** - Line-by-line modifications

**Best Practice:** Use release notes for context, git commits for details.

---

## 🔗 Related Documentation

- **[01-SESSION_QUICK_START.md](../01-SESSION_QUICK_START.md)** - Primary onboarding file
- **[LLM_ONBOARDING_BEST_PRACTICES.md](LLM_ONBOARDING_BEST_PRACTICES.md)** - General LLM onboarding guide
- **[DOCUMENTATION_ORGANIZATION_GUIDE.md](DOCUMENTATION_ORGANIZATION_GUIDE.md)** - Where to put release notes

