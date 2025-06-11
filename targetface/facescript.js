// <script> tag content starts here
    // --- Configuration ---
    let arrowsPerEnd = 3;
    let numEnds = 6;
    let targetX, targetY;
    let targetRadius;
    const ringColors = [ // Colors remain the same
      [255, 255, 255], [255, 255, 255], [0, 0, 0], [0, 0, 0],
      [100, 150, 255], [100, 150, 255], [255, 80, 80], [255, 80, 80],
      [255, 255, 100], [255, 255, 100],
    ];
    const ringScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let ringRadii = [];
    let xRingRadius;
    const xRingInputFactor = 0.65;

    // --- Match State ---
    let matchData = [];
    let currentEnd = 1;
    let currentArrowInEnd = 1;
    let matchOver = false;

    // --- Correction State ---
    let isCorrectionMode = false;
    let correctionEndIndex = -1; // 0-based
    let correctionArrowIndex = -1; // 0-based
    let correctionEndNumber = -1; // 1-based (for display)
    let correctionArrowNumber = -1; // 1-based (for display)


    // --- End of Match Stats & Analysis ---
    let totalScore = 0;
    let numXs = 0;
    let numTens = 0;
    let avgX = 0;
    let avgY = 0;
    let totalArrowsShot = 0;
    let biasDescription = "";

    // --- UI Elements ---
    let resetButton;
    let correctButton; // New button
    let saveButton;
    let statusTextY = 25;
    let buttonY = statusTextY + 25;

    // =================== SETUP ===================
    function setup() {
      // Get header height dynamically if possible
      let headerElement = document.querySelector('.page-header'); // Adjust selector if needed
      let headerHeight = headerElement ? headerElement.offsetHeight : 80; // Default if not found

      // Calculate canvas height dynamically, ensuring minimum size
      let canvasHeight = windowHeight - headerHeight - 10; // Subtract header and some padding
      canvasHeight = max(canvasHeight, 550); // Ensure a minimum height

      createCanvas(windowWidth, canvasHeight);

      // Calculate Target Position & Size
      targetX = width / 2;
      // Estimate available vertical space below buttons, considering potential scoreboard height
      let estimatedScoreboardHeight = (numEnds + 2) * 20; // Approximate height needed for scores
      let spaceBelowButtons = height - buttonY - 10; // Space from bottom of buttons to bottom edge
      let availableForTarget = spaceBelowButtons - estimatedScoreboardHeight; // Space left for target

      // Calculate target radius based on available space and width, with min/max limits
      targetRadius = min(availableForTarget * 0.4, width * 0.3, 250); // Use 40% of space, 30% of width, max 250px
      targetRadius = max(targetRadius, 50); // Ensure minimum radius

      // Position target vertically, centered in its available space below buttons
      targetY = buttonY + targetRadius + 30; // Place below buttons with some padding

      calculateRadii(); // Calculate ring sizes based on final targetRadius

      // --- Create Buttons (Positioned at Top) ---
      resetButton = createButton('Reset / Config');
      correctButton = createButton('Correct Arrow');
      saveButton = createButton('Save Results');

      positionButtons(); // Position buttons dynamically

      resetButton.mousePressed(configureAndResetMatch);
      correctButton.mousePressed(startCorrection);
      saveButton.mousePressed(saveScorecard);
      saveButton.hide();

      textAlign(LEFT, TOP);
      textSize(16);
      noStroke();

      initializeMatchData(false); // Initialize data without logging reset initially
       windowResized(); // Call windowResized once to ensure everything fits initially
    }

// =================== DRAW ===================
function draw() {
    background(240); // Light grey background

    // --- ADD THIS VERSION MARKER CODE HERE ---
    fill(0, 100, 0); // Dark green text
    textSize(10);
    textAlign(LEFT, TOP); // Align top-left for the marker
    text("Version: TouchFix 1.0", 5, 5); // Display version text at coordinates (5, 5)
    // --- END OF VERSION MARKER CODE ---

    // Reset alignment if other parts of draw need it different
    textAlign(CENTER, TOP); // Assuming you need centered text for displayCurrentStatus

    // --- Now call your other drawing functions ---
    displayCurrentStatus(); // Show current end/arrow or correction mode
    drawTarget();           // Draw the target face
    drawArrowMarkers();     // Draw existing arrow markers
    drawAveragePosition();  // Draw the average group position (if applicable)
    displayScoreboard();    // Display the end scores

    // Check if match is over after drawing everything
    if (matchOver && !isLooping()) {
        displayEndOfMatchAnalysis(); // Show final stats if match is over
        if (saveButton) saveButton.show(); // Show save button
        noLoop(); // Stop the draw loop
    } else if (!isLooping() && isCorrectionMode) {
        // If in correction mode but loop stopped, p5.js usually waits for next event
    } else if (!isLooping()) {
        // If loop stopped for other reasons (e.g., initial load), redraw ensures one frame
        redraw();
    }
} // <-- This is the closing brace for the main draw() function


    // =================== EVENT HANDLERS ===================

     function windowResized() {
        // Recalculate canvas height and element positions on window resize
        let headerElement = document.querySelector('.page-header');
        let headerHeight = headerElement ? headerElement.offsetHeight : 80;
        let canvasHeight = windowHeight - headerHeight - 10;
        canvasHeight = max(canvasHeight, 550); // Keep minimum height

        resizeCanvas(windowWidth, canvasHeight); // Resize canvas

        // Recalculate target position and size (similar logic as setup)
        targetX = width / 2;
        let estimatedScoreboardHeight = (numEnds + 2) * 20;
        let spaceBelowButtons = height - buttonY - 10;
        let availableForTarget = spaceBelowButtons - estimatedScoreboardHeight;
        targetRadius = min(availableForTarget * 0.4, width * 0.3, 250);
        targetRadius = max(targetRadius, 50);
        targetY = buttonY + targetRadius + 30; // Recalculate Y based on new radius/buttonY

        calculateRadii(); // Recalculate ring radii

        positionButtons(); // Reposition buttons

        redraw(); // Redraw everything with new dimensions
     }


    function mousePressed() {
        // This function now handles BOTH scoring and correction for mouse users
        let d = dist(mouseX, mouseY, targetX, targetY);

        if (d <= targetRadius) {
            console.log("Target clicked at (X,Y):", mouseX.toFixed(2), mouseY.toFixed(2));

            if (isCorrectionMode) {
                handleScoreClick(mouseX, mouseY);
            } else if (!matchOver) {
                scoreArrow(mouseX, mouseY);
            } else {
                console.log("Match is over. No more scoring.");
            }
            // Prevent default browser actions if the click is on the canvas
            return false;
        }
        // Allow default behavior for clicks outside the canvas (e.g., buttons)
        return true;
    }


    // =================== CORE LOGIC FUNCTIONS ===================

    // --- Combined logic for handling scoring click/touch ---
    function handleScoreClick(x, y) {
        // This function is called by both mousePressed and touchStarted
        // when a valid input occurs within the target radius in correction mode.

        let scoreValue = getScoreFromPosition(x, y); // Determine score

        // Update the specific arrow being corrected
        if (correctionEndIndex !== -1 && correctionArrowIndex !== -1) { // Use 0-based index checks
           // Ensure the data structure exists
           if (matchData[correctionEndIndex] && matchData[correctionEndIndex][correctionArrowIndex]) {

               let arrowToCorrect = matchData[correctionEndIndex][correctionArrowIndex];

               // Update score and exact position for the arrow marker
               arrowToCorrect.score = scoreValue === 'X' ? 10 : scoreValue; // Store numeric 10 for X internally for calcs
               arrowToCorrect.isX = (scoreValue === 'X'); // Store if it was an X
               arrowToCorrect.x = x; // Store exact X for potential analysis
               arrowToCorrect.y = y; // Store exact Y for potential analysis
               arrowToCorrect.displayX = x; // Update display position
               arrowToCorrect.displayY = y; // Update display position

               console.log(`Corrected End ${correctionEndNumber}, Arrow ${correctionArrowNumber} to score ${scoreValue} at (${x.toFixed(1)}, ${y.toFixed(1)})`);

               // Recalculate end total and match total
               calculateEndTotals(correctionEndIndex); // Recalculate specific end
               calculateTotalScoreAndStats(); // Recalculate overall stats

           } else {
               console.error("Error: Could not find arrow data structure to correct at index:", correctionEndIndex, correctionArrowIndex);
           }
        } else {
             console.error("Error: Correction indices invalid.");
        }

        // Exit correction mode
        isCorrectionMode = false;
        correctionEndIndex = -1;
        correctionArrowIndex = -1;
        correctionEndNumber = null;
        correctionArrowNumber = null;
        console.log("Exited correction mode.");
        redraw(); // Redraw the screen to show changes and remove correction message
    }

    // --- Score a new arrow during the match ---
    function scoreArrow(x, y) {
        if (matchOver) {
            console.warn("Attempted to score arrow after match is over. Ignoring.");
            return;
        }

        console.log(`Scoring arrow for End: ${currentEnd}, Arrow: ${currentArrowInEnd}`);

        let scoreValue = getScoreFromPosition(x, y);
        let currentEndIndex = currentEnd - 1;

        // Ensure the data structure for the current end exists
        if (!matchData[currentEndIndex]) {
            matchData[currentEndIndex] = [];
        }

        // Add the new arrow's data
        matchData[currentEndIndex].push({
            score: scoreValue === 'X' ? 10 : scoreValue,
            isX: scoreValue === 'X',
            x: x,
            y: y,
            displayX: x,
            displayY: y
        });

        // --- Move to the next arrow/end ---
        currentArrowInEnd++;
        if (currentArrowInEnd > arrowsPerEnd) {
            calculateEndTotals(currentEndIndex);
            currentArrowInEnd = 1;
            currentEnd++;
        }

        // Check if the match is now over
        if (currentEnd > numEnds) {
            matchOver = true;
            console.log("Match is now over. Finalizing scores.");
            calculateTotalScoreAndStats();
        }

        redraw();
    }

    // --- Calculate Ring Radii ---
    function calculateRadii() {
      ringRadii = [];
      let ringWidth = targetRadius / 10; // Equal width rings
      if (targetRadius <= 0) return; // Avoid division by zero or negative radius

      // Calculate radii from center outwards for 10 rings
      for (let i = 1; i <= 10; i++) {
          ringRadii.push(i * ringWidth);
      }
      // ringRadii[0] is radius for ring 1, ringRadii[9] is radius for ring 10.
      // The X ring is usually half the 10 ring.
      xRingRadius = ringRadii[9] * xRingInputFactor; // Use factor for X ring radius
      console.log("Calculated Radii:", ringRadii, "X Ring Radius:", xRingRadius);
    }


    // --- Determine Score from Position ---
    function getScoreFromPosition(x, y) {
        let d = dist(x, y, targetX, targetY);

        if (!ringRadii || ringRadii.length !== 10 || !xRingRadius) {
            console.error("Scoring radii not properly defined.");
            return 0; // Cannot determine score
        }

        // Check X ring first
        if (d <= xRingRadius) {
            return 'X';
        }
        // Check rings 10 down to 1
        for (let i = 9; i >= 0; i--) { // i = 9 (ring 10) down to i = 0 (ring 1)
            if (d <= ringRadii[i]) {
                return i + 1; // Score matches ring number (index 9 -> score 10, index 0 -> score 1)
            }
        }
        return 0; // Outside scoring area (Miss)
    }

    // --- Calculate End Totals ---
    function calculateEndTotals(endIndex) {
        if (!matchData[endIndex]) return; // Exit if end data doesn't exist

        let endTotal = 0;
        matchData[endIndex].forEach(arrow => {
            let score = arrow.isX ? 10 : (typeof arrow.score === 'number' ? arrow.score : 0);
             endTotal += score;
        });
        // Store total on the end's data structure if needed, e.g.,
        // matchData[endIndex].total = endTotal;
        // For now, we recalculate overall score directly in another function
    }


    // --- Calculate Overall Score and Stats ---
    function calculateTotalScoreAndStats() {
        totalScore = 0;
        numXs = 0;
        numTens = 0; // Reset stats
        let sumX = 0;
        let sumY = 0;
        totalArrowsShot = 0;

        matchData.forEach(end => {
            end.forEach(arrow => {
                let score = typeof arrow.score === 'number' ? arrow.score : 0;
                 totalScore += score; // Add numeric score (X counts as 10)
                 if (arrow.isX) {
                    numXs++;
                    numTens++; // X counts as a 10
                 } else if (score === 10) {
                    numTens++;
                 }
                 // Accumulate positions for average calculation
                 sumX += arrow.displayX; // Use displayX/Y for average calculation
                 sumY += arrow.displayY;
                 totalArrowsShot++;
            });
        });

        // Calculate average position if arrows were shot
        if (totalArrowsShot > 0) {
             avgX = sumX / totalArrowsShot;
             avgY = sumY / totalArrowsShot;
             analyzeBias(avgX, avgY); // Analyze the group center
        } else {
             avgX = targetX; // Default to center if no arrows
             avgY = targetY;
             biasDescription = "No arrows shot.";
        }
        console.log(`Stats Updated: Score=${totalScore}, Xs=${numXs}, 10s=${numTens}, AvgPos=(${avgX.toFixed(1)}, ${avgY.toFixed(1)})`);
    }


    // --- Analyze Group Bias ---
    function analyzeBias(avgArrowX, avgArrowY) {
         let deltaX = avgArrowX - targetX;
         let deltaY = avgArrowY - targetY;
         let threshold = targetRadius / 10; // Bias threshold (e.g., 1 ring width)
         let biasParts = [];

         // Vertical Bias
         if (deltaY < -threshold) {
             biasParts.push("High");
         } else if (deltaY > threshold) {
             biasParts.push("Low");
         }

         // Horizontal Bias
         if (deltaX < -threshold) {
             biasParts.push("Left");
         } else if (deltaX > threshold) {
             biasParts.push("Right");
         }

         if (biasParts.length > 0) {
             biasDescription = `Group Center: ${biasParts.join(' ')}`;
         } else if (dist(avgArrowX, avgArrowY, targetX, targetY) <= threshold) {
             biasDescription = "Group Center: Centered";
         } else {
             biasDescription = "Group Center: Near Center"; // If slightly off but within threshold
         }
    }

    // =================== UI DISPLAY FUNCTIONS ===================

    // --- Display Status Text ---
    function displayCurrentStatus() {
      fill(0); // Black text
      textAlign(CENTER, TOP);
      textSize(16);
      let statusMsg = "";
      if (isCorrectionMode) {
          statusMsg = `Correction Mode: Click target for End ${correctionEndNumber}, Arrow ${correctionArrowNumber}`;
      } else if (matchOver) {
          statusMsg = `Match Over! Final Score: ${totalScore}`;
      } else {
          statusMsg = `Shooting End: ${currentEnd} / ${numEnds}, Arrow: ${currentArrowInEnd} / ${arrowsPerEnd}`;
      }
      text(statusMsg, width / 2, statusTextY);
    }

    // --- Draw Target Face ---
    function drawTarget() {
      push(); // Isolate target drawing styles
      translate(targetX, targetY); // Center coordinate system on target center
      noStroke(); // No outlines for rings

      if (!ringRadii || ringRadii.length !== 10) {
          console.error("Cannot draw target, radii not defined.");
          pop(); return;
      }

      // Draw rings from outside in (background color first)
      // WA/IFAA Target Colors: White, Black, Blue, Red, Gold
      // Indices approx: 0,1=White, 2,3=Black, 4,5=Blue, 6,7=Red, 8,9=Gold
      // Draw largest first (background = ring 1 color)
      fill(ringColors[0]); // White
      ellipse(0, 0, targetRadius * 2); // Full size (Ring 1 boundary)

      // Draw ring 3 boundary (Black)
      fill(ringColors[2]);
      ellipse(0, 0, ringRadii[7] * 2); // Radius for ring 8 boundary covers rings 3-8

      // Draw ring 5 boundary (Blue)
      fill(ringColors[4]);
      ellipse(0, 0, ringRadii[5] * 2); // Radius for ring 6 boundary covers rings 5-6

      // Draw ring 7 boundary (Red)
      fill(ringColors[6]);
      ellipse(0, 0, ringRadii[3] * 2); // Radius for ring 4 boundary covers rings 7-8 (mistake here? should be 7/8?)
      // Let's use radius for ring 8 boundary to cover 7 & 8 red rings:
      // fill(ringColors[6]); ellipse(0, 0, ringRadii[7] * 2); // This seems wrong too.

      // Let's rethink drawing from out to in using radii array (ringRadii[9]=10ring, ringRadii[0]=1ring)
      // Background is WHITE (covers 1 & 2 rings)
      fill(ringColors[0]); // White
      ellipse(0, 0, targetRadius * 2); // Ring 1 edge

      // Black section (covers 3 & 4 rings) - Draw up to edge of Ring 4 (radius index 3)
      fill(ringColors[2]); // Black
      ellipse(0, 0, ringRadii[3] * 2);

       // Blue section (covers 5 & 6 rings) - Draw up to edge of Ring 6 (radius index 5)
       fill(ringColors[4]); // Blue
       ellipse(0, 0, ringRadii[5] * 2);

       // Red section (covers 7 & 8 rings) - Draw up to edge of Ring 8 (radius index 7)
       fill(ringColors[6]); // Red
       ellipse(0, 0, ringRadii[7] * 2);

       // Gold section (covers 9 & 10/X rings) - Draw up to edge of Ring 10 (radius index 9)
       fill(ringColors[8]); // Gold
       ellipse(0, 0, ringRadii[9] * 2);

       // Draw thin lines between score zones if desired (optional)
       stroke(150); // Light grey lines
       strokeWeight(1);
       noFill();
       ellipse(0, 0, ringRadii[1] * 2); // Between 2/3 (White/Black)
       ellipse(0, 0, ringRadii[3] * 2); // Between 4/5 (Black/Blue)
       ellipse(0, 0, ringRadii[5] * 2); // Between 6/7 (Blue/Red)
       ellipse(0, 0, ringRadii[7] * 2); // Between 8/9 (Red/Gold)
       ellipse(0, 0, ringRadii[9] * 2); // Inner 10 ring
       if (xRingRadius) {
         ellipse(0, 0, xRingRadius * 2); // X ring
       }

       pop(); // Restore original drawing settings
    }

    // --- Draw Arrow Markers ---
    function drawArrowMarkers() {
       strokeWeight(1.5); // Slightly thicker outline for visibility
       textSize(10); // Small text for arrow numbers

       matchData.forEach((end, endIdx) => {
           end.forEach((arrow, arrowIdx) => {
              if (arrow.displayX !== null && arrow.displayY !== null) {
                  // Marker color based on score
                  let score = arrow.isX ? 'X' : arrow.score;
                  if (score === 'X' || score === 10 || score === 9) fill(255, 255, 0, 200); // Yellowish (Gold) with alpha
                  else if (score === 8 || score === 7) fill(255, 0, 0, 200); // Reddish with alpha
                  else if (score === 6 || score === 5) fill(0, 0, 255, 200); // Bluish with alpha
                  else if (score === 4 || score === 3) fill(0, 0, 0, 200); // Black with alpha
                  else if (score === 2 || score === 1) fill(255, 255, 255, 200); // White with alpha
                  else fill(128, 128, 128, 200); // Grey for Miss (0) with alpha

                  stroke(0); // Black outline
                  ellipse(arrow.displayX, arrow.displayY, 8, 8); // Draw marker circle

                  // Optional: Display arrow number next to marker
                  // noStroke(); fill(0); textAlign(CENTER, CENTER);
                  // text(`${endIdx+1}-${arrowIdx+1}`, arrow.displayX + 8, arrow.displayY);
              }
           });
       });
       noStroke(); // Reset stroke
    }


    // --- Draw Average Group Position ---
    function drawAveragePosition() {
       if (totalArrowsShot > 0) {
           push();
           stroke(0, 255, 0, 150); // Bright green outline
           strokeWeight(2);
           fill(0, 255, 0, 100); // Translucent bright green fill
           ellipse(avgX, avgY, 12, 12); // Draw marker for average position

           // Draw line from center to average position
           stroke(0, 255, 0, 180);
           strokeWeight(1);
           line(targetX, targetY, avgX, avgY);
           pop();
       }
    }


    // --- Display Scoreboard ---
    function displayScoreboard() {
      push(); // Isolate scoreboard drawing styles

      // Define layout parameters below the target
      let scoreX = width / 2;
      let scoreY = targetY + targetRadius + 15; // Start below the target + padding
      let defaultLineHeight = 20;
      let defaultTextSize = 14;
      let currentLineHeight = defaultLineHeight;
      let currentTextSize = defaultTextSize;

      // Dynamically adjust text size if scoreboard overflows available height
      let availableHeight = height - scoreY - 10; // Space from start Y to bottom edge
      let requiredHeight = (numEnds * currentLineHeight) + (currentLineHeight * 2); // Header + Ends + Total line
      if (requiredHeight > availableHeight && requiredHeight > 0) {
         let scaleFactor = availableHeight / requiredHeight;
         currentLineHeight = max(12, currentLineHeight * scaleFactor); // Min line height 12
         currentTextSize = max(9, currentTextSize * scaleFactor); // Min text size 9
      }

      // Set text properties
      textSize(currentTextSize);
      fill(0); // Black text
      textAlign(CENTER, TOP);
      textFont('monospace'); // Monospaced font for alignment

      // Draw Header
      textStyle(BOLD);
      text("End Scores", scoreX, scoreY - currentLineHeight * 1.5); // Position header above first line
      textStyle(NORMAL);

      // Draw score lines for each end
      scoreY += currentLineHeight * 0.5; // Add padding before first score line
      for (let i = 0; i < numEnds; i++) {
         let endData = matchData[i] || []; // Use empty array if end not shot yet
         let endScores = endData.map(arrow => arrow.isX ? 'X' : (arrow.score === 0 ? 'M' : arrow.score)).join(' ');
         let endTotal = endData.reduce((sum, arr) => sum + (arr.isX ? 10 : (typeof arr.score === 'number' ? arr.score : 0)), 0);
         let lineText = `End ${i + 1}: ${endScores.padEnd(arrowsPerEnd * 2)} | Total: ${endTotal}`;
         text(lineText, scoreX, scoreY + (i * currentLineHeight));
      }

       // Draw Total Score Line
       textStyle(BOLD);
       let totalLineY = scoreY + (numEnds * currentLineHeight);
       text(`Match Total: ${totalScore}`, scoreX, totalLineY);
       textStyle(NORMAL);


       pop(); // Restore original drawing settings
    }

    // --- Display End of Match Analysis ---
    function displayEndOfMatchAnalysis() {
       push();
       textAlign(CENTER, BOTTOM);
       textSize(14);
       fill(0, 100, 0); // Dark Green text
       let analysisY = height - 10; // Position at the very bottom
       let analysisText = `Analysis: ${numXs} Xs, ${numTens} Tens. ${biasDescription}`;
       text(analysisText, width / 2, analysisY);
       pop();
    }


    // =================== UTILITY FUNCTIONS ===================

     // --- Save Scorecard ---
    function saveScorecard() {
      let filename = `Scorecard_${new Date().toISOString().slice(0,10)}.txt`;
      let content = `Archery Scorecard\n`;
      content += `Date: ${new Date().toLocaleString()}\n`;
      content += `Format: ${numEnds} ends, ${arrowsPerEnd} arrows per end\n\n`;

      matchData.forEach((end, i) => {
          let endScores = end.map(arrow => arrow.isX ? 'X' : (arrow.score === 0 ? 'M' : arrow.score)).join(' ');
          let endTotal = end.reduce((sum, arr) => sum + (arr.isX ? 10 : (typeof arr.score === 'number' ? arr.score : 0)), 0);
          content += `End ${i + 1}: ${endScores.padEnd(arrowsPerEnd * 2)} | Total: ${endTotal}\n`;
      });

      content += `\nMatch Total: ${totalScore}\n`;
      content += `Statistics: ${numXs} Xs, ${numTens} Tens\n`;
      content += `Group Analysis: ${biasDescription}\n`;
      content += `Avg Position (X,Y relative to center): ${(avgX - targetX).toFixed(1)}, ${(avgY - targetY).toFixed(1)}\n`;

      saveStrings([content], filename, 'txt');
    }


    // Helper to check if p5 draw loop is running
    function isLooping() {
      // p5.js doesn't have a direct public function in instance mode?
      // In global mode it's isLooping(). Let's assume global or check internal property.
      try {
        return _isLooping !== undefined ? _isLooping : true; // Check internal flag or assume looping
      } catch (e) {
        return true; // Fallback if property doesn't exist
      }
    }


// Function to handle touch events specifically for mobile/touch devices
function touchStarted() {
    // Check if the primary touch is on the target face
    if (touches.length > 0) {
        let touchX = touches[0].x;
        let touchY = touches[0].y;
        let d = dist(touchX, touchY, targetX, targetY);

        if (d <= targetRadius) {
            console.log("Target touched at (X,Y):", touchX.toFixed(2), touchY.toFixed(2));

            if (isCorrectionMode) {
                // If in correction mode, use the same handler as mouse clicks
                handleScoreClick(touchX, touchY);
            } else if (!matchOver) {
                // If not in correction mode and match is ongoing, score the arrow
                scoreArrow(touchX, touchY);
            } else {
                console.log("Match is over. No more scoring.");
            }
            return false; // Prevent default browser actions
        } else {
            console.log("Touch outside target registered.");
        }
    }
    return true; // Allow default behavior for touches outside the canvas/target
}

// IMPORTANT: The getScoreFromPosition function below assumes 'ringRadii' is an array
// where ringRadii[0] is the radius of the outermost ring (score 1) and
// ringRadii[9] is the radius of the innermost ring (score 10).
// It also assumes 'xRingRadius' holds the radius for the X ring.
// Double-check your calculateRadii() function matches this assumption!

// Helper function (you might already have similar logic)
// This needs to accurately reflect your scoring rings
function getScoreFromPosition(x, y) {
    let d = dist(x, y, targetX, targetY);

    // Check if ringRadii and xRingRadius exist and are valid
     if (!ringRadii || ringRadii.length !== 10 || typeof xRingRadius === 'undefined') {
        console.error("Scoring radii not properly defined.");
        return 0; // Return 0 or handle error appropriately
    }

    // Check X ring first
    if (d <= xRingRadius) return 'X'; // Special case for X

    // Check rings 10 down to 1
    // Assumes ringRadii[9] is radius for ring 10, ringRadii[0] is radius for ring 1
    for (let i = 9; i >= 0; i--) { // i = 9 means ring 10, i = 0 means ring 1
        if (d <= ringRadii[i]) {
            return i + 1; // Score is index + 1 (e.g., index 9 -> score 10)
        }
    }
    return 0; // Outside scoring area (Miss)
}