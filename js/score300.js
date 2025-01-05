
        (function() {
            const TOTAL_ARCHERS = 4;
            const TOTAL_ROUNDS = 10;
            let currentTab = 0;
            let scores = [];
            let archerNames = [];
            const tabColors = ['#007BFF', '#FF5733', '#28A745', '#FFC300'];
            const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const monthAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            // Initialize Data from Local Storage or Defaults
            function initializeData() {
                const storedScores = localStorage.getItem('archeryScores');
                const storedNames = localStorage.getItem('archerNames');
                scores = storedScores ? JSON.parse(storedScores) : initializeDefaultScores();
                archerNames = storedNames ? JSON.parse(storedNames) : initializeDefaultNames();
            }

            function initializeDefaultScores() {
                return Array.from({ length: TOTAL_ARCHERS }, () => 
                    Array.from({ length: TOTAL_ROUNDS }, () => ({
                        arrow1: 'M',
                        arrow2: 'M',
                        arrow3: 'M'
                    }))
                );
            }

            function initializeDefaultNames() {
                return Array.from({ length: TOTAL_ARCHERS }, (_, i) => `Archer ${i + 1}`);
            }

            // Save Data to Local Storage
            function saveData() {
                localStorage.setItem('archeryScores', JSON.stringify(scores));
                localStorage.setItem('archerNames', JSON.stringify(archerNames));
            }

            // Generate Tabs Content
            function generateTabContent() {
                const container = document.getElementById('tabs-container');
                for (let i = 0; i < TOTAL_ARCHERS; i++) {
                    const tabContent = document.createElement("div");
                    tabContent.classList.add("tab-content");
                    tabContent.style.display = i === 0 ? 'block' : 'none';
                    tabContent.innerHTML = `
                        <div class="scores-header" style="background-color: ${tabColors[i]};">
                            <h2>Scores for <span id="archer${i + 1}-name-display">${archerNames[i]}</span></h2>
                            <button class="edit-name-button">Edit Name</button>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th class="round-header r-column">R</th>
                                    <th>Arrow 1</th>
                                    <th>Arrow 2</th>
                                    <th>Arrow 3</th>
                                    <th>10s</th>
                                    <th>Xs</th>
                                    <th>RND</th>
                                    <th>RUN</th>
                                    <th>AVG</th>
                                </tr>
                            </thead>
                            <tbody id="archer${i + 1}-scores"></tbody>
                        </table>
                    `;
                    container.appendChild(tabContent);
                }
            }

            // Function to Get Formatted Date with 2-Digit Day
            function getFormattedDate() {
                const today = new Date();
                const day = dayAbbr[today.getDay()];
                const month = monthAbbr[today.getMonth()];
                const date = today.getDate().toString().padStart(2, '0'); // Ensures 2-digit day
                const year = today.getFullYear();
                return `${day} ${month} ${date} ${year}`;
            }

            // Function to Update Titles
            function updateTitles() {
                const formattedDate = getFormattedDate();
                document.getElementById('main-title').innerText = `300 Round - ${formattedDate}`;
                document.title = `300 Round - ${formattedDate}`; // Updates browser tab title
            }

            // Function to Show Selected Tab
            function showTab(index) {
                document.querySelectorAll('.tab-content').forEach((tab, i) => {
                    tab.style.display = i === index ? 'block' : 'none';
                });
                document.querySelectorAll('.tab').forEach((button, i) => {
                    button.classList.toggle('active-tab', i === index);
                });
                currentTab = index;
                updateScores();

                // Update the background color of the scores header
                const scoresHeaderElement = document.querySelector(`#tabs-container .tab-content:nth-child(${index + 1}) .scores-header`);
                if (scoresHeaderElement) {
                    scoresHeaderElement.style.backgroundColor = tabColors[index];
                }
            }

            // Update Archer Scores Table
            function updateScores() {
                const archerScores = scores[currentTab];
                const tbody = document.getElementById(`archer${currentTab + 1}-scores`);
                tbody.innerHTML = '';
                let runningTotal = 0;
                let totalTens = 0;
                let totalXs = 0;

                archerScores.forEach((score, index) => {
                    const { roundTotal, roundTens, roundXs } = calculateRoundScores(score);
                    runningTotal += roundTotal;
                    totalTens += roundTens;
                    totalXs += roundXs;

                    const avg = (roundTotal / 3).toFixed(1);
                    const avgClass = getAvgClass(avg);

                    tbody.innerHTML += `
                        <tr>
                            <td class="r-column">${index + 1}</td>
                            <td>${createArrowDropdown(currentTab, index, 'arrow1', score.arrow1)}</td>
                            <td>${createArrowDropdown(currentTab, index, 'arrow2', score.arrow2)}</td>
                            <td>${createArrowDropdown(currentTab, index, 'arrow3', score.arrow3)}</td>
                            <td class="calculated-cell">${roundTens}</td>
                            <td class="calculated-cell">${roundXs}</td>
                            <td class="calculated-cell">${roundTotal}</td>
                            <td class="calculated-cell">${runningTotal}</td>
                            <td class="calculated-cell ${avgClass}">${avg}</td>
                        </tr>
                    `;
                });

                // Add Totals Row with white background
                tbody.innerHTML += `
                    <tr class="total-row">
                        <td class="r-column"><strong>Total</strong></td>
                        <td colspan="3"></td>
                        <td class="calculated-cell"><strong>${totalTens}</strong></td>
                        <td class="calculated-cell"><strong>${totalXs}</strong></td>
                        <td class="calculated-cell"></td>
                        <td class="calculated-cell"><strong>${runningTotal}</strong></td>
                        <td class="calculated-cell"></td>
                    </tr>
                `;

                saveData();
                updateTotals();
            }

            // Calculate Scores for a Round
            function calculateRoundScores(score) {
                let roundTotal = 0;
                let roundTens = 0;
                let roundXs = 0;
                const arrows = [score.arrow1, score.arrow2, score.arrow3];

                arrows.forEach(arrow => {
                    if (arrow === 'X') {
                        roundTotal += 10;
                        roundXs++;
                        roundTens++;
                    } else if (arrow !== 'M') {
                        const value = parseInt(arrow, 10);
                        roundTotal += value;
                        if (value === 10) roundTens++;
                    }
                });

                return { roundTotal, roundTens, roundXs };
            }

            // Update All Archers Totals
            function updateTotals() {
                const totalScoresTbody = document.getElementById('total-scores');
                const today = new Date();
                const formattedDate = `${dayAbbr[today.getDay()]} ${monthAbbr[today.getMonth()]} ${today.getDate().toString().padStart(2, '0')} ${today.getFullYear()}`;
                totalScoresTbody.innerHTML = scores.map((archerScores, i) => {
                    const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
                    const avgArrow = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
                    const avgClass = getAvgClass(avgArrow);
                    return `
                        <tr>
                            <td>${archerNames[i]}</td>
                            <td>${totalTens}</td>
                            <td>${totalXs}</td>
                            <td>${runningTotal}</td>
                            <td class="calculated-cell ${avgClass}">${avgArrow}</td>
                            <td>${formattedDate}</td> <!-- Added Date Cell -->
                        </tr>
                    `;
                }).join('');
            }

            // Calculate Total Scores for an Archer
            function calculateTotalScores(archerScores) {
                let runningTotal = 0;
                let totalTens = 0;
                let totalXs = 0;

                archerScores.forEach(score => {
                    const arrows = [score.arrow1, score.arrow2, score.arrow3];
                    arrows.forEach(arrow => {
                        if (arrow === 'X') {
                            runningTotal += 10;
                            totalXs++;
                            totalTens++;
                        } else if (arrow !== 'M') {
                            const value = parseInt(arrow, 10);
                            runningTotal += value;
                            if (value === 10) totalTens++;
                        }
                    });
                });

                return { runningTotal, totalTens, totalXs };
            }

            // Create Dropdown for Arrow Scores
            function createArrowDropdown(archerIndex, roundIndex, arrowKey, selectedValue) {
                const options = ['M', ...Array.from({ length: 10 }, (_, i) => i + 1), 'X'];
                return `
                    <select data-archer="${archerIndex}" data-round="${roundIndex}" data-arrow="${arrowKey}">
                        ${options.map(option => `
                            <option value="${option}" ${option.toString() === selectedValue.toString() ? 'selected' : ''}>${option}</option>
                        `).join('')}
                    </select>
                `;
            }

            // Function to Determine Avg Cell Class Based on Value
            function getAvgClass(avg) {
                const value = parseFloat(avg);
                if (value >= 1 && value < 3) {
                    return 'avg-1-2';
                } else if (value >= 3 && value < 5) {
                    return 'avg-3-4';
                } else if (value >= 5 && value < 7) {
                    return 'avg-5-6';
                } else if (value >= 7 && value < 9) {
                    return 'avg-7-8';
                } else if (value >= 9) {
                    return 'avg-9-up';
                } else {
                    return ''; // No class if outside expected range
                }
            }

            // Handle Arrow Score Change
            function handleArrowChange(event) {
                const select = event.target;
                const archerIndex = parseInt(select.dataset.archer, 10);
                const roundIndex = parseInt(select.dataset.round, 10);
                const arrowKey = select.dataset.arrow;
                const value = select.value;

                scores[archerIndex][roundIndex][arrowKey] = value; // Store as string
                updateScores();
            }

            // Handle "Edit Name" Button Click
            function handleEditNameClick(index) {
                let archerName = prompt(`Enter Archer First Name and Last Initial for ${archerNames[index]} (e.g., John D.)`, archerNames[index]);
                if (archerName && archerName.trim() !== "") {
                    archerName = archerName.trim();
                    archerNames[index] = archerName;
                    saveData();
                    updateTabs();
                } else if (archerName === null) {
                    // User clicked cancel, do nothing
                } else {
                    // If user entered invalid name, alert and keep existing name
                    alert("Invalid name entered. Keeping existing name.");
                }
            }

            // Show RESET Modal
            function showResetModal() {
                const modal = document.getElementById('reset-modal');
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            }

            // Hide RESET Modal
            function hideResetModal() {
                const modal = document.getElementById('reset-modal');
                modal.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restore background scrolling
            }

            // Reset Scores Functionality with Modal
            function resetScores() {
                showResetModal();
            }

            // Handle Modal Button Clicks
            function handleModalButtonClick(action) {
                if (action === 'cancel') {
                    hideResetModal();
                } else if (action === 'reset') {
                    if (confirm("Are you sure you want to reset all scores? This will clear all entered data.")) {
                        scores = initializeDefaultScores();
                        archerNames = initializeDefaultNames();
                        saveData();
                        updateScores();
                        hideResetModal();
                    }
                } else if (action === 'sample') {
                    generateSampleData();
                    hideResetModal();
                }
            }

            // Clear Local Storage and Reload
            function clearLocalStorage() {
                const confirmClear = confirm("Are you sure you want to delete all local data? This cannot be undone.");
                if (confirmClear) {
                    localStorage.clear();
                    window.location.reload();
                }
            }

            // Generate Sample Data
            function generateSampleData() {
                scores = [
                    [
                        { arrow1: '10', arrow2: '9', arrow3: '8' },
                        { arrow1: 'X', arrow2: '10', arrow3: '9' },
                        { arrow1: '8', arrow2: '7', arrow3: 'M' },
                        { arrow1: '7', arrow2: '8', arrow3: '9' },
                        { arrow1: 'X', arrow2: '9', arrow3: '10' },
                        { arrow1: '8', arrow2: 'M', arrow3: '7' },
                        { arrow1: '9', arrow2: '10', arrow3: 'X' },
                        { arrow1: 'M', arrow2: '8', arrow3: '7' },
                        { arrow1: '10', arrow2: '9', arrow3: '8' },
                        { arrow1: '7', arrow2: 'X', arrow3: '9' }
                    ],
                    [
                        { arrow1: '9', arrow2: '9', arrow3: '10' },
                        { arrow1: '8', arrow2: 'X', arrow3: '8' },
                        { arrow1: '10', arrow2: 'M', arrow3: '9' },
                        { arrow1: 'M', arrow2: '8', arrow3: '7' },
                        { arrow1: '9', arrow2: '10', arrow3: '8' },
                        { arrow1: 'X', arrow2: '9', arrow3: '7' },
                        { arrow1: '8', arrow2: '7', arrow3: '9' },
                        { arrow1: '10', arrow2: '8', arrow3: 'M' },
                        { arrow1: '7', arrow2: '9', arrow3: 'X' },
                        { arrow1: '8', arrow2: 'M', arrow3: '9' }
                    ],
                    [
                        { arrow1: '8', arrow2: '7', arrow3: '9' },
                        { arrow1: '10', arrow2: '8', arrow3: 'X' },
                        { arrow1: '9', arrow2: 'M', arrow3: '8' },
                        { arrow1: '7', arrow2: '9', arrow3: '10' },
                        { arrow1: 'X', arrow2: '8', arrow3: '7' },
                        { arrow1: '8', arrow2: 'M', arrow3: '9' },
                        { arrow1: '9', arrow2: '10', arrow3: '8' },
                        { arrow1: 'M', arrow2: '7', arrow3: 'X' },
                        { arrow1: '8', arrow2: '9', arrow3: '7' },
                        { arrow1: '10', arrow2: '8', arrow3: '9' }
                    ],
                    [
                        { arrow1: '7', arrow2: '8', arrow3: '9' },
                        { arrow1: '9', arrow2: '7', arrow3: 'X' },
                        { arrow1: '8', arrow2: 'M', arrow3: '10' },
                        { arrow1: '10', arrow2: '9', arrow3: '8' },
                        { arrow1: 'X', arrow2: '7', arrow3: '9' },
                        { arrow1: '7', arrow2: 'M', arrow3: '8' },
                        { arrow1: '8', arrow2: '9', arrow3: '10' },
                        { arrow1: 'M', arrow2: 'X', arrow3: '7' },
                        { arrow1: '9', arrow2: '8', arrow3: '10' },
                        { arrow1: '7', arrow2: '9', arrow3: '8' }
                    ]
                ];
                archerNames = ["Bobby", "Mary", "Sam", "Fred"];
                saveData();
                updateScores();
                updateTabs();
            }

            // Update Archer Names in Tabs and Displays
            function updateTabs() {
                document.querySelectorAll('.tab').forEach((tab, i) => {
                    tab.innerText = archerNames[i];
                });
                document.querySelectorAll('.scores-header').forEach((header, i) => {
                    const nameDisplay = header.querySelector(`#archer${i + 1}-name-display`);
                    if (nameDisplay) {
                        nameDisplay.innerText = archerNames[i];
                    }
                });
                updateTotals();
            }

            // Copy Totals to Clipboard
            function copyTotals() {
                const today = new Date();
                const formattedDate = `${dayAbbr[today.getDay()]} ${monthAbbr[today.getMonth()]} ${today.getDate().toString().padStart(2, '0')} ${today.getFullYear()}`;
                const tsvData = scores.map((archerScores, i) => {
                    const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
                    const avgArrow = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
                    return `${archerNames[i]}\t${totalTens}\t${totalXs}\t${runningTotal}\t${avgArrow}\t${formattedDate}`;
                }).join("\r\n");

                navigator.clipboard.writeText(tsvData)
                    .then(() => { 
                        if (confirm("Totals copied to clipboard as tab-separated values!\n" +
                                    "Click 'OK' to open the Google Sheet, or 'Cancel' to stay here.")) 
                        {
                            window.open("https://docs.google.com/spreadsheets/d/1ZWtlBGWJdeb9q9WGwTuyfh9A3HIFLbnobk4QqPjz-pk/edit?usp=sharing", "_blank");
                        }
                    })
                    .catch(err => {
                        alert("Failed to copy totals. Please try again.");
                        console.error('Error copying to clipboard:', err);
                    });
            }

            // Event Listeners
            function addEventListeners() {
                // Tab Clicks
                document.querySelectorAll('.tab').forEach(button => {
                    button.addEventListener('click', () => {
                        const index = parseInt(button.dataset.archer, 10);
                        showTab(index);
                    });
                });

                // Delegate Arrow Dropdown Changes
                document.getElementById('tabs-container').addEventListener('change', (event) => {
                    if (event.target.tagName === 'SELECT') {
                        handleArrowChange(event);
                    }
                });

                // Handle "Edit Name" Button Clicks
                document.getElementById('tabs-container').addEventListener('click', (event) => {
                    if (event.target.classList.contains('edit-name-button')) {
                        const tabContent = event.target.closest('.tab-content');
                        const index = Array.from(document.querySelectorAll('.tab-content')).indexOf(tabContent);
                        handleEditNameClick(index);
                    }
                });

                // RESET Button Click
                document.getElementById('reset-button').addEventListener('click', resetScores);

                // COPY SCORES Button Click
                document.getElementById('copy-totals-button').addEventListener('click', copyTotals);

                // Modal Buttons Click
                document.getElementById('modal-cancel').addEventListener('click', () => handleModalButtonClick('cancel'));
                document.getElementById('modal-reset').addEventListener('click', () => handleModalButtonClick('reset'));
                document.getElementById('modal-sample').addEventListener('click', () => handleModalButtonClick('sample'));

                // Close Modal when clicking outside the modal content
                window.addEventListener('click', (event) => {
                    const modal = document.getElementById('reset-modal');
                    if (event.target === modal) {
                        hideResetModal();
                    }
                });
            }

            // Initialize the App
            function init() {
                initializeData();
                generateTabContent();
                updateTabs();
                updateTitles(); // Update titles with the current date
                showTab(currentTab);
                addEventListeners();
            }

            // Run the App
            init();
// Function to format scores for SMS to match "Copy" format
function getFormattedScoresForSMS() {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const smsData = scores.map((archerScores, i) => {
        const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
        const avgArrow = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
        // Tab-separated format for SMS
        return `${archerNames[i]}\t${totalTens}\t${totalXs}\t${runningTotal}\t${avgArrow}\t${formattedDate}`;
    }).join("\n");

    return smsData;
}

// Function to format scores for Email to match "Copy" format
function getFormattedScoresForEmail() {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const emailData = scores.map((archerScores, i) => {
        const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
        const avgArrow = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
        // Tab-separated format for easier Google Sheets paste
        return `${archerNames[i]}\t${totalTens}\t${totalXs}\t${runningTotal}\t${avgArrow}\t${formattedDate}`;
    }).join("\r\n");

    return { 
        subject: `Scores for ${archerNames.join(', ')}`, 
        body: emailData 
    };
}

// Event listeners for SMS and Mail buttons
document.getElementById('sms-button').addEventListener('click', () => {
    const scoresMessage = getFormattedScoresForSMS();
    const phoneNumber = "14244439811";
    const smsLink = `sms:${phoneNumber}?body=${encodeURIComponent(scoresMessage)}`;
    window.location.href = smsLink;
});

document.getElementById('mail-button').addEventListener('click', () => {
    const emailContent = getFormattedScoresForEmail();
    const emailAddress = "davinciarchers@gmail.com";
    const mailtoLink = `mailto:${emailAddress}?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`;
    window.location.href = mailtoLink;
});

        })();
    