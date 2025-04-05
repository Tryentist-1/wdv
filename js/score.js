(function () {
  // Data arrays including new fields
  let scores = [];
  let archerNames = [];
  let archerSchools = [];
  let archerGenders = [];
  let archerTeams = [];
  let currentTab = 0;
  const tabColors = ['#007BFF', '#FF5733', '#28A745', '#FFC300'];
  // Use totalEnds if provided, otherwise default based on round type
  const TOTAL_ROUNDS = initConfig.totalEnds || (initConfig.round === '360' ? 12 : 10);
  const TOTAL_ARCHERS = initConfig.archerCount || 4;
  const sessionKey = `archeryScores_${initConfig.round}_${initConfig.school}_${getTodayStamp()}`;

  // Arrays for friendly date formatting
  const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function getTodayStamp() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }

  function getFriendlyDate() {
    const date = new Date();
    return `${dayAbbr[date.getDay()]} ${monthAbbr[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
  }

  function initializeDefaultScores() {
    return Array.from({ length: TOTAL_ARCHERS }, () =>
      Array.from({ length: TOTAL_ROUNDS }, () => ({ arrow1: '', arrow2: '', arrow3: '' }))
    );
  }

  function loadData() {
    const stored = localStorage.getItem(sessionKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      scores = parsed.scores;
      archerNames = parsed.archerNames;
      archerSchools = parsed.archerSchools;
      archerGenders = parsed.archerGenders;
      archerTeams = parsed.archerTeams;
      // Ensure arrays have proper length
      if (!Array.isArray(archerNames) || archerNames.length < TOTAL_ARCHERS) {
        archerNames = new Array(TOTAL_ARCHERS).fill("Archer");
      }
      if (!Array.isArray(archerSchools) || archerSchools.length < TOTAL_ARCHERS) {
        archerSchools = new Array(TOTAL_ARCHERS).fill("");
      }
      if (!Array.isArray(archerGenders) || archerGenders.length < TOTAL_ARCHERS) {
        archerGenders = new Array(TOTAL_ARCHERS).fill("M");
      }
      if (!Array.isArray(archerTeams) || archerTeams.length < TOTAL_ARCHERS) {
        archerTeams = new Array(TOTAL_ARCHERS).fill("JV");
      }
    } else {
      scores = initializeDefaultScores();
      archerNames = (initConfig.defaultArcherNames.length === TOTAL_ARCHERS)
        ? initConfig.defaultArcherNames.slice()
        : new Array(TOTAL_ARCHERS).fill("Archer");
      archerSchools = new Array(TOTAL_ARCHERS).fill("");
      archerGenders = new Array(TOTAL_ARCHERS).fill("M");
      archerTeams = new Array(TOTAL_ARCHERS).fill("JV");
    }
  }

  function saveData() {
    localStorage.setItem(sessionKey, JSON.stringify({
      scores, archerNames, archerSchools, archerGenders, archerTeams
    }));
  }

  // Build tab buttons that display only the archer's name.
  function buildTabs() {
    const tabContainer = document.getElementById('tabs');
    tabContainer.innerHTML = '';
    for (let i = 0; i < TOTAL_ARCHERS; i++) {
      const btn = document.createElement('button');
      btn.className = `tab tab-${(i % 4) + 1}`;
      btn.textContent = archerNames[i] ? archerNames[i] : '';
      btn.dataset.archer = i;
      btn.addEventListener('click', () => {
        currentTab = i;
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active-tab'));
        btn.classList.add('active-tab');
        document.querySelectorAll('.tab-content').forEach((el, index) => {
          el.style.display = (index === currentTab) ? 'block' : 'none';
        });
        updateScores();
      });
      tabContainer.appendChild(btn);
    }
  }

  // Build the score table for each archer.
  function buildArcherTables() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    for (let i = 0; i < TOTAL_ARCHERS; i++) {
      const div = document.createElement('div');
      div.className = 'tab-content';
      div.style.display = (i === 0) ? 'block' : 'none';
      div.innerHTML = `
        <table>
          <thead>
            <tr>
              <th class="round-header r-column">R</th>
              <th>Arrow 1</th>
              <th>Arrow 2</th>
              <th>Arrow 3</th>
              <th>10s</th>
              <th>Xs</th>
              <th>END</th>
              <th>TOT</th>
              <th>AVG</th>
            </tr>
          </thead>
          <tbody id="archer${i + 1}-scores"></tbody>
        </table>
      `;
      container.appendChild(div);
    }
  }

  // Update scores for current archer and update overall totals table.
  function updateScores() {
    const archerScores = scores[currentTab];
    const tbody = document.getElementById(`archer${currentTab + 1}-scores`);
    tbody.innerHTML = '';
    let runningTotal = 0, totalTens = 0, totalXs = 0;

    archerScores.forEach((score, index) => {
      const { roundTotal, roundTens, roundXs, isComplete } = calculateRound(score);
      if (isComplete) runningTotal += roundTotal;
      totalTens += roundTens;
      totalXs += roundXs;
      const displayRoundTens = isComplete ? roundTens : '';
      const displayRoundXs = isComplete ? roundXs : '';
      const displayRoundTotal = isComplete ? roundTotal : '';
      const displayAvg = isComplete ? (roundTotal / 3).toFixed(1) : '';
      const avgClass = isComplete ? getAvgClass(displayAvg) : '';

      const row = document.createElement('tr');
      row.className = 'score-row';
      row.dataset.index = index;
      row.innerHTML = `
        <td class="r-column">${index + 1}</td>
        <td>${dropdown(currentTab, index, 'arrow1', score.arrow1)}</td>
        <td>${dropdown(currentTab, index, 'arrow2', score.arrow2)}</td>
        <td>${dropdown(currentTab, index, 'arrow3', score.arrow3)}</td>
        <td class="calculated-cell">${displayRoundTens}</td>
        <td class="calculated-cell">${displayRoundXs}</td>
        <td class="calculated-cell">${displayRoundTotal}</td>
        <td class="calculated-cell">${isComplete ? runningTotal : ''}</td>
        <td class="calculated-cell ${avgClass}">${displayAvg}</td>
      `;
      tbody.appendChild(row);
    });

    // Update overall totals table with headers: Archer, School, Gender, Team, 10s, Xs, Score, Avg, Date
    const totalsTbody = document.getElementById('total-scores');
    totalsTbody.innerHTML = '';
    const today = getFriendlyDate();
    scores.forEach((archerScores, i) => {
      const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
      const avg = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
      const row = document.createElement('tr');
      row.innerHTML = `<td>${archerNames[i]}</td>
                       <td>${archerSchools[i]}</td>
                       <td>${archerGenders[i]}</td>
                       <td>${archerTeams[i]}</td>
                       <td>${totalTens}</td>
                       <td>${totalXs}</td>
                       <td>${runningTotal}</td>
                       <td>${avg}</td>
                       <td>${today}</td>`;
      totalsTbody.appendChild(row);
    });

    saveData();
    highlightCurrentRow();
  }

  function calculateRound(score) {
    let total = 0, tens = 0, xs = 0, count = 0;
    for (const val of [score.arrow1, score.arrow2, score.arrow3]) {
      if (val === 'X') {
        total += 10;
        xs++;
        tens++;
        count++;
      } else if (val === 'M') {
        total += 0;
        count++;
      } else if (val === '' || val === '--') {
        total += 0;
      } else {
        const num = parseInt(val);
        if (!isNaN(num)) {
          total += num;
          if (num === 10) tens++;
          count++;
        }
      }
    }
    return { roundTotal: total, roundTens: tens, roundXs: xs, isComplete: count === 3 };
  }

  function dropdown(archer, round, arrow, selectedValue) {
    const options = ['--', 'M', ...Array.from({ length: 10 }, (_, i) => (i + 1).toString()), 'X'];
    return `<select data-archer="${archer}" data-round="${round}" data-arrow="${arrow}">
      ${options.map(val => `<option value="${val}" ${val === selectedValue ? 'selected' : ''}>${val}</option>`).join('')}
    </select>`;
  }

  function getAvgClass(avg) {
    const v = parseFloat(avg);
    if (v >= 1 && v < 3) return 'avg-1-2';
    if (v >= 3 && v < 5) return 'avg-3-4';
    if (v >= 5 && v < 7) return 'avg-5-6';
    if (v >= 7 && v < 9) return 'avg-7-8';
    if (v >= 9) return 'avg-9-up';
    return '';
  }

  function calculateTotalScores(archerScores) {
    let runningTotal = 0, totalTens = 0, totalXs = 0;
    archerScores.forEach(score => {
      // Only count the row if all three arrows are entered
      if (score.arrow1 !== '' && score.arrow2 !== '' && score.arrow3 !== '') {
        [score.arrow1, score.arrow2, score.arrow3].forEach(val => {
          if (val === 'X') {
            runningTotal += 10;
            totalXs++;
            totalTens++;
          } else if (val !== 'M' && val !== '' && val !== '--') {
            const num = parseInt(val);
            runningTotal += num;
            if (num === 10) totalTens++;
          }
        });
      }
    });
    return { runningTotal, totalTens, totalXs };
  }

  function highlightCurrentRow() {
    document.querySelectorAll('.score-row').forEach(row => row.classList.remove('highlight'));
    const archerScores = scores[currentTab];
    for (let i = 0; i < archerScores.length; i++) {
      const score = archerScores[i];
      if (score.arrow1 === '' || score.arrow2 === '' || score.arrow3 === '') {
        const row = document.querySelector(`.score-row[data-index="${i}"]`);
        if (row) row.classList.add('highlight');
        break;
      }
    }
  }

  // Listen for changes on dropdowns and update scores.
  document.addEventListener('change', e => {
    if (e.target.tagName === 'SELECT') {
      const s = e.target;
      const a = parseInt(s.dataset.archer);
      const r = parseInt(s.dataset.round);
      const k = s.dataset.arrow;
      if (isNaN(r)) return;
      if (!scores[a] || !scores[a][r]) return;
      scores[a][r][k] = s.value;
      updateScores();
    }
  });

  // Export functions
  document.getElementById('copy-totals-button')?.addEventListener('click', () => {
    const today = getFriendlyDate();
    const msg = scores.map((archerScores, i) => {
      const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
      const avg = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
      return `${archerNames[i]}\t${archerSchools[i]}\t${archerGenders[i]}\t${archerTeams[i]}\t${totalTens}\t${totalXs}\t${runningTotal}\t${avg}\t${today}`;
    }).join("\r\n");
    navigator.clipboard.writeText(msg).then(() => alert("Copied!"));
  });

  document.getElementById('sms-button')?.addEventListener('click', () => {
    const today = getFriendlyDate();
    const msg = scores.map((archerScores, i) => {
      const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
      const avg = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
      return `${archerNames[i]}, ${archerSchools[i]}, ${archerGenders[i]}, ${archerTeams[i]}: ${totalTens}/${totalXs}/${runningTotal}/${avg}/${today}`;
    }).join("\n");
    window.location.href = `sms:14244439811?body=${encodeURIComponent(msg)}`;
  });

  document.getElementById('mail-button')?.addEventListener('click', () => {
    const today = getFriendlyDate();
    const msg = scores.map((archerScores, i) => {
      const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
      const avg = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
      return `${archerNames[i]}\t${archerSchools[i]}\t${archerGenders[i]}\t${archerTeams[i]}\t${totalTens}\t${totalXs}\t${runningTotal}\t${avg}\t${today}`;
    }).join("\r\n");
    window.location.href = `mailto:davinciarchers@gmail.com?subject=WDV Scores ${today}&body=${encodeURIComponent(msg)}`;
  });

  // Setup Modal for entering archer info
  function showSetupModal() {
    let modalHtml = `
      <div class="modal" id="setup-modal" style="display:block;">
        <div class="modal-content">
          <h2>Enter Archer Information</h2>
          <form id="setup-form">
    `;
    for (let i = 0; i < TOTAL_ARCHERS; i++) {
      modalHtml += `
        <fieldset style="margin-bottom: 1em;">
          <legend>Archer ${i + 1}</legend>
          <label for="archer-name-${i}">Name:</label>
          <input type="text" id="archer-name-${i}" placeholder="Name" required>
          <br>
          <div class="row">
            <div class="small-field">
              <label for="archer-school-${i}">School:</label>
              <input type="text" id="archer-school-${i}" placeholder="SCH" maxlength="3">
            </div>
            <div class="row-field">
              <label for="archer-gender-${i}">Gender:</label>
              <select id="archer-gender-${i}">
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div class="row-field">
              <label for="archer-team-${i}">Team:</label>
              <select id="archer-team-${i}">
                <option value="JV">JV</option>
                <option value="V">V</option>
              </select>
            </div>
          </div>
        </fieldset>
      `;
    }
    modalHtml += `
            <div class="modal-buttons">
              <button type="submit" id="setup-save">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('setup-form').addEventListener('submit', function (e) {
      e.preventDefault();
      for (let i = 0; i < TOTAL_ARCHERS; i++) {
        const name = document.getElementById(`archer-name-${i}`).value.trim();
        const school = document.getElementById(`archer-school-${i}`).value.trim();
        const gender = document.getElementById(`archer-gender-${i}`).value;
        const teamElement = document.getElementById(`archer-team-${i}`);
        const team = teamElement ? teamElement.value : "JV";
        archerNames[i] = name;
        archerSchools[i] = school;
        archerGenders[i] = gender;
        archerTeams[i] = team;
      }
      document.getElementById('setup-modal').remove();
      saveData();
      buildTabs();
      updateScores();
    });
  }

  // Reset Modal Event Listeners
  document.getElementById('reset-button')?.addEventListener('click', () => {
    document.getElementById('reset-modal').style.display = 'block';
  });

  document.getElementById('modal-reset')?.addEventListener('click', () => {
    if (confirm("Reset all scores and re-enter archer info?")) {
      scores = initializeDefaultScores();
      archerNames = new Array(TOTAL_ARCHERS).fill("Archer");
      archerSchools = new Array(TOTAL_ARCHERS).fill("WDV");
      archerGenders = new Array(TOTAL_ARCHERS).fill("M");
      archerTeams = new Array(TOTAL_ARCHERS).fill("JV");
      saveData();
      buildTabs();
      buildArcherTables();
      updateScores();
      document.getElementById('reset-modal').style.display = 'none';
      showSetupModal();
    }
  });

  document.getElementById('modal-cancel')?.addEventListener('click', () => {
    document.getElementById('reset-modal').style.display = 'none';
  });

  document.getElementById('modal-sample')?.addEventListener('click', () => {
    scores = initializeDefaultScores();
    archerNames = ["Bobby", "Mary", "Sam", "Fred"];
    archerSchools = ["ABC", "DEF", "GHI", "JKL"];
    archerGenders = ["M", "F", "M", "F"];
    archerTeams = ["JV", "V", "JV", "V"];
    for (let i = 0; i < TOTAL_ARCHERS; i++) {
      for (let j = 0; j < TOTAL_ROUNDS; j++) {
        scores[i][j] = {
          arrow1: ['8', '9', '10', 'X'][j % 4],
          arrow2: ['7', '10', 'M', 'X'][j % 4],
          arrow3: ['9', 'X', '8', '10'][j % 4],
        };
      }
    }
    saveData();
    buildTabs();
    buildArcherTables();
    updateScores();
    document.getElementById('reset-modal').style.display = 'none';
  });

  function init() {
    loadData();
    // Show setup modal if all archer names are still default.
    const needSetup = archerNames.every(name => /^Archer\s*\d*$/.test(name));
    if (needSetup) {
      showSetupModal();
    }
    buildTabs();
    buildArcherTables();
    updateScores();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
