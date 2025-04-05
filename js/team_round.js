    // JavaScript logic specific to the Team Round Scorecard (team_round.html)

    // Wait for the HTML document to be fully loaded before running script
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Team Round Scorecard JS loaded."); // Check console to confirm loading

        // Get references to the buttons (optional here, but good practice)
        const calculateButton = document.getElementById('calculate-button');
        const resetButton = document.getElementById('reset-button'); // Assuming you add reset logic later

        // Add event listener to the calculate button
        if (calculateButton) {
            calculateButton.addEventListener('click', calculateAllScores);
        }

        // --- Main Calculation Function ---
        function calculateAllScores() {
            console.log("Calculate button clicked!"); // Check console

            // TODO: Implement the core logic here:
            // 1. Loop through ends 1-4.
            // 2. For each end:
            //    - Read arrow scores for Team 1 and Team 2.
            //    - Calculate End Totals (handle 'X' and 'M').
            //    - Calculate Set Points based on End Totals.
            //    - Update the corresponding display cells in the HTML table.
            // 3. Calculate total Match Score (sum of set points).
            // 4. Check if match score reaches 5+ for either team to declare winner.
            // 5. Check if a shoot-off is needed (tied 4-4 after end 4).
            // 6. If shoot-off needed:
            //    - Make shoot-off row visible (if hidden).
            //    - Read shoot-off arrow scores.
            //    - Calculate shoot-off totals.
            //    - Determine shoot-off winner (and overall match winner).
            // 7. Update the final Match Score display and Match Result display.
            // 8. Optional: Implement localStorage saving/loading.

            alert("Calculation logic not yet implemented!"); // Placeholder
        }

        // --- Helper Function Example (Convert score input like 'X' or 'M') ---
        function parseScore(scoreInput) {
            const score = scoreInput.trim().toUpperCase();
            if (score === 'X') {
                return 10;
            }
            if (score === 'M') {
                return 0;
            }
            const numberScore = parseInt(score, 10);
            // Return NaN if it's not a valid number or X/M
            return isNaN(numberScore) ? NaN : numberScore;
        }

        // --- Optional: Reset Functionality ---
        // if (resetButton) {
        //    resetButton.addEventListener('click', () => {
        //        // Logic to clear all input fields and reset display values
        //        // Could also use form.reset() if the table is inside a <form>
        //        console.log("Reset button clicked - logic TBD");
        //    });
        // }

         // --- Optional: Hide shoot-off row initially ---
         const shootOffRow = document.getElementById('shoot-off');
         if (shootOffRow) {
            // shootOffRow.style.display = 'none'; // Hide it initially
         }

    }); // End DOMContentLoaded

    