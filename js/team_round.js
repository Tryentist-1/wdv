// JavaScript logic specific to the Team Round Scorecard (team_round.html)
// V6: Added Gender inputs, updated localStorage key to use entered School code.

(function () { // Wrap in an IIFE
    console.log("Team Round Scorecard JS V6 loaded.");

    // --- Configuration ---
    const config = { round: 'Team' }; // School removed, will get from input

    // --- Helper Function: Get Date Stamp ---
    function getTodayStamp() {
        const today = new Date();
        // Format: YYYY-MM-DD (ensure month/day are 2 digits)
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${today.getFullYear()}-${month}-${day}`;
    }

    // --- State Variable ---
    let shootOffWinnerOverride = null; // 't1', 't2', or null

    // --- Get Element References ---
    const calculateButton = document.getElementById('calculate-button');
    const resetButton = document.getElementById('reset-button');
    const shootOffRow = document.getElementById('shoot-off');
    // ** UPDATED References to match HTML **
    const t1SchoolInput = document.getElementById('t1-school');
    const t1GenderInput = document.getElementById('t1-gender');
    const t1LevelInput = document.getElementById('t1-level'); // Was t1-div
    const t1NumInput = document.getElementById('t1-num');
    const t2SchoolInput = document.getElementById('t2-school');
    const t2GenderInput = document.getElementById('t2-gender');
    const t2LevelInput = document.getElementById('t2-level'); // Was t2-div
    const t2NumInput = document.getElementById('t2-num');
    // ** END UPDATED References **
    const notesInput = document.getElementById('notes');
    const matchResultElement = document.getElementById('match-result');
    const scoreInputs = document.querySelectorAll('table input[type="text"][id*="-a"]');
    const soWinnerText = document.getElementById('so-winner-text');
    const tieBreakerControls = document.querySelector('.tie-breaker-controls');
    const t1SoWinButton = document.getElementById('t1-so-win-button');
    const t2SoWinButton = document.getElementById('t2-so-win-button');

    // --- Helper Function: Generate Session Key ---
    // Now uses the currently entered School abbreviation from t1-school input
    function getSessionKey() {
        const schoolAbbr = (t1SchoolInput.value.trim().toUpperCase() || "NOSCHOOL").substring(0, 3); // Use entered value or default, max 3 chars
        const todayStamp = getTodayStamp();
        // Key format: archeryScores_RoundType_SchoolCode_YYYY-MM-DD
        return `archeryScores_${config.round}_${schoolAbbr}_${todayStamp}`;
    }

    // --- Initial Setup ---
    if (shootOffRow) shootOffRow.style.display = 'none';
    if (tieBreakerControls) tieBreakerControls.style.display = 'none';
    // Load data using the key derived from initial/default school value
    loadDataFromLocalStorage();

    // --- Add Event Listeners ---
    if (calculateButton) calculateButton.addEventListener('click', calculateAllScores);
    if (resetButton) resetButton.addEventListener('click', resetFormAndStorage);
    // Calculate/Save on score input change
    scoreInputs.forEach(input => input.addEventListener('input', calculateAllScores));
    // Calculate/Save on team info change (including new gender/level selects)
     [t1SchoolInput, t1GenderInput, t1LevelInput, t1NumInput, t2SchoolInput, t2GenderInput, t2LevelInput, t2NumInput, notesInput].forEach(input => {
        if(input) input.addEventListener('change', calculateAllScores);
     });
     // Tie-breaker button listeners
     if (t1SoWinButton) t1SoWinButton.addEventListener('click', () => handleTieBreakerWin('t1'));
     if (t2SoWinButton) t2SoWinButton.addEventListener('click', () => handleTieBreakerWin('t2'));


    // --- Helper: isEndComplete ---
    function isEndComplete(endNum) { /* ... (same) ... */
        for (let team = 1; team <= 2; team++) { for (let arrow = 1; arrow <= 6; arrow++) { const i = document.getElementById(`t${team}-e${endNum}-a${arrow}`); if (!i || i.value.trim() === '' || isNaN(parseScore(i.value))) return false; } } return true;
    }
    // --- Helper: isShootOffComplete ---
     function isShootOffComplete() { /* ... (same) ... */
        for (let team = 1; team <= 2; team++) { for (let arrow = 1; arrow <= 3; arrow++) { const i = document.getElementById(`t${team}-so-a${arrow}`); if (!i || i.value.trim() === '' || isNaN(parseScore(i.value))) return false; } } return true;
     }

    // --- Main Calculation Function ---
    function calculateAllScores() { /* ... (Core calculation logic remains the same) ... */
        // console.log("Calculating scores...");
        let t1MatchScore = 0, t2MatchScore = 0, matchOver = false, winner = null, overallInputsValid = true;
        clearHighlights(); if (tieBreakerControls) tieBreakerControls.style.display = 'none';
        // Loop Ends 1-4
        for (let end = 1; end <= 4; end++) { /* ... (Calculate totals, check validity - same) ... */
            let t1EndTotal = 0, t2EndTotal = 0, endHasScores = false;
            for (let arrow = 1; arrow <= 6; arrow++) { const i = document.getElementById(`t1-e${end}-a${arrow}`); const s = parseScore(i.value); if (isNaN(s)) { t1EndTotal += 0; i.style.backgroundColor = '#ffdddd'; overallInputsValid = false; } else { t1EndTotal += s; if (i.value.trim() !== '') endHasScores = true; } }
            for (let arrow = 1; arrow <= 6; arrow++) { const i = document.getElementById(`t2-e${end}-a${arrow}`); const s = parseScore(i.value); if (isNaN(s)) { t2EndTotal += 0; i.style.backgroundColor = '#ffdddd'; overallInputsValid = false; } else { t2EndTotal += s; if (i.value.trim() !== '') endHasScores = true; } }
            document.getElementById(`t1-e${end}-total`).textContent = t1EndTotal; document.getElementById(`t2-e${end}-total`).textContent = t2EndTotal;
            let t1SetPoints = 0, t2SetPoints = 0; const endComplete = isEndComplete(end);
            if (!matchOver && endComplete) { /* ... (Calculate set points, accumulate match score, check win - same) ... */
                if (t1EndTotal > t2EndTotal) { t1SetPoints = 2; t2SetPoints = 0; } else if (t2EndTotal > t1EndTotal) { t1SetPoints = 0; t2SetPoints = 2; } else { t1SetPoints = 1; t2SetPoints = 1; }
                t1MatchScore += t1SetPoints; t2MatchScore += t2SetPoints;
                if (t1MatchScore >= 5 || t2MatchScore >= 5) { matchOver = true; winner = (t1MatchScore > t2MatchScore) ? 't1' : 't2'; }
            } else if (!endHasScores) { t1SetPoints = '-'; t2SetPoints = '-'; } else { t1SetPoints = 0; t2SetPoints = 0; }
            document.getElementById(`t1-e${end}-setpts`).textContent = t1SetPoints; document.getElementById(`t2-e${end}-setpts`).textContent = t2SetPoints;
        } // End loop
        // Check Shoot-Off
        let shootOffOccurred = false, shootOffComplete = false;
        if (!matchOver && t1MatchScore === 4 && t2MatchScore === 4) { /* ... (SO calculation, tie check, button display - same) ... */
            shootOffOccurred = true; if (shootOffRow) shootOffRow.style.display = 'table-row'; let t1SO = 0, t2SO = 0, soValid = true;
            for (let a = 1; a <= 3; a++) { const i1 = document.getElementById(`t1-so-a${a}`); const s1 = parseScore(i1.value); if (isNaN(s1)) { t1SO += 0; i1.style.backgroundColor = '#ffdddd'; soValid = false; overallInputsValid = false; } else { t1SO += s1; } const i2 = document.getElementById(`t2-so-a${a}`); const s2 = parseScore(i2.value); if (isNaN(s2)) { t2SO += 0; i2.style.backgroundColor = '#ffdddd'; soValid = false; overallInputsValid = false; } else { t2SO += s2; } }
            document.getElementById('t1-so-total').textContent = t1SO; document.getElementById('t2-so-total').textContent = t2SO; shootOffComplete = isShootOffComplete(); let soWinnerTextMsg = "-";
            if (shootOffComplete && soValid) { if (t1SO > t2SO) { winner = 't1'; soWinnerTextMsg = "T1 Wins SO"; matchOver = true; if (shootOffWinnerOverride) shootOffWinnerOverride = null; } else if (t2SO > t1SO) { winner = 't2'; soWinnerTextMsg = "T2 Wins SO"; matchOver = true; if (shootOffWinnerOverride) shootOffWinnerOverride = null; } else { soWinnerTextMsg = "SO Tied!"; if (shootOffWinnerOverride === 't1') { winner = 't1'; soWinnerTextMsg += " T1 Wins (Closest)"; matchOver = true; } else if (shootOffWinnerOverride === 't2') { winner = 't2'; soWinnerTextMsg += " T2 Wins (Closest)"; matchOver = true; } else { soWinnerTextMsg += " Judge Call Needed:"; winner = null; matchOver = false; if (tieBreakerControls) tieBreakerControls.style.display = 'inline-block'; } } } else if (shootOffOccurred && !shootOffComplete) { soWinnerTextMsg = "Enter SO Scores"; winner = null; matchOver = false; } else if (shootOffOccurred && !soValid) { soWinnerTextMsg = "Invalid SO Scores"; winner = null; matchOver = false; } if (soWinnerText) soWinnerText.textContent = soWinnerTextMsg;
        } else if (!shootOffOccurred) { if (shootOffRow) shootOffRow.style.display = 'none'; if (shootOffWinnerOverride) shootOffWinnerOverride = null; }
        // Update Final Displays
        document.getElementById('t1-match-score').textContent = t1MatchScore; document.getElementById('t2-match-score').textContent = t2MatchScore;
        if(matchOver) { updateMatchResult(winner, t1MatchScore, t2MatchScore); } else if (shootOffOccurred && !shootOffComplete) { matchResultElement.textContent = "Shoot-Off Required - Enter SO Scores"; matchResultElement.style.color = 'orange'; } else if (shootOffOccurred && winner === null && shootOffWinnerOverride === null) { matchResultElement.textContent = "Shoot-Off Tied - Awaiting Judge Call"; matchResultElement.style.color = 'orange'; } else { updateMatchResult(null, t1MatchScore, t2MatchScore); }
        // Save data
        saveDataToLocalStorage();
        if (!overallInputsValid) console.warn("Invalid scores detected. Please review highlighted fields.");
    } // --- End calculateAllScores ---

    // --- Handle Tie-Breaker Button Click ---
    function handleTieBreakerWin(winningTeam) { /* ... (same) ... */
        console.log(`Tie breaker: ${winningTeam} Wins`); shootOffWinnerOverride = winningTeam; if (tieBreakerControls) tieBreakerControls.style.display = 'none'; let t1 = parseInt(document.getElementById('t1-match-score').textContent, 10); let t2 = parseInt(document.getElementById('t2-match-score').textContent, 10); if (soWinnerText) { soWinnerText.textContent = `SO Tied! ${winningTeam === 't1' ? 'T1' : 'T2'} Wins (Closest)`; } updateMatchResult(winningTeam, t1, t2); saveDataToLocalStorage();
    }

     // --- Update Match Result Display ---
     function updateMatchResult(winner, t1Score, t2Score) {
        // Use school codes for display name
        const team1Name = t1SchoolInput.value || "Team 1"; // Use updated ID
        const team2Name = t2SchoolInput.value || "Team 2"; // Use updated ID
        let message = ""; let color = "black";
        if (winner === 't1') { message = `${team1Name} Wins! (${t1Score} - ${t2Score})`; color = 'green'; }
        else if (winner === 't2') { message = `${team2Name} Wins! (${t2Score} - ${t1Score})`; color = 'red'; }
        else if (winner === 'tie') { message = `Match Tied after Shoot-Off Tie! (${t1Score} - ${t2Score})`; color = 'orange'; }
        else { message = "Match In Progress"; color = 'black'; }
        matchResultElement.textContent = message; matchResultElement.style.color = color;
     }

    // --- Helper Function (Parse Score Input) ---
    function parseScore(scoreInput) { /* ... (same) ... */
        if (!scoreInput || scoreInput.trim() === '') return 0; const score = scoreInput.trim().toUpperCase(); if (score === 'X') return 10; if (score === 'M') return 0; const n = parseInt(score, 10); if (!isNaN(n) && n >= 0 && n <= 10) return n; return NaN;
    }

     // --- Helper Function to Clear Highlights ---
     function clearHighlights() { /* ... (same) ... */
        scoreInputs.forEach(input => input.style.backgroundColor = '');
     }

    // --- Local Storage Functions ---
    function saveDataToLocalStorage() {
        // console.log("Saving data...");
        const data = {
            // ** UPDATED to save new fields **
            t1School: t1SchoolInput.value,
            t1Gender: t1GenderInput.value,
            t1Level: t1LevelInput.value,
            t1Num: t1NumInput.value,
            t2School: t2SchoolInput.value,
            t2Gender: t2GenderInput.value,
            t2Level: t2LevelInput.value,
            t2Num: t2NumInput.value,
            // ** END UPDATED **
            notes: notesInput.value,
            scores: {},
            shootOffWinnerOverride: shootOffWinnerOverride
        };
        scoreInputs.forEach(input => { data.scores[input.id] = input.value; });
        try {
            const key = getSessionKey(); // Generate dynamic key before saving
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) { console.error("Error saving data:", e); }
    }

    function loadDataFromLocalStorage() {
        const key = getSessionKey(); // Generate dynamic key before loading
        try {
            const savedData = localStorage.getItem(key);
            if (savedData) {
                const data = JSON.parse(savedData);
                console.log("Loading data from localStorage...");
                // ** UPDATED to load new fields **
                t1SchoolInput.value = data.t1School || 'WDV'; // Default if not saved
                t1GenderInput.value = data.t1Gender || 'M';
                t1LevelInput.value = data.t1Level || 'JV';
                t1NumInput.value = data.t1Num || '01';
                t2SchoolInput.value = data.t2School || 'Opp';
                t2GenderInput.value = data.t2Gender || 'M';
                t2LevelInput.value = data.t2Level || 'JV';
                t2NumInput.value = data.t2Num || '01';
                // ** END UPDATED **
                notesInput.value = data.notes || '';
                shootOffWinnerOverride = data.shootOffWinnerOverride || null;
                if (data.scores) { scoreInputs.forEach(input => { if (data.scores[input.id] !== undefined) input.value = data.scores[input.id]; else input.value = ''; }); }
                calculateAllScores(); // Recalculate after loading
                console.log("Data loaded.");
            } else {
                 console.log("No saved data found for key:", key);
                 // Set defaults maybe, then calculate
                 setDefaultTeamInfo(); // Set defaults if no data found
                 calculateAllScores(); // Calculate initial state
            }
        } catch (e) {
            console.error("Error loading data:", e); localStorage.removeItem(key); calculateAllScores();
        }
    }

     // --- Reset Functionality ---
     function resetFormAndStorage() {
         const key = getSessionKey(); // Get current key to remove correct item
         console.log("Resetting form and localStorage for key:", key);
         if (confirm(`Are you sure you want to clear all scores and notes for this session (${key})? This cannot be undone.`)) {
             // Clear inputs
             const inputs = document.querySelectorAll('.match-info input, .match-info select, table input, .notes-section textarea');
             inputs.forEach(input => {
                 if (input.tagName === 'SELECT') {
                     input.selectedIndex = 0; // Reset selects to first option
                 } else {
                     input.value = '';
                 }
             });
             // Clear displays & highlights
             clearHighlights(); const displays = document.querySelectorAll('.score-display'); displays.forEach(display => { if (display.id.includes('-setpts') || display.id.includes('-total')) display.textContent = '0'; else display.textContent = ''; });
             document.getElementById('t1-match-score').textContent = '0'; document.getElementById('t2-match-score').textContent = '0';
             matchResultElement.textContent = 'Enter Scores Above'; matchResultElement.style.color = 'black';
             if (shootOffRow) shootOffRow.style.display = 'none'; shootOffWinnerOverride = null; if (tieBreakerControls) tieBreakerControls.style.display = 'none'; if (soWinnerText) soWinnerText.textContent = '-';
             // Clear localStorage
             try { localStorage.removeItem(key); console.log("localStorage cleared for key:", key); } catch (e) { console.error("Error clearing localStorage:", e); }
             // Set default values after clearing
             setDefaultTeamInfo();
             calculateAllScores(); // Recalculate to show cleared state
         }
     }

      // --- Helper to set default team info ---
      function setDefaultTeamInfo() {
            t1SchoolInput.value = 'WDV';
            t1GenderInput.value = 'M'; // Default to M
            t1LevelInput.value = 'JV'; // Default to JV
            t1NumInput.value = '01';
            t2SchoolInput.value = 'Opp';
            t2GenderInput.value = 'M';
            t2LevelInput.value = 'JV';
            t2NumInput.value = '01';
            notesInput.value = ''; // Clear notes too
      }

})(); // --- End IIFE ---
