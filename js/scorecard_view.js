/**
 * Reusable Scorecard View Component
 * 
 * This module provides a reusable component for displaying archer scorecards.
 * It can show scorecards in different states: in-progress, completed, verified.
 * 
 * Usage:
 *   const scorecardHTML = ScorecardView.renderScorecard(archerData, roundData, options);
 *   const modalElement = ScorecardView.showScorecardModal(archerData, roundData, options);
 */

const ScorecardView = (() => {
  
  /**
   * Parse score value to number (X=10, M=0, others as-is)
   */
  function parseScoreValue(score) {
    if (score === null || score === '' || score === undefined) return 0;
    const upper = String(score).toUpperCase();
    if (upper === 'X') return 10;
    if (upper === 'M') return 0;
    const num = parseInt(score, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Get CSS class for score value (for coloring cells)
   */
  function getScoreColor(score) {
    if (score === null || score === '' || score === undefined) return '';
    const upper = String(score).toUpperCase();
    if (upper === 'X') return 'score-gold';
    if (upper === '10') return 'score-gold';
    if (upper === '9') return 'score-gold';
    if (upper === '8') return 'score-red';
    if (upper === '7') return 'score-red';
    if (upper === '6') return 'score-blue';
    if (upper === '5') return 'score-blue';
    if (upper === '4') return 'score-black';
    if (upper === '3') return 'score-black';
    if (upper === '2') return 'score-white';
    if (upper === '1') return 'score-white';
    if (upper === 'M') return 'score-white';
    return '';
  }

  /**
   * Render a scorecard table for an archer
   * 
   * @param {Object} archerData - Archer information (id, firstName, lastName, school, level, gender, scores)
   * @param {Object} roundData - Round information (roundType, totalEnds, eventName, division, etc.)
   * @param {Object} options - Display options (showHeader, showFooter, showStatus, compact)
   * @returns {string} HTML string for the scorecard
   */
  function renderScorecard(archerData, roundData, options = {}) {
    const {
      showHeader = true,
      showFooter = true,
      showStatus = true,
      compact = false
    } = options;

    const totalEnds = roundData.totalEnds || 10;
    const scores = archerData.scores || [];
    
    let html = '<div class="scorecard-view">';
    
    // Header with archer info and status
    if (showHeader) {
      const statusBadge = archerData.verified 
        ? '<span class="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-semibold">✓ Verified</span>'
        : archerData.completed
        ? '<span class="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-semibold">Completed</span>'
        : '<span class="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-semibold">In Progress</span>';
      
      html += `
        <div class="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
          <div>
            <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">${archerData.firstName} ${archerData.lastName}</h3>
            <div class="flex gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
              ${archerData.school ? `<span class="font-medium">${archerData.school}</span>` : ''}
              ${archerData.level ? `<span>${archerData.level}</span>` : ''}
              ${archerData.gender ? `<span>${archerData.gender === 'M' ? 'Boys' : 'Girls'}</span>` : ''}
            </div>
            ${roundData.eventName ? `<div class="text-base font-semibold text-gray-700 dark:text-gray-300">${roundData.eventName}</div>` : ''}
            ${roundData.division ? `<div class="text-sm text-gray-600 dark:text-gray-400">${roundData.division}</div>` : ''}
          </div>
          ${showStatus ? statusBadge : ''}
        </div>
      `;
    }
    
    // Scorecard table
    html += `
      <table class="w-full border-collapse text-sm">
        <thead class="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600">
          <tr>
            <th class="px-2 py-2 text-center font-semibold">E</th>
            <th class="px-2 py-2 text-center font-semibold">A1</th>
            <th class="px-2 py-2 text-center font-semibold">A2</th>
            <th class="px-2 py-2 text-center font-semibold">A3</th>
            <th class="px-2 py-2 text-center font-semibold">10s</th>
            <th class="px-2 py-2 text-center font-semibold">Xs</th>
            <th class="px-2 py-2 text-center font-semibold">END</th>
            <th class="px-2 py-2 text-center font-semibold">RUN</th>
            <th class="px-2 py-2 text-center font-semibold">AVG</th>
          </tr>
        </thead>
        <tbody class="text-gray-800 dark:text-gray-200">
    `;
    
    let runningTotal = 0;
    let totalTensOverall = 0;
    let totalXsOverall = 0;
    
    for (let i = 0; i < totalEnds; i++) {
      const endNum = i + 1;
      const endScores = scores[i] || ['', '', ''];
      let endTotal = 0, endTens = 0, endXs = 0;
      let isComplete = endScores.every(s => s !== '' && s !== null && s !== undefined);
      
      endScores.forEach(scoreValue => {
        endTotal += parseScoreValue(scoreValue);
        if (scoreValue === '10') endTens++;
        else if (String(scoreValue).toUpperCase() === 'X') endXs++;
      });
      
      if (isComplete) {
        runningTotal += endTotal;
        totalTensOverall += endTens;
        totalXsOverall += endXs;
      }
      
      // Calculate average for THIS END only
      const avg = isComplete ? (endTotal / 3).toFixed(1) : '';
      let avgClass = '';
      if (isComplete) {
        const avgNum = parseFloat(avg);
        if (avgNum >= 9) avgClass = 'score-gold';
        else if (avgNum >= 7) avgClass = 'score-red';
        else if (avgNum >= 5) avgClass = 'score-blue';
        else if (avgNum >= 3) avgClass = 'score-black';
        else avgClass = 'score-white';
      }
      
      html += `
        <tr class="border-b border-gray-200 dark:border-gray-700">
          <td class="px-2 py-2 text-center">${endNum}</td>
          ${endScores.map(s => `<td class="px-2 py-2 text-center font-bold ${getScoreColor(s)}">${s || ''}</td>`).join('')}
          <td class="px-2 py-2 text-center text-gray-600 dark:text-gray-400">${isComplete ? (endTens + endXs) : ''}</td>
          <td class="px-2 py-2 text-center text-gray-600 dark:text-gray-400">${isComplete ? endXs : ''}</td>
          <td class="px-2 py-2 text-center font-bold">${isComplete ? endTotal : ''}</td>
          <td class="px-2 py-2 text-center font-bold">${isComplete ? runningTotal : ''}</td>
          <td class="px-2 py-2 text-center font-bold ${avgClass}">${avg}</td>
        </tr>
      `;
    }
    
    html += '</tbody>';
    
    // Footer with totals
    if (showFooter) {
      let finalAvg = 0, finalAvgClass = '';
      const completedEnds = scores.filter(s => Array.isArray(s) && s.every(val => val !== '' && val !== null && val !== undefined)).length;
      if (completedEnds > 0) {
        finalAvg = (runningTotal / (completedEnds * 3)).toFixed(1);
        const avgNum = parseFloat(finalAvg);
        if (avgNum >= 9) finalAvgClass = 'score-gold';
        else if (avgNum >= 7) finalAvgClass = 'score-red';
        else if (avgNum >= 5) finalAvgClass = 'score-blue';
        else if (avgNum >= 3) finalAvgClass = 'score-black';
        else finalAvgClass = 'score-white';
      }
      
      html += `
        <tfoot class="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600">
          <tr>
            <td colspan="4" class="px-2 py-3 text-right font-bold text-gray-800 dark:text-white">Round Totals:</td>
            <td class="px-2 py-3 text-center font-bold text-gray-800 dark:text-white">${totalTensOverall + totalXsOverall}</td>
            <td class="px-2 py-3 text-center font-bold text-gray-800 dark:text-white">${totalXsOverall}</td>
            <td class="px-2 py-3 text-center"></td>
            <td class="px-2 py-3 text-center font-bold text-lg text-gray-800 dark:text-white">${runningTotal}</td>
            <td class="px-2 py-3 text-center font-bold ${finalAvgClass}">${finalAvg > 0 ? finalAvg : ''}</td>
          </tr>
        </tfoot>
      `;
    }
    
    html += '</table>';
    html += '</div>';
    
    return html;
  }

  /**
   * Show a scorecard in a modal
   * 
   * @param {Object} archerData - Archer information
   * @param {Object} roundData - Round information
   * @param {Object} options - Display options + modal options (onClose callback)
   * @returns {HTMLElement} The modal element
   */
  function showScorecardModal(archerData, roundData, options = {}) {
    const { onClose, ...scorecardOptions } = options;
    
    // Detect dark mode
    const isDark = document.documentElement.classList.contains('dark');
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('scorecard-view-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'scorecard-view-modal';
      modal.className = 'fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black bg-opacity-50';
      modal.style.display = 'none';
      document.body.appendChild(modal);
    }
    
    const scorecardHTML = renderScorecard(archerData, roundData, scorecardOptions);
    
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto relative p-6">
        <button class="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full text-2xl font-bold transition-colors z-10">&times;</button>
        <div class="mt-8">
          ${scorecardHTML}
        </div>
      </div>
    `;
    
    const closeBtn = modal.querySelector('button');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      if (onClose) onClose();
    };
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        if (onClose) onClose();
      }
    };
    
    modal.style.display = 'flex';
    
    // Scroll to top when modal opens
    setTimeout(() => {
      const content = modal.querySelector('div');
      if (content) {
        content.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }, 10);
    
    return modal;
  }

  // Public API
  return {
    renderScorecard,
    showScorecardModal
  };
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScorecardView;
}

