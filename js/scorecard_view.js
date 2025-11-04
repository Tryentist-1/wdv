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
        ? '<span class="status-badge status-verified">✓ Verified</span>'
        : archerData.completed
        ? '<span class="status-badge status-completed">Completed</span>'
        : '<span class="status-badge status-in-progress">In Progress</span>';
      
      html += `
        <div class="scorecard-header">
          <div class="archer-info">
            <h3>${archerData.firstName} ${archerData.lastName}</h3>
            <div class="archer-details">
              ${archerData.school ? `<span>${archerData.school}</span>` : ''}
              ${archerData.level ? `<span>${archerData.level}</span>` : ''}
              ${archerData.gender ? `<span>${archerData.gender === 'M' ? 'Boys' : 'Girls'}</span>` : ''}
            </div>
            ${roundData.eventName ? `<div class="event-name">${roundData.eventName}</div>` : ''}
            ${roundData.division ? `<div class="division-name">${roundData.division}</div>` : ''}
          </div>
          ${showStatus ? statusBadge : ''}
        </div>
      `;
    }
    
    // Scorecard table
    html += `
      <table class="score-table scorecard-table">
        <thead>
          <tr>
            <th>E</th>
            <th>A1</th>
            <th>A2</th>
            <th>A3</th>
            <th>10s</th>
            <th>Xs</th>
            <th>END</th>
            <th>RUN</th>
            <th>AVG</th>
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
        <tr>
          <td>${endNum}</td>
          ${endScores.map(s => `<td class="score-cell ${getScoreColor(s)}">${s || ''}</td>`).join('')}
          <td class="calculated-cell">${isComplete ? (endTens + endXs) : ''}</td>
          <td class="calculated-cell">${isComplete ? endXs : ''}</td>
          <td class="calculated-cell">${isComplete ? endTotal : ''}</td>
          <td class="calculated-cell">${isComplete ? runningTotal : ''}</td>
          <td class="calculated-cell score-cell ${avgClass}">${avg}</td>
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
        <tfoot>
          <tr>
            <td colspan="4" style="text-align: right; font-weight: bold;">Round Totals:</td>
            <td class="calculated-cell">${totalTensOverall + totalXsOverall}</td>
            <td class="calculated-cell">${totalXsOverall}</td>
            <td class="calculated-cell"></td>
            <td class="calculated-cell">${runningTotal}</td>
            <td class="calculated-cell score-cell ${finalAvgClass}">${finalAvg > 0 ? finalAvg : ''}</td>
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
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('scorecard-view-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'scorecard-view-modal';
      modal.className = 'modal';
      modal.style.display = 'none';
      document.body.appendChild(modal);
    }
    
    const scorecardHTML = renderScorecard(archerData, roundData, scorecardOptions);
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto; position: relative;">
        <button class="modal-close-btn" style="position: sticky; top: 0; right: 0; float: right; background: #e74c3c; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; font-size: 1.25rem; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 1000; margin-bottom: 1rem;">&times;</button>
        ${scorecardHTML}
      </div>
    `;
    
    const closeBtn = modal.querySelector('.modal-close-btn');
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

