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
   * Get CSS class for score value (for coloring cells) - MATCHES test-components.html
   */
  function getScoreColor(score) {
    if (score === null || score === '' || score === undefined) return '';
    const upper = String(score).toUpperCase();
    if (upper === 'X') return 'bg-score-gold text-black';
    if (upper === '10') return 'bg-score-gold text-black';
    if (upper === '9') return 'bg-score-gold text-black';
    if (upper === '8') return 'bg-score-red text-white';
    if (upper === '7') return 'bg-score-red text-white';
    if (upper === '6') return 'bg-score-blue text-white';
    if (upper === '5') return 'bg-score-blue text-white';
    if (upper === '4') return 'bg-score-black text-white';
    if (upper === '3') return 'bg-score-black text-white';
    if (upper === '2') return 'bg-score-white text-black border border-gray-300';
    if (upper === '1') return 'bg-score-white text-black border border-gray-300';
    if (upper === 'M') return 'bg-white text-gray-500 border border-gray-300';
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
    
    // Header with archer info and status - MATCHES test-components.html
    if (showHeader) {
      // Determine status badge based on cardStatus (prioritize cardStatus over verified flag)
      let statusBadge = '';
      const cardStatus = (archerData.cardStatus || '').toUpperCase();
      
      if (cardStatus === 'VER' || cardStatus === 'VERIFIED' || archerData.verified) {
        statusBadge = '<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-success-light text-success-dark">VER</span>';
      } else if (cardStatus === 'VOID') {
        statusBadge = '<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-danger-light text-danger-dark">VOID</span>';
      } else if (cardStatus === 'COMP' || cardStatus === 'COMPLETED') {
        statusBadge = '<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-primary-light text-primary-dark">COMP</span>';
      } else {
        statusBadge = '<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-warning-light text-warning-dark">PENDING</span>';
      }
      
      html += `
        <div class="scorecard-header mb-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h2 class="text-2xl font-bold text-gray-800 dark:text-white">${archerData.firstName} ${archerData.lastName}</h2>
              <div class="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300 mt-1">
                ${archerData.school ? `<span>${archerData.school}</span>` : ''}
                ${archerData.level ? `<span>${archerData.level}</span>` : ''}
                ${archerData.gender ? `<span>${archerData.gender}</span>` : ''}
                ${archerData.targetAssignment ? `<span>Target ${archerData.targetAssignment}</span>` : ''}
              </div>
            </div>
            ${showStatus ? `<div class="text-right">${statusBadge}</div>` : ''}
          </div>
          ${roundData.eventName ? `<div class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">${roundData.eventName}</div>` : ''}
          ${roundData.division ? `<div class="text-sm text-gray-600 dark:text-gray-400">${roundData.division} • ${roundData.roundType || 'Round'}</div>` : ''}
        </div>
      `;
    }
    
    // Scorecard table - EXACTLY matching test-components.html template
    html += `
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm bg-white dark:bg-gray-700">
          <thead class="bg-primary dark:bg-primary-dark text-white">
            <tr>
              <th class="px-2 py-2 text-center font-bold w-12">E</th>
              <th class="px-2 py-2 text-center font-bold w-12">A1</th>
              <th class="px-2 py-2 text-center font-bold w-12">A2</th>
              <th class="px-2 py-2 text-center font-bold w-12">A3</th>
              <th class="px-2 py-2 text-center font-bold w-14">END</th>
              <th class="px-2 py-2 text-center font-bold w-14">RUN</th>
              <th class="px-2 py-2 text-center font-bold w-12">AVG</th>
            </tr>
          </thead>
          <tbody>
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
      const endAvg = isComplete ? (endTotal / 3).toFixed(1) : '';
      let avgClass = '';
      if (endAvg) {
        const avgNum = parseFloat(endAvg);
        if (avgNum >= 9) avgClass = 'bg-score-gold text-black dark:text-black';
        else if (avgNum >= 7) avgClass = 'bg-score-red text-white dark:text-white';
        else if (avgNum >= 5) avgClass = 'bg-score-blue text-white dark:text-white';
        else if (avgNum >= 3) avgClass = 'bg-score-black text-white dark:text-white';
        else avgClass = 'bg-score-white text-black dark:text-black';
      }
      
      // Alternate row colors - EXACTLY matching test-components.html
      const rowClass = i % 2 === 0 
        ? 'border-b border-gray-200 dark:border-gray-600' 
        : 'border-b border-gray-200 bg-gray-50 dark:bg-gray-800';
      
      html += `
        <tr class="${rowClass}">
          <td class="px-2 py-1 text-center font-semibold dark:text-white">${endNum}</td>
          <td class="px-2 py-1 text-center ${getScoreColor(endScores[0])} font-bold">${endScores[0] || ''}</td>
          <td class="px-2 py-1 text-center ${getScoreColor(endScores[1])} font-bold">${endScores[1] || ''}</td>
          <td class="px-2 py-1 text-center ${getScoreColor(endScores[2])} font-bold">${endScores[2] || ''}</td>
          <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold">${isComplete ? endTotal : ''}</td>
          <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white">${isComplete ? runningTotal : ''}</td>
          <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white ${avgClass} font-bold">${endAvg}</td>
        </tr>
      `;
    }
    
    html += '</tbody>';
    
    // Footer with totals - EXACTLY matching test-components.html
    if (showFooter) {
      const completedEnds = scores.filter(end => end.every(s => s !== '' && s !== null && s !== undefined)).length;
      const finalAvg = completedEnds > 0 ? (runningTotal / (completedEnds * 3)).toFixed(1) : '';
      let finalAvgClass = '';
      if (finalAvg) {
        const avgNum = parseFloat(finalAvg);
        if (avgNum >= 9) finalAvgClass = 'bg-score-gold text-black dark:text-black';
        else if (avgNum >= 7) finalAvgClass = 'bg-score-red text-white dark:text-white';
        else if (avgNum >= 5) finalAvgClass = 'bg-score-blue text-white dark:text-white';
        else if (avgNum >= 3) finalAvgClass = 'bg-score-black text-white dark:text-white';
        else finalAvgClass = 'bg-score-white text-black dark:text-black';
      }
      
      html += `
        <tfoot class="bg-gray-200 dark:bg-gray-600">
          <tr>
            <td colspan="4" class="px-2 py-2 text-right font-bold dark:text-white">Round Totals:</td>
            <td class="px-2 py-2 text-center font-bold dark:text-white">${runningTotal}</td>
            <td class="px-2 py-2 text-center font-bold dark:text-white">${runningTotal}</td>
            <td class="px-2 py-2 text-center font-bold ${finalAvgClass}">${finalAvg > 0 ? finalAvg : ''}</td>
          </tr>
        </tfoot>
      `;
    }
    
    html += `
        </table>
      </div>
    `;
    
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

  /**
   * Render a table for multiple archers (used in scoring views)
   * 
   * @param {Array} archerList - Array of archer objects with scores
   * @param {Object} roundData - Round configuration (totalEnds, currentEnd, arrowsPerEnd)
   * @param {Object} options - Rendering options (editable, showSyncColumn, etc.)
   * @returns {string} HTML string for the archer table
   */
  function renderArcherTable(archerList = [], roundData = {}, options = {}) {
    const {
      totalEnds = 10,
      currentEnd = 1,
      arrowsPerEnd = 3
    } = roundData || {};

    const {
      editable = false,
      showSyncColumn = false,
      showCardButton = false,
      cardButtonLabel = 'Card',
      getRowLabel = (archer) => {
        const target = archer.targetAssignment ? ` (${archer.targetAssignment})` : '';
        return `${archer.firstName || ''} ${archer.lastName || ''}${target}`.trim();
      },
      getInputAttrs = () => '',
      getSyncIcon = () => '',
      getCardButton = () => '',
      limitRunningTotalToCurrentEnd = false
    } = options || {};

    let html = `
      <table class="score-table">
        <thead>
          <tr>
            <th>Archer</th>
            ${Array.from({ length: arrowsPerEnd }).map((_, idx) => `<th>A${idx + 1}</th>`).join('')}
            <th>10s</th>
            <th>Xs</th>
            <th>End</th>
            <th>Run</th>
            <th>Avg</th>
            ${showSyncColumn ? '<th style="width:30px;">⟳</th>' : ''}
            ${showCardButton ? `<th>${cardButtonLabel}</th>` : ''}
          </tr>
        </thead>
        <tbody>
    `;

    archerList.forEach(archer => {
      const archerScores = Array.isArray(archer.scores) ? archer.scores : [];
      const endIndex = Math.max(0, Math.min(totalEnds - 1, currentEnd - 1));
      const endScores = Array.isArray(archerScores[endIndex]) ? archerScores[endIndex] : Array(arrowsPerEnd).fill('');
      let endTotal = 0;
      let endTens = 0;
      let endXs = 0;
      let isComplete = endScores.every(s => s !== '' && s !== null && s !== undefined);

      endScores.forEach(scoreValue => {
        const value = parseScoreValue(scoreValue);
        endTotal += value;
        if (String(scoreValue).toUpperCase() === 'X') {
          endXs++;
          endTens++;
        } else if (value === 10) {
          endTens++;
        }
      });

      let runningTotal = 0;
      archerScores.forEach((end, idx) => {
        if (limitRunningTotalToCurrentEnd && idx > endIndex) return;
        if (Array.isArray(end)) {
          end.forEach(scoreValue => {
            if (scoreValue !== null && scoreValue !== '') {
              runningTotal += parseScoreValue(scoreValue);
            }
          });
        }
      });

      const arrowsInEnd = endScores.filter(s => s !== '' && s !== null && s !== undefined).length;
      const avgValue = arrowsInEnd > 0 ? (endTotal / arrowsInEnd).toFixed(1) : '';
      let avgClass = '';
      if (avgValue) {
        const avgNum = parseFloat(avgValue);
        if (avgNum >= 9) avgClass = 'score-gold';
        else if (avgNum >= 7) avgClass = 'score-red';
        else if (avgNum >= 5) avgClass = 'score-blue';
        else if (avgNum >= 3) avgClass = 'score-black';
        else avgClass = 'score-white';
      }

      html += `<tr data-archer-id="${archer.id || ''}">
        <td>${getRowLabel(archer)}</td>`;

      for (let arrowIdx = 0; arrowIdx < arrowsPerEnd; arrowIdx++) {
        const scoreValue = endScores[arrowIdx] || '';
        const colorClass = getScoreColor(scoreValue);
        if (editable) {
          const attrs = getInputAttrs(archer, endIndex, arrowIdx) || '';
          html += `<td class="score-cell ${colorClass}"><input type="text" class="score-input" value="${scoreValue || ''}" ${attrs}></td>`;
        } else {
          html += `<td class="score-cell ${colorClass}">${scoreValue || ''}</td>`;
        }
      }

      html += `
        <td class="calculated-cell">${isComplete ? (endTens + endXs) : ''}</td>
        <td class="calculated-cell">${isComplete ? endXs : ''}</td>
        <td class="calculated-cell">${isComplete ? endTotal : ''}</td>
        <td class="calculated-cell">${isComplete ? runningTotal : ''}</td>
        <td class="calculated-cell ${avgClass}">${avgValue}</td>
      `;

      if (showSyncColumn) {
        html += `<td class="sync-status-indicator">${getSyncIcon(archer, { currentEnd }) || ''}</td>`;
      }

      if (showCardButton) {
        html += `<td>${getCardButton(archer) || ''}</td>`;
      }

      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // Public API
  return {
    renderScorecard,
    renderArcherTable,
    showScorecardModal,
    parseScoreValue,
    getScoreColor
  };
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScorecardView;
}
