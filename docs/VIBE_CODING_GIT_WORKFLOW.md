# Simple Git Workflow for Vibe Coding

## Quick Reference: Safe Git Commands

### 1. Before Starting Work
```bash
# Check what branch you're on and if you have any uncommitted changes
git status
```

### 2. Creating a Safe Point (Before Making Changes)
```bash
# Create a new branch for your changes
git checkout -b vibe/your-feature-name

# Example: git checkout -b vibe/mobile-landing-page
```

### 3. During Development
```bash
# Check what files you've changed
git status

# Save your changes
git add .
git commit -m "Description of what you changed"
```

### 4. If Something Goes Wrong
```bash
# Discard all changes and go back to last commit
git reset --hard

# Go back to a specific commit
git checkout <commit-hash>
```

## Safe Points and Rollbacks

### Creating Safe Points
Think of Git commits as "save points" in a game. Create them often:

1. Before making big changes
2. After completing a working feature
3. Before trying something experimental

### How to Roll Back

#### Option 1: Undo Last Commit (Keep Changes)
```bash
# Undo last commit but keep the changes
git reset --soft HEAD~1
```

#### Option 2: Undo Last Commit (Discard Changes)
```bash
# Undo last commit and discard changes
git reset --hard HEAD~1
```

#### Option 3: Go Back to a Specific Point
```bash
# See commit history
git log --oneline

# Go back to a specific commit
git checkout <commit-hash>
```

## Best Practices for Vibe Coding

1. **Create a New Branch for Each Session**
   - Name it `vibe/description-of-what-youre-doing`
   - Example: `vibe/mobile-landing-page`

2. **Commit Often**
   - Think of commits as save points
   - Use clear, descriptive messages
   - Example: "Add mobile navigation menu"

3. **Before Trying Something Risky**
   - Create a new branch
   - Make a commit
   - If it doesn't work, you can easily go back

4. **Keep Your Main Branch Clean**
   - Don't work directly on `main`
   - Always create a new branch for changes
   - Merge back to `main` only when you're happy with the changes

## Common Scenarios

### Scenario 1: You Made Changes and Want to Start Over
```bash
# Discard all changes
git reset --hard
```

### Scenario 2: You Want to Try Something Experimental
```bash
# Create a new branch
git checkout -b vibe/experiment-name

# If it works, you can merge it back
# If it doesn't, you can delete the branch
git branch -D vibe/experiment-name
```

### Scenario 3: You Want to Save Your Work but Not Commit Yet
```bash
# Save changes temporarily
git stash

# Later, get your changes back
git stash pop
```

## Tips for Safe Development

1. **Always Check Status**
   ```bash
   git status
   ```
   This tells you what branch you're on and what files you've changed.

2. **Create Branches for New Features**
   ```bash
   git checkout -b vibe/feature-name
   ```
   This keeps your main branch clean and makes it easy to undo changes.

3. **Commit Often with Clear Messages**
   ```bash
   git add .
   git commit -m "Clear description of what you changed"
   ```
   This creates save points you can return to.

4. **If You're Unsure, Create a New Branch**
   - It's better to have too many branches than to risk losing work
   - You can always delete branches you don't need

## Remember

- Git is your friend for keeping track of changes
- Branches are like parallel universes where you can try things safely
- Commits are save points you can return to
- If something goes wrong, you can always go back to a working state

## Need Help?

If you're unsure about a Git command:
1. Check this document
2. Use `git status` to see where you are
3. Create a new branch before making changes
4. Commit often to create save points 