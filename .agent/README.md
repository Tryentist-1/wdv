# Agent Workflows

This directory contains step-by-step workflows for common development tasks in the WDV Archery Suite project.

## 📋 Available Workflows

### 🐛 Bug Management

- **[Bug Fix Workflow](workflows/bug-workflow.md)** - Complete process from bug discovery through deployment
  - Bug discovery and triage
  - Root cause analysis
  - Fix implementation
  - Testing and verification
  - Deployment and monitoring
  - Rollback procedures

- **[How to Log a Bug](workflows/log-bug.md)** - Quick reference for documenting bugs
  - Bug reporting checklist
  - Template for bug documentation
  - Severity guidelines
  - Mobile-first testing checklist

### 🚀 Development Workflows

- **[Start Development Servers](workflows/start-dev-servers.md)** - Start PHP and MySQL for local development
  - MySQL service startup
  - PHP development server
  - Port configuration

- **[Coach Login Start](workflows/coach-login-start.md)** - Step-by-step guide to log in as coach
  - Navigate to application
  - Enter coach passcode
  - Access archer verification
  - Troubleshooting tips

### ✅ Testing & Deployment

- **[Post-Deployment Testing](workflows/post-deployment-testing.md)** - Comprehensive testing after deployment
  - Automated testing steps
  - Manual verification checklist
  - Mobile testing requirements
  - Regression testing
  - Monitoring and rollback plans

## 🔗 Workflow Relationships

```
Bug Discovery
    ↓
[Log Bug] → [Bug Fix Workflow] → [Post-Deployment Testing]
    ↓              ↓                        ↓
    └──────────────┴────────────────────────┘
                   ↓
            [Deployment]
```

**Common Workflows:**

1. **Finding a Bug:**
   - Start with [How to Log a Bug](workflows/log-bug.md) to document it
   - Follow [Bug Fix Workflow](workflows/bug-workflow.md) to fix it
   - Use [Post-Deployment Testing](workflows/post-deployment-testing.md) after deploying

2. **Starting Development:**
   - Use [Start Development Servers](workflows/start-dev-servers.md) to set up local environment
   - Use [Coach Login Start](workflows/coach-login-start.md) to test coach features

3. **After Deployment:**
   - Always run [Post-Deployment Testing](workflows/post-deployment-testing.md)
   - Monitor for issues and use [Bug Fix Workflow](workflows/bug-workflow.md) if needed

## 📝 Workflow Best Practices

### Before Starting
- Read the relevant workflow completely
- Gather any required information (passcodes, URLs, etc.)
- Ensure prerequisites are met (servers running, database accessible)

### During Execution
- Follow steps in order
- Check expected results at each step
- Document any deviations or issues encountered

### After Completion
- Verify success criteria are met
- Update documentation if workflow needs improvement
- Note any shortcuts or improvements discovered

## 🎯 Quick Reference

| Task | Workflow | Time Estimate |
|------|----------|---------------|
| Report a bug | [Log Bug](workflows/log-bug.md) | 5-10 min |
| Fix a bug | [Bug Fix Workflow](workflows/bug-workflow.md) | 1-4 hours |
| Start dev environment | [Start Dev Servers](workflows/start-dev-servers.md) | 2 min |
| Test as coach | [Coach Login](workflows/coach-login-start.md) | 5 min |
| Test after deploy | [Post-Deployment Testing](workflows/post-deployment-testing.md) | 30-60 min |

## 🔍 Finding the Right Workflow

**I need to...**
- **Report a bug** → [How to Log a Bug](workflows/log-bug.md)
- **Fix a bug** → [Bug Fix Workflow](workflows/bug-workflow.md)
- **Set up local dev** → [Start Development Servers](workflows/start-dev-servers.md)
- **Test coach features** → [Coach Login Start](workflows/coach-login-start.md)
- **Verify deployment** → [Post-Deployment Testing](workflows/post-deployment-testing.md)

## 📚 Related Documentation

- **Project Overview:** [01-SESSION_QUICK_START.md](../01-SESSION_QUICK_START.md)
- **Deployment:** [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)
- **Testing:** [docs/testing/](../docs/testing/)
- **Bug Examples:** [docs/bugs/](../docs/bugs/)
- **Fixes:** [docs/fixes/](../docs/fixes/)

## 🤝 Contributing

When adding a new workflow:

1. Create a new `.md` file in `workflows/`
2. Include frontmatter with `description` field
3. Use clear step-by-step structure
4. Add cross-references to related workflows
5. Update this README with the new workflow
6. Test the workflow yourself before committing

## 📝 Notes

- All workflows assume mobile-first testing (99% of users are on phones)
- Workflows follow project principles (database as source of truth, UUIDs, etc.)
- Always test on actual mobile devices, not just browser dev tools
- See [.cursor/rules/](../.cursor/rules/) for coding standards and architecture patterns

---

**Last Updated:** December 15, 2025

