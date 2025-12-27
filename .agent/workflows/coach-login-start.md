---
description: Step-by-step workflow to log in as coach and navigate to archer verification
---

# Coach Login Start Workflow

This workflow guides you through logging in as a coach and navigating to the archer verification screen in the browser.

## Steps

### 1. Open Browser and Navigate to Application

Navigate to the local development server:
```
http://localhost:8001/index.html
```

**Expected:** Home page loads with menu options

---

### 2. Click "Coaches" Button

Click the "Coaches" button on the home page.

**Expected:** Coach Console page loads or coach login modal appears

---

### 3. Enter Coach Passcode

When the coach login modal appears, enter the coach passcode:
```
wdva26
```

Click the login/submit button.

**Expected:** Modal closes, coach console loads, and coach credentials are saved to localStorage

---

### 4. Click "Home" Button

From the coach console (or wherever you are), click the "Home" button (usually in the footer or navigation).

**Expected:** Navigate back to the home page (index.html)

---

### 5. Click "Archer Details" Button

On the home page, click the "Archer Details" button (or "Archer List" / "Archer Setup" button).

**Expected:** Navigate to archer_list.html

---

### 6. Handle "Select Your Profile" Modal (If Present)

If a modal appears prompting you to "Select Your Profile":

- Click the **OK** button to dismiss the modal

**Expected:** Modal closes, archer list displays

---

### 7. Search for Archer

In the search field at the top of the archer list, type:
```
ter
```

**Expected:** Archer list filters to show archers with "ter" in their name (e.g., Terry Adams)

---

### 8. Select Terry Adams

Click the **Plus Sign (+)** button on the Terry Adams row.

**Expected:** 
- Terry Adams is selected/highlighted
- Modal may open with archer details
- Or archer is added to a selection list

---

### 9. Clear Search Field

Clear the search field to remove the filter.

**Expected:** Full archer list displays again

---

## Verification Checklist

After completing these steps, verify:

- [ ] You are logged in as coach (coach buttons should be visible in footer)
- [ ] You are on the archer list page
- [ ] Terry Adams is selected/visible
- [ ] Search field is cleared
- [ ] All archers are visible in the list

---

## Troubleshooting

### Coach Login Modal Doesn't Appear
- Try navigating directly to: `http://localhost:8001/coach.html`
- Check browser console for JavaScript errors
- Verify server is running on port 8001

### Coach Passcode Doesn't Work
- Verify passcode: `wdva26`
- Check browser console for authentication errors
- Try clearing localStorage and logging in again

### "Select Your Profile" Modal Keeps Appearing
- Click OK to dismiss
- Or select an archer profile to set as "You"
- The modal appears when no profile is selected

### Archer List Doesn't Load
- Check that server is running: `npm run serve`
- Verify database connection in browser console
- Check network tab for failed API requests

### Coach Buttons Not Visible
- Check browser console for `[Coach Mode Check]` and `[Update Coach Buttons]` logs
- Verify coach credentials in localStorage:
  ```javascript
  localStorage.getItem('coach_api_key')
  localStorage.getItem('live_updates_config')
  ```
- Refresh page after logging in as coach

---

## Notes

- **Coach Passcode:** `wdva26` (stored in `COACH_PASSCODE` constant in `js/coach.js`)
- **Local Development:** Uses `localhost:8001` for local development server
- **Production:** Use `https://archery.tryentist.com/` instead
- **Coach Mode:** Detected by checking for `coach_api_key` or `live_updates_config.apiKey` in localStorage

---

## Related Workflows

- **Start Development Servers:** [Start Development Servers](start-dev-servers.md) - Set up local environment first
- **Post-Deployment Testing:** [Post-Deployment Testing](post-deployment-testing.md) - Testing after deployment
- **Bug Fixes:** [Bug Fix Workflow](bug-workflow.md) - If you find issues while testing

---

## Browser Shortcuts

For quick testing, you can also:
1. Navigate directly to: `http://localhost:8001/coach.html`
2. Enter passcode: `wdva26`
3. Navigate to: `http://localhost:8001/archer_list.html`

This skips the home page navigation steps but achieves the same result.

