# Best Practices: Onboarding LLMs for Development Sessions

**Purpose:** Guide for structuring information to help LLMs quickly understand codebase and current work  
**Audience:** Developers working with AI assistants  
**Last Updated:** December 2025

---

## 🎯 Core Principles

### 1. **Structure Over Volume**
- ✅ Clear sections with specific purposes
- ✅ Hierarchical information (most important first)
- ❌ Avoid walls of text without structure

### 2. **Current State First**
- ✅ What's happening NOW (current sprint, active work)
- ✅ What changed RECENTLY (last session, recent commits)
- ✅ What's NEXT (immediate next steps)
- ❌ Don't bury current work under historical context

### 3. **Actionable Context**
- ✅ Specific file paths and line numbers when relevant
- ✅ Clear task descriptions with acceptance criteria
- ✅ Known constraints and requirements
- ❌ Vague goals without implementation details

### 4. **Progressive Disclosure**
- ✅ Start with essentials (5 min read)
- ✅ Link to detailed docs (don't inline everything)
- ✅ Use checklists for "what to read when"
- ❌ Don't overwhelm with all information at once

---

## 📋 Recommended File Structure

### Primary Onboarding File: `01-SESSION_QUICK_START.md`

**Structure:**
```
1. Read These First (Critical Context)
   - Workflow understanding (2 min)
   - Architecture overview (5 min)
   - Project overview (3 min)

2. Current Sprint / Active Work
   - What we're working on NOW
   - Current priority
   - Active branch/status

3. What Changed Since Last Session
   - Recent work summary
   - Files changed
   - Current session context

4. Status Update
   - Latest release
   - Recent fixes
   - Known issues

5. Next Steps
   - Active work (current sprint)
   - Backlog (planned but not active)

6. Key Principles (Do NOT Violate)
   - Critical constraints
   - Design patterns
   - Common pitfalls

7. Session Start Template
   - Copy-paste template for new sessions
```

---

## 🚀 Session Start Workflow

### Before Starting a Session

1. **Update `01-SESSION_QUICK_START.md`:**
   - [ ] Update "Current Sprint" section
   - [ ] Update "What Changed Since Last Session"
   - [ ] Update version numbers if new release
   - [ ] Move completed work to "Status Update"

2. **Use Session Start Template:**
   - Copy template from `01-SESSION_QUICK_START.md`
   - Fill in current state
   - List files/modules you'll work on
   - State clear goal

3. **Provide Context:**
   - What are you trying to accomplish?
   - What constraints exist?
   - What's the acceptance criteria?

### During Session

- **Reference specific files:** Use code references with line numbers
- **Explain decisions:** Why this approach? What alternatives were considered?
- **Note blockers:** If something blocks progress, document it

### After Session

> **💡 Quick Reference:** [SESSION_WRAP_UP_BEST_PRACTICES.md](SESSION_WRAP_UP_BEST_PRACTICES.md) - Complete 5-minute wrap-up process

1. **Update `01-SESSION_QUICK_START.md`:**
   - [ ] Update "What Changed Since Last Session" (2 min)
   - [ ] Update "Current Sprint / Active Work" (1 min)
   - [ ] Note any blockers or dependencies (1 min)
   - [ ] Commit changes (1 min)

2. **Document Decisions:**
   - [ ] Add to relevant doc if architectural decision
   - [ ] Update code comments if complex logic
   - [ ] Note in commit message if significant change

**Total Time:** 5 minutes  
**ROI:** Saves 5-15 minutes at start of next session

---

## 💡 Best Practices

### ✅ DO

1. **Be Specific:**
   ```
   ✅ "Fix dark mode text in results.html line 45-67"
   ❌ "Fix dark mode issues"
   ```

2. **Provide Context:**
   ```
   ✅ "We're adding a complete checkbox to scorecards. 
       This should integrate with existing PEND → COMP 
       status transition. See ranking_round_300.js 
       for similar status handling."
   ❌ "Add complete checkbox"
   ```

3. **Use Code References:**
   ```
   ✅ ```12:45:js/ranking_round_300.js
      // existing code
      ```
   ❌ "Look at ranking_round_300.js"
   ```

4. **State Constraints:**
   ```
   ✅ "Must be mobile-first (99% phone usage), 
       follow existing Tailwind patterns, 
       no breaking changes to existing features"
   ❌ "Make it work"
   ```

5. **Link to Detailed Docs:**
   ```
   ✅ "See [ARCHITECTURE.md](docs/ARCHITECTURE.md) 
       for storage strategy details"
   ❌ Inline entire architecture explanation
   ```

### ❌ DON'T

1. **Don't Assume Context:**
   - LLMs don't remember previous sessions
   - Always provide current state
   - Reference what changed recently

2. **Don't Bury Important Info:**
   - Current work should be at the top
   - Don't make LLM read through history to find active work

3. **Don't Be Vague:**
   - "Fix bugs" → "Fix dark mode text color in results.html"
   - "Improve UX" → "Add complete checkbox to scorecard header"

4. **Don't Skip Updates:**
   - Update version numbers
   - Update current sprint status
   - Document what changed

---

## 📊 Information Hierarchy

### Priority 1: Current State (Top of File)
- Current sprint goals
- Active work items
- What changed since last session
- Current version/release

### Priority 2: Critical Context (Early in File)
- Workflow understanding
- Architecture overview
- Key principles
- Common pitfalls

### Priority 3: Reference Material (Later in File)
- Detailed documentation links
- Historical context
- Roadmap/planning
- Testing procedures

---

## 🎯 Unified Session Start Protocol (Cursor / Codex / Antigravity)

**For Cursor:**  
Cursor automatically reads `.cursorrules`, which explicitly instructs it to read the quick start file. You only need to state your goal:  
> "I'm starting a new session. My goal is: [Task]"

**For Codex / Antigravity / Other LLMs:**  
These agents require explicit instructions to read the quick start file first:  
> "Please silently read `01-SESSION_QUICK_START.md` to gain context on the current sprint and constraints. Then, let's work on: [Task]"

---

## 📋 Detailed Session Start Template


```markdown
Hi! I'm working on the WDV Archery Suite. Quick context:

📋 CURRENT STATE:
- Version: v1.8.0 (December 2025)
- Phase: [Current Phase]
- Status: [In Progress / Planning / Testing]
- Branch: [If applicable]

🎯 TODAY'S GOAL:
[Specific, measurable goal]

📝 WHAT CHANGED SINCE LAST SESSION:
[Brief summary or "First session"]

📂 FILES/MODULES WE'RE WORKING ON:
- [Specific file paths]
- [Related modules]

❓ QUESTION/TASK:
[Specific question or task]

🔧 CONTEXT:
- Constraints: [Mobile-first, no breaking changes, etc.]
- Requirements: [Acceptance criteria]
- Related: [Links to relevant docs]

📚 I'VE READ:
- ✅ SESSION_QUICK_START.md
- ✅ [Other relevant docs]
```

---

## 🔄 Maintenance Checklist

### After Each Session

- [ ] Update "What Changed Since Last Session"
- [ ] Update "Current Sprint" if focus changed
- [ ] Note any blockers or dependencies
- [ ] Update version if new release

### Weekly

- [ ] Review and clean up "What Changed" section (archive old entries)
- [ ] Update "Next Steps" priorities
- [ ] Verify version numbers are current
- [ ] Check that links still work

### Monthly

- [ ] Review entire file structure
- [ ] Archive completed work to appropriate docs
- [ ] Update roadmap/planning sections
- [ ] Refresh examples and templates

---

## 📚 Related Documentation

- **[01-SESSION_QUICK_START.md](../01-SESSION_QUICK_START.md)** - Primary onboarding file
- **[README.md](../README.md)** - Project overview
- **[APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)** - System architecture

---

## 💬 Questions?

If you're unsure how to structure information for an LLM session:

1. **Start with the template** - It covers the essentials
2. **Be specific** - File paths, line numbers, clear goals
3. **Provide context** - Why this work? What constraints?
4. **Update regularly** - Keep current state accurate

**Remember:** The goal is to get the LLM productive quickly, not to document everything. Link to detailed docs rather than inlining everything.

