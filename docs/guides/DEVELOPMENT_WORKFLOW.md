# Development Workflow and Git Practices

## Git Workflow

### 1. Branch Management

#### Main Branches
- `main`: Production-ready code
- `develop`: Integration branch for features

#### Feature Branches
- Create feature branches from `develop`
- Naming convention: `feature/description-of-feature`
- Example: `feature/mobile-responsive-landing`

#### Hotfix Branches
- Create hotfix branches from `main`
- Naming convention: `hotfix/description-of-fix`
- Example: `hotfix/score-calculation-bug`

### 2. Development Process

1. **Before Starting Work**
   ```bash
   # Check current branch and status
   git status
   
   # Update local main and develop
   git checkout main
   git pull origin main
   git checkout develop
   git pull origin develop
   ```

2. **Creating a New Feature**
   ```bash
   # Create and switch to new feature branch
   git checkout -b feature/your-feature-name
   
   # Verify you're on the new branch
   git status
   ```

3. **During Development**
   ```bash
   # Check status frequently
   git status
   
   # Stage changes
   git add <files>
   
   # Commit with descriptive message
   git commit -m "Description of changes"
   
   # Push to remote
   git push origin feature/your-feature-name
   ```

4. **Before Merging**
   ```bash
   # Update your feature branch with develop
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature-name
   git merge develop
   
   # Resolve any conflicts
   # Test thoroughly
   ```

### 3. Best Practices

1. **Commit Messages**
   - Use present tense ("Add feature" not "Added feature")
   - Be specific and descriptive
   - Reference issue numbers if applicable
   - Example: "Add mobile navigation to landing page"

2. **Code Review**
   - Create pull requests for all changes
   - Request review from at least one team member
   - Address review comments before merging

3. **Testing**
   - Test changes locally before committing
   - Ensure all tests pass before merging
   - Test on multiple devices for UI changes

4. **Documentation**
   - Update relevant documentation with changes
   - Document any new features or modifications
   - Keep the docs folder organized

### 4. Common Git Commands

```bash
# Check current status
git status

# View branch history
git log

# Discard local changes
git checkout -- <file>

# Stash changes temporarily
git stash
git stash pop

# View remote branches
git branch -r

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name
```

### 5. Emergency Procedures

1. **Reverting Changes**
   ```bash
   # Revert to specific commit
   git revert <commit-hash>
   
   # Reset to specific commit (use with caution)
   git reset --hard <commit-hash>
   ```

2. **Recovering Lost Changes**
   ```bash
   # View reflog
   git reflog
   
   # Recover lost commit
   git checkout -b recovery-branch <commit-hash>
   ```

### 6. Continuous Integration

1. **Pre-commit Checks**
   - Run tests locally
   - Check code formatting
   - Verify documentation updates

2. **Pull Request Requirements**
   - All tests passing
   - Documentation updated
   - Code review approved
   - No merge conflicts

### 7. Version Control Best Practices

1. **File Management**
   - Don't commit sensitive data
   - Use .gitignore appropriately
   - Keep binary files out of version control

2. **Branch Lifecycle**
   - Delete feature branches after merging
   - Keep hotfix branches until deployed
   - Regular cleanup of stale branches

3. **Conflict Resolution**
   - Communicate with team members
   - Document resolution process
   - Test after resolving conflicts

## Development Environment Setup

### 1. Initial Setup
```bash
# Clone repository
git clone <repository-url>

# Install dependencies
npm install

# Set up development environment
npm run setup
```

### 2. Environment Variables
- Create `.env.local` for local development
- Never commit `.env` files
- Document required environment variables

### 3. Development Tools
- Use recommended IDE settings
- Install required extensions
- Configure linting and formatting

### 4. CSS Compilation (Tailwind CSS)
The project uses **compiled Tailwind CSS** instead of CDN for reliability and offline support.

**Initial Setup:**
```bash
# Install dependencies (if not already done)
npm install

# Compile CSS
npm run build:css
```

**During Development:**
```bash
# Watch mode - auto-compiles on changes
npm run watch:css

# Or manually compile after changes
npm run build:css

# Production build (minified)
npm run build:css:prod
```

**Important:**
- Source file: `css/tailwind.css` (edit this file)
- Compiled file: `css/tailwind-compiled.css` (used by HTML files)
- Always run `npm run build:css` after editing Tailwind CSS
- The compiled file is committed to git (so it works even if build tools aren't installed)

## Documentation Updates

When making changes that affect documentation:

1. Update relevant documentation files
2. Follow the documentation structure
3. Include examples where appropriate
4. Update version numbers if necessary

## Release Process

1. **Version Bumping**
   - Update version in package.json
   - Update documentation version numbers
   - Create version tag

2. **Release Notes**
   - Document all changes
   - List new features
   - Note bug fixes
   - Include breaking changes

3. **Deployment**
   - Test in staging environment
   - Verify all features
   - Deploy to production
   - Monitor for issues 