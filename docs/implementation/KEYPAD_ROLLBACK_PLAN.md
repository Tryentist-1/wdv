# Keypad Stable Rollback Plan

**Date:** November 2025  
**Purpose:** Emergency rollback procedure if keypad migration causes critical issues  
**Tag Name:** `keypad-stable-rollback`

---

## 🎯 Rollback Strategy

This document provides step-by-step instructions for rolling back to the stable keypad implementation if the new 4x3 layout migration causes any critical issues.

---

## 📋 Pre-Rollback Checklist

Before rolling back, verify the issue:

- [ ] Issue is confirmed on production
- [ ] Issue affects critical functionality (focus, scoring, etc.)
- [ ] Issue cannot be fixed with a quick patch
- [ ] Rollback is the best solution

---

## 🔄 Rollback Procedure

### Method 1: Git Tag Rollback (Recommended - Fastest)

**Time Required:** 5-10 minutes

```bash
# 1. Navigate to project directory
cd /path/to/wdv

# 2. Verify the rollback tag exists
git tag -l "keypad-stable-rollback"

# 3. Checkout the stable version
git checkout keypad-stable-rollback

# 4. Verify you're on the correct commit
git log -1 --oneline

# 5. Deploy the previous version
./DeployFTP.sh --remote-backup

# 6. Purge Cloudflare cache
./test_cloudflare.sh

# 7. Verify rollback on production
# Test keypad functionality at: https://tryentist.com/wdv/
```

**Expected Result:**
- Keypad returns to previous 4x4 layout with navigation buttons
- All focus functionality works as before
- No breaking changes

---

### Method 2: Backup Restore (If Git Rollback Fails)

**Time Required:** 15-20 minutes

```bash
# 1. Find the backup created during deployment
ls -lh deploy_backups/remote_backup_*.tar.gz

# 2. Extract the backup (use the most recent one from before migration)
cd deploy_backups
tar -xzf remote_backup_YYYYMMDD_HHMMSS.tar.gz

# 3. Review what will be restored
ls -la

# 4. Restore files via FTP
# Option A: Use DeployFTP.sh with extracted files
# Option B: Manual FTP upload of extracted files

# 5. Purge Cloudflare cache
cd ..
./test_cloudflare.sh

# 6. Verify rollback
# Test keypad functionality on production
```

---

### Method 3: Selective File Rollback (If Only Keypad Files Need Reverting)

**Time Required:** 10-15 minutes

If only keypad-related files need to be reverted:

```bash
# 1. Checkout specific files from rollback tag
git checkout keypad-stable-rollback -- js/ranking_round_300.js
git checkout keypad-stable-rollback -- js/solo_card.js
git checkout keypad-stable-rollback -- js/team_card.js
git checkout keypad-stable-rollback -- scorecard_editor.html

# 2. Review changes
git diff

# 3. Commit the rollback
git add js/ranking_round_300.js js/solo_card.js js/team_card.js scorecard_editor.html
git commit -m "rollback: Revert keypad to stable 4x4 layout"

# 4. Deploy
./DeployFTP.sh --remote-backup

# 5. Purge cache
./test_cloudflare.sh
```

---

## ✅ Post-Rollback Verification

After rollback, verify:

- [ ] **Keypad Appearance**
  - [ ] Keypad shows 4x4 layout with navigation buttons
  - [ ] Buttons have spacing (gap-2)
  - [ ] M button styling matches previous version

- [ ] **Focus Functionality**
  - [ ] Focus on input → keypad appears
  - [ ] Enter score → auto-advances to next input
  - [ ] Prev/Next buttons work
  - [ ] CLEAR button works
  - [ ] CLOSE button works

- [ ] **All Modules**
  - [ ] Ranking Round 300 keypad works
  - [ ] Solo Card keypad works
  - [ ] Team Card keypad works
  - [ ] Scorecard Editor keypad works

- [ ] **Mobile Testing**
  - [ ] Touch input → keypad appears
  - [ ] All buttons respond to touch
  - [ ] Focus navigation works

---

## 📝 Rollback Communication

If rollback is performed:

1. **Document the Issue**
   - What went wrong?
   - Why did rollback occur?
   - What needs to be fixed?

2. **Update Status**
   - Mark migration TODO as "ROLLED BACK"
   - Note the specific issue encountered

3. **Plan Fix**
   - Identify root cause
   - Create fix plan
   - Schedule re-attempt if needed

---

## 🔍 Troubleshooting Rollback Issues

### Issue: Git tag not found

```bash
# Check if tag exists remotely
git fetch --tags

# If tag doesn't exist, create it from current stable commit
git tag -a "keypad-stable-rollback" <stable-commit-hash> -m "Stable keypad state"
git push origin keypad-stable-rollback
```

### Issue: Backup file not found

```bash
# List all backups
ls -lh deploy_backups/

# If no backup, use git to restore
git checkout keypad-stable-rollback
./DeployFTP.sh --remote-backup
```

### Issue: Files not updating after rollback

```bash
# Force Cloudflare cache purge
./test_cloudflare.sh

# Wait 1-2 minutes for cache to clear
# Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
```

---

## 📞 Emergency Contacts

If rollback fails or issues persist:

1. Check git log for stable commit
2. Review deployment backups
3. Contact system administrator if needed

---

## 📅 Rollback Tag Creation

**When to Create:** Before starting keypad migration

**Command:**
```bash
# Create tag from current HEAD (stable state)
git tag -a "keypad-stable-rollback" -m "Stable keypad state before 4x3 layout migration"

# Push tag to remote
git push origin keypad-stable-rollback

# Verify tag
git tag -l "keypad-stable-rollback"
git show keypad-stable-rollback
```

**Tag Should Include:**
- Current working keypad implementation (4x4 layout)
- All focus functionality working
- All modules functional
- Production-ready state

---

**Last Updated:** November 2025  
**Status:** Ready for Use

