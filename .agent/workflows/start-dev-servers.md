---
description: Start PHP and MySQL dev servers
---

# Start Development Servers

This workflow starts the local PHP development server and ensures MySQL is running for the wdv project.

## Steps

// turbo-all

1. **Start MySQL service**
   ```bash
   brew services start mysql
   ```

2. **Verify MySQL is running**
   ```bash
   mysqladmin ping -h localhost
   ```

3. **Start PHP development server (background)**
   ```bash
   npm run serve
   ```

## Notes

- The PHP server will run on http://localhost:8001
- MySQL will continue running in the background
- To stop MySQL: `brew services stop mysql`
- The PHP server will stay running until you terminate it
- Access the main app at: http://localhost:8001/index.html
- Access the coach console at: http://localhost:8001/coach.html

## Related Workflows

- **Coach Testing:** [Coach Login Start](coach-login-start.md) - After starting servers, test coach features
- **Bug Fixes:** [Bug Fix Workflow](bug-workflow.md) - If you encounter issues during development
- **Post-Deployment:** [Post-Deployment Testing](post-deployment-testing.md) - Testing after deploying changes
