// score.js
// Full logic script for WDV scorecard apps (300, 360, etc.)
// Handles tabs, UI, score calculations, localStorage, and session management

(function () {
  const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let scores = [];
  let archerNames = [];
  let currentTab = 0;
  const tabColors = ['#007BFF', '#FF5733', '#28A745', '#FFC300'];

 const TOTAL_ROUNDS = initConfig.totalEnds || (initConfig.round === '360' ? 12 : 10);
  const TOTAL_ARCHERS = initConfig.archerCount || 4;
  const sessionKey = `archeryScores_${initConfig.round}_${initConfig.school}_${getTodayStamp()}`;

  function getTodayStamp() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }

  function initializeDefaultScores() {
    return Array.from({ length: TOTAL_ARCHERS }, () =>
      Array.from({ length: TOTAL_ROUNDS }, () => ({ arrow1: '', arrow2: '', arrow3: '' }))
    );
  }

  function initializeDefaultNames() {
    return Array.from({ length: TOTAL_ARCHERS }, (_, i) => `Archer ${i + 1}`);
  }

  function loadData() {
    const stored = localStorage.getItem(sessionKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      scores = parsed.scores;
      archerNames = parsed.archerNames;
    } else {
      scores = initializeDefaultScores();
      archerNames = initConfig.defaultArcherNames.length === TOTAL_ARCHERS
        ? initConfig.defaultArcherNames
        : initializeDefaultNames();
    }
  }

  function saveData() {
    localStorage.setItem(sessionKey, JSON.stringify({ scores, archerNames }));
  }

  function buildTabs() {
    const tabContainer = document.getElementById('tabs');
    tabContainer.innerHTML = '';
    for (let i = 0; i < TOTAL_ARCHERS; i++) {
      const btn = document.createElement('button');
      btn.className = `tab tab-${(i % 4) + 1} ${i === 0 ? 'active-tab' : ''}`;
      btn.textContent = archerNames[i];
      btn.dataset.archer = i;
      btn.addEventListener('click', () => {
        currentTab = i;
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active-tab'));
        btn.classList.add('active-tab');
        document.querySelectorAll('.tab-content').forEach((el, index) => {
          el.style.display = index === currentTab ? 'block' : 'none';
        });
        updateScores();
      });
      tabContainer.appendChild(btn);
    }
  }

  function buildArcherTables() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    for (let i = 0; i < TOTAL_ARCHERS; i++) {
      const div = document.createElement('div');
      div.className = 'tab-content';
      div.style.display = i === 0 ? 'block' : 'none';
      div.innerHTML = `
        <div class="scores-header" style="background-color: ${tabColors[i % 4]};">
          <h2>Scores for <span id="archer${i + 1}-name-display">${archerNames[i]}</span></h2>
          <button class="edit-name-button" data-index="${i}">Edit Name</button>
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

  function updateScores() {
    const archerScores = scores[currentTab];
    const tbody = document.getElementById(`archer${currentTab + 1}-scores`);
    tbody.innerHTML = '';
    let runningTotal = 0;
    let totalTens = 0;
    let totalXs = 0;

    archerScores.forEach((score, index) => {
      const { roundTotal, roundTens, roundXs, isComplete } = calculateRound(score);
      if (isComplete) runningTotal += roundTotal;
      totalTens += roundTens;
      totalXs += roundXs;

      const avg = (roundTotal / 3).toFixed(1);
      const avgClass = getAvgClass(avg);

      const row = document.createElement('tr');
      row.className = 'score-row';
      row.dataset.index = index;
      row.innerHTML = `
        <td class="r-column">${index + 1}</td>
        <td>${dropdown(currentTab, index, 'arrow1', score.arrow1)}</td>
        <td>${dropdown(currentTab, index, 'arrow2', score.arrow2)}</td>
        <td>${dropdown(currentTab, index, 'arrow3', score.arrow3)}</td>
        <td class="calculated-cell">${roundTens}</td>
        <td class="calculated-cell">${roundXs}</td>
        <td class="calculated-cell">${roundTotal}</td>
        <td class="calculated-cell">${isComplete ? runningTotal : ''}</td>
        <td class="calculated-cell ${avgClass}">${avg}</td>
      `;
      tbody.appendChild(row);
    });

    tbody.innerHTML += `
      <tr class="total-row">
        <td class="r-column"><strong>Total</strong></td>
        <td colspan="3"></td>
        <td class="calculated-cell"><strong>${totalTens}</strong></td>
        <td class="calculated-cell"><strong>${totalXs}</strong></td>
        <td></td>
        <td class="calculated-cell"><strong>${runningTotal}</strong></td>
        <td></td>
      </tr>
    `;

    saveData();
    updateTotals();
    highlightCurrentRow();
  }

  function calculateRound(score) {
    let total = 0, tens = 0, xs = 0, count = 0;
    for (const val of [score.arrow1, score.arrow2, score.arrow3]) {
      if (val === 'X') {
        total += 10; xs++; tens++; count++;
      } else if (val === 'M' || val === '' || val === '--') {
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
      [score.arrow1, score.arrow2, score.arrow3].forEach(val => {
        if (val === 'X') {
          runningTotal += 10; totalXs++; totalTens++;
        } else if (val !== 'M' && val !== '' && val !== '--') {
          const num = parseInt(val);
          runningTotal += num;
          if (num === 10) totalTens++;
        }
      });
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
function updateTotals() {
  const tbody = document.getElementById('total-scores');
  tbody.innerHTML = '';
  const today = getTodayStamp();
  scores.forEach((archerScores, i) => {
    const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
    const avg = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
    const row = document.createElement('tr');
    row.innerHTML = `<td>${archerNames[i]}</td>
                     <td>${totalTens}</td>
                     <td>${totalXs}</td>
                     <td>${runningTotal}</td>
                     <td>${avg}</td>
                     <td>${today}</td>`;
    tbody.appendChild(row);
  });
}

  document.getElementById('copy-totals-button')?.addEventListener('click', () => {
    const today = getTodayStamp();
    const msg = scores.map((archerScores, i) => {
      const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
      const avg = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
      return `${archerNames[i]}\t${totalTens}\t${totalXs}\t${runningTotal}\t${avg}\t${today}`;
    }).join("\r\n");
    navigator.clipboard.writeText(msg).then(() => alert("Copied!"));
  });

  document.getElementById('reset-button')?.addEventListener('click', () => {
    document.getElementById('reset-modal').style.display = 'block';
  });

  document.getElementById('modal-cancel')?.addEventListener('click', () => {
    document.getElementById('reset-modal').style.display = 'none';
  });

  document.getElementById('modal-reset')?.addEventListener('click', () => {
    if (confirm("Reset all scores?")) {
      scores = initializeDefaultScores();
      archerNames = initializeDefaultNames();
      saveData();
      buildTabs();
      buildArcherTables();
      updateScores();
      document.getElementById('reset-modal').style.display = 'none';
    }
  });

 document.getElementById('modal-sample')?.addEventListener('click', () => {
  scores = initializeDefaultScores();
  archerNames = ["Bobby", "Mary", "Sam", "Fred"];

  // Define distinct sample data for each archer
  const sampleData = [
    {
      // Archer 1: Lower scores
      arrow1: ['5','6','5','6'],
      arrow2: ['5','5','6','6'],
      arrow3: ['4','5','5','6']
    },
    {
      // Archer 2: Average scores
      arrow1: ['7','8','7','8'],
      arrow2: ['7','7','8','8'],
      arrow3: ['7','7','8','8']
    },
    {
      // Archer 3: High scores with occasional X's
      arrow1: ['10','X','10','10'],
      arrow2: ['10','10','10','10'],
      arrow3: ['10','10','X','10']
    },
    {
      // Archer 4: Mixed scores
      arrow1: ['9','8','10','X'],
      arrow2: ['10','9','8','7'],
      arrow3: ['8','7','9','10']
    }
  ];

  for (let i = 0; i < TOTAL_ARCHERS; i++) {
    for (let j = 0; j < TOTAL_ROUNDS; j++) {
      const data = sampleData[i % sampleData.length]; // Cycle if archers > sample data objects
      scores[i][j] = {
        arrow1: data.arrow1[j % data.arrow1.length],
        arrow2: data.arrow2[j % data.arrow2.length],
        arrow3: data.arrow3[j % data.arrow3.length],
      };
    }
  }
  saveData();
  buildTabs();
  buildArcherTables();
  updateScores();
  document.getElementById('reset-modal').style.display = 'none';
});


  document.getElementById('sms-button')?.addEventListener('click', () => {
    const today = getTodayStamp();
    const msg = scores.map((archerScores, i) => {
      const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
      const avg = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
      return `${archerNames[i]}: ${totalTens}/${totalXs}/${runningTotal}/${avg}`;
    }).join("\n");
    window.location.href = `sms:14244439811?body=${encodeURIComponent(msg)}`;
  });

  document.getElementById('mail-button')?.addEventListener('click', () => {
    const today = getTodayStamp();
    const msg = scores.map((archerScores, i) => {
      const { runningTotal, totalTens, totalXs } = calculateTotalScores(archerScores);
      const avg = (runningTotal / (TOTAL_ROUNDS * 3)).toFixed(1);
      return `${archerNames[i]}\t${totalTens}\t${totalXs}\t${runningTotal}\t${avg}\t${today}`;
    }).join("\r\n");
    window.location.href = `mailto:davinciarchers@gmail.com?subject=WDV Scores ${today}&body=${encodeURIComponent(msg)}`;
  });

  document.addEventListener('change', e => {
    if (e.target.tagName === 'SELECT') {
      const s = e.target;
      const a = parseInt(s.dataset.archer);
      const r = parseInt(s.dataset.round);
      const k = s.dataset.arrow;
      scores[a][r][k] = s.value;
      updateScores();
    }
  });

  document.addEventListener('click', e => {
    if (e.target.classList.contains('edit-name-button')) {
      const i = parseInt(e.target.dataset.index);
      const newName = prompt('Enter name for archer:', archerNames[i]);
      if (newName) {
        archerNames[i] = newName;
        saveData();
        buildTabs();
        updateScores();
      }
    }
  });
function init() {
  // Set the main title dynamically based on the round type
  document.getElementById('main-title').textContent = `WDV Scorecard - ${initConfig.round} Round`;

  loadData();
  buildTabs();
  buildArcherTables();
  updateScores();
}

document.addEventListener('DOMContentLoaded', init);
})();
