/**
 * Reusable Solo Match View Component
 * 
 * This module provides a reusable component for displaying solo match scorecards in modals.
 * Similar to ScorecardView but designed for 1v1 Olympic format matches.
 * 
 * Usage:
 *   const matchHTML = SoloMatchView.renderMatchCard(matchData, options);
 *   const modalElement = SoloMatchView.showMatchModal(matchData, options);
 */

const SoloMatchView = (() => {

  /**
   * Parse score value to number (X=10, M=0, others as-is)
   * Uses global parseScoreValue from common.js if available, otherwise provides fallback
   */
  function parseScoreValueLocal(score) {
    // Use global function if available (from common.js)
    if (typeof window !== 'undefined' && typeof window.parseScoreValue === 'function') {
      return window.parseScoreValue(score);
    }
    // Fallback implementation
    if (score === null || score === '' || score === undefined) return 0;
    const upper = String(score).toUpperCase();
    if (upper === 'X') return 10;
    if (upper === 'M') return 0;
    const num = parseInt(score, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Get CSS class for score value (for coloring cells)
   * Uses global getScoreColor from common.js if available, otherwise provides fallback
   */
  function getScoreColorLocal(score) {
    // Use global function if available (from common.js)
    if (typeof window !== 'undefined' && typeof window.getScoreColor === 'function') {
      return window.getScoreColor(score);
    }
    // Fallback implementation
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
   * Calculate set total from array of scores
   */
  function calculateSetTotal(scores) {
    if (!Array.isArray(scores)) return 0;
    return scores.reduce((total, score) => total + parseScoreValueLocal(score), 0);
  }

  /**
   * Calculate set points (2 for winner, 1 for tie, 0 for loser)
   */
  function calculateSetPoints(set1Total, set2Total) {
    if (set1Total > set2Total) return { a1: 2, a2: 0 };
    if (set2Total > set1Total) return { a1: 0, a2: 2 };
    return { a1: 1, a2: 1 }; // Tie
  }

  /**
   * Format match score (e.g., "3-2")
   */
  function formatMatchScore(setsWonA1, setsWonA2) {
    return `${setsWonA1}-${setsWonA2}`;
  }

  /**
   * Render a solo match scorecard
   * 
   * @param {Object} matchData - Match data from API
   * @param {Object} options - Display options
   * @returns {string} HTML string for the match card
   */
  function renderMatchCard(matchData, options = {}) {
    const {
      showHeader = true,
      showFooter = true,
      showStatus = true,
      showRemakeButton = false
    } = options;

    // Extract archers
    const archer1 = matchData.archers?.find(a => a.position === 1) || {};
    const archer2 = matchData.archers?.find(a => a.position === 2) || {};

    const a1Name = archer1.archer_name || `${archer1.first_name || ''} ${archer1.last_name || ''}`.trim() || 'Archer 1';
    const a2Name = archer2.archer_name || `${archer2.first_name || ''} ${archer2.last_name || ''}`.trim() || 'Archer 2';

    // Get sets for each archer
    const sets1 = archer1.sets || [];
    const sets2 = archer2.sets || [];

    // Organize sets by set_number
    const setsByNumber = {};
    for (let i = 1; i <= 5; i++) {
      setsByNumber[i] = {
        a1: sets1.find(s => s.set_number === i) || null,
        a2: sets2.find(s => s.set_number === i) || null
      };
    }

    // Check for shoot-off (set_number 6)
    const shootOff1 = sets1.find(s => s.set_number === 6) || null;
    const shootOff2 = sets2.find(s => s.set_number === 6) || null;
    const hasShootOff = shootOff1 || shootOff2;

    // Calculate match totals
    let setsWonA1 = 0;
    let setsWonA2 = 0;
    let totalScoreA1 = 0;
    let totalScoreA2 = 0;

    for (let i = 1; i <= 5; i++) {
      const set1 = setsByNumber[i].a1;
      const set2 = setsByNumber[i].a2;

      if (set1 && set2) {
        // Stop accumulating if match is already decided (either archer reached 6)
        if (setsWonA1 >= 6 || setsWonA2 >= 6) continue;
        const set1Total = set1.set_total || calculateSetTotal([set1.a1 || set1.arrow1, set1.a2 || set1.arrow2, set1.a3 || set1.arrow3]);
        const set2Total = set2.set_total || calculateSetTotal([set2.a1 || set2.arrow1, set2.a2 || set2.arrow2, set2.a3 || set2.arrow3]);

        totalScoreA1 += set1Total;
        totalScoreA2 += set2Total;

        const points = calculateSetPoints(set1Total, set2Total);
        setsWonA1 += points.a1;
        setsWonA2 += points.a2;
      }
    }

    // Format date
    const matchDate = matchData.date ? new Date(matchData.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) : 'Unknown Date';

    // Status badge
    const status = matchData.card_status || matchData.status || 'PENDING';
    const statusClass = status === 'VERIFIED' || status === 'VER'
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : status === 'VOID'
        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        : status === 'COMPLETED' || status === 'COMP'
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';

    const statusText = status === 'VERIFIED' || status === 'VER' ? 'VER'
      : status === 'VOID' ? 'VOID'
        : status === 'COMPLETED' || status === 'COMP' ? 'COMP'
          : 'PEND';

    let html = '';

    // Header
    if (showHeader) {
      html += `
        <div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Solo Match</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${matchData.event_name || 'Solo Match'} • ${matchDate}</p>
            </div>
            ${showStatus ? `<span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">${statusText}</span>` : ''}
          </div>
          <div class="flex items-center gap-4 mt-3">
            <div class="flex-1">
              <p class="text-sm font-semibold text-blue-600 dark:text-blue-400">${a1Name}</p>
              <p class="text-xs text-gray-600 dark:text-gray-400">${archer1.school || ''}</p>
            </div>
            <span class="text-gray-600 dark:text-gray-400 font-bold">vs</span>
            <div class="flex-1 text-right">
              <p class="text-sm font-semibold text-red-600 dark:text-red-400">${a2Name}</p>
              <p class="text-xs text-gray-600 dark:text-gray-400">${archer2.school || ''}</p>
            </div>
          </div>
        </div>
      `;
    }

    // Match table
    html += `
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm bg-white dark:bg-gray-700">
          <thead class="bg-primary dark:bg-primary-dark text-white sticky top-0">
            <tr>
              <th rowspan="2" class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">Set</th>
              <th colspan="3" class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">${a1Name}</th>
              <th colspan="3" class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">${a2Name}</th>
              <th colspan="2" class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">Set Total</th>
              <th colspan="2" class="px-2 py-2 text-center font-bold text-white">Set Points</th>
            </tr>
            <tr>
              <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A1</th>
              <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A2</th>
              <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A3</th>
              <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A1</th>
              <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A2</th>
              <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A3</th>
              <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A1</th>
              <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A2</th>
              <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A1</th>
              <th class="px-2 py-2 text-center font-bold text-white">A2</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Render 5 sets
    for (let i = 1; i <= 5; i++) {
      const set1 = setsByNumber[i].a1;
      const set2 = setsByNumber[i].a2;

      const a1Scores = set1 ? [
        set1.a1 || set1.arrow1 || '',
        set1.a2 || set1.arrow2 || '',
        set1.a3 || set1.arrow3 || ''
      ] : ['', '', ''];

      const a2Scores = set2 ? [
        set2.a1 || set2.arrow1 || '',
        set2.a2 || set2.arrow2 || '',
        set2.a3 || set2.arrow3 || ''
      ] : ['', '', ''];

      const set1Total = set1 ? (set1.set_total || calculateSetTotal(a1Scores)) : 0;
      const set2Total = set2 ? (set2.set_total || calculateSetTotal(a2Scores)) : 0;
      const points = (set1 || set2) ? calculateSetPoints(set1Total, set2Total) : { a1: 0, a2: 0 };

      const rowBgClass = i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700';

      html += `
        <tr class="border-b border-gray-200 dark:border-gray-600 ${rowBgClass}">
          <td class="px-2 py-2 text-center font-semibold bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600">${i}</td>
          <td class="px-2 py-2 text-center font-bold ${getScoreColorLocal(a1Scores[0])} border-r border-gray-200 dark:border-gray-600">${a1Scores[0] || ''}</td>
          <td class="px-2 py-2 text-center font-bold ${getScoreColorLocal(a1Scores[1])} border-r border-gray-200 dark:border-gray-600">${a1Scores[1] || ''}</td>
          <td class="px-2 py-2 text-center font-bold ${getScoreColorLocal(a1Scores[2])} border-r border-gray-200 dark:border-gray-600">${a1Scores[2] || ''}</td>
          <td class="px-2 py-2 text-center font-bold ${getScoreColorLocal(a2Scores[0])} border-r border-gray-200 dark:border-gray-600">${a2Scores[0] || ''}</td>
          <td class="px-2 py-2 text-center font-bold ${getScoreColorLocal(a2Scores[1])} border-r border-gray-200 dark:border-gray-600">${a2Scores[1] || ''}</td>
          <td class="px-2 py-2 text-center font-bold ${getScoreColorLocal(a2Scores[2])} border-r border-gray-200 dark:border-gray-600">${a2Scores[2] || ''}</td>
          <td class="px-2 py-2 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600">${set1Total > 0 ? set1Total : ''}</td>
          <td class="px-2 py-2 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600">${set2Total > 0 ? set2Total : ''}</td>
          <td class="px-2 py-2 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600">${points.a1 > 0 ? points.a1 : ''}</td>
          <td class="px-2 py-2 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold">${points.a2 > 0 ? points.a2 : ''}</td>
        </tr>
      `;
    }

    // Shoot-off row (if exists)
    if (hasShootOff) {
      const so1Score = shootOff1 ? (shootOff1.arrow1 || '') : '';
      const so2Score = shootOff2 ? (shootOff2.arrow1 || '') : '';
      const so1Total = shootOff1 ? (shootOff1.set_total || parseScoreValueLocal(so1Score)) : 0;
      const so2Total = shootOff2 ? (shootOff2.set_total || parseScoreValueLocal(so2Score)) : 0;

      html += `
        <tr class="border-b border-gray-200 dark:border-gray-600 bg-yellow-50 dark:bg-yellow-900/20">
          <td class="px-2 py-2 text-center font-semibold bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600">S.O.</td>
          <td colspan="2" class="px-2 py-2 text-center font-bold ${getScoreColorLocal(so1Score)} border-r border-gray-200 dark:border-gray-600">${so1Score || ''}</td>
          <td class="px-2 py-2 border-r border-gray-200 dark:border-gray-600"></td>
          <td colspan="2" class="px-2 py-2 text-center font-bold ${getScoreColorLocal(so2Score)} border-r border-gray-200 dark:border-gray-600">${so2Score || ''}</td>
          <td class="px-2 py-2 border-r border-gray-200 dark:border-gray-600"></td>
          <td class="px-2 py-2 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600">${so1Total > 0 ? so1Total : ''}</td>
          <td class="px-2 py-2 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600">${so2Total > 0 ? so2Total : ''}</td>
          <td colspan="2" class="px-2 py-2 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold">
            ${so1Total > so2Total ? 'A1 Wins' : so2Total > so1Total ? 'A2 Wins' : 'Tie'}
          </td>
        </tr>
      `;
    }

    html += `
          </tbody>
          <tfoot class="bg-gray-200 dark:bg-gray-600">
            <tr>
              <td colspan="7" class="px-2 py-2 text-right font-bold dark:text-white">Match Score:</td>
              <td class="px-2 py-2 text-center font-bold dark:text-white">${setsWonA1}</td>
              <td class="px-2 py-2 text-center font-bold dark:text-white">${setsWonA2}</td>
              <td colspan="2" class="px-2 py-2 text-center font-bold dark:text-white">${formatMatchScore(setsWonA1, setsWonA2)}</td>
            </tr>
            <tr>
              <td colspan="7" class="px-2 py-2 text-right font-bold dark:text-white">Total Score:</td>
              <td class="px-2 py-2 text-center font-bold dark:text-white">${totalScoreA1}</td>
              <td class="px-2 py-2 text-center font-bold dark:text-white">${totalScoreA2}</td>
              <td colspan="2" class="px-2 py-2 text-center font-bold dark:text-white">
                ${setsWonA1 > setsWonA2 ? '🏆 ' + a1Name + ' Wins' : setsWonA2 > setsWonA1 ? '🏆 ' + a2Name + ' Wins' : 'Tie'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // Footer removed - handled in modal footer for better control

    return html;
  }

  /**
   * Check if current user is a coach
   */
  function isCoach() {
    // Helper to get cookie value
    function getCookie(name) {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    }

    return !!(
      localStorage.getItem('coach_passcode') ||
      localStorage.getItem('coach_api_key') ||
      getCookie('coach_auth')
    );
  }

  /**
   * Show a solo match in a modal
   * 
   * @param {Object} matchData - Match data from API
   * @param {Object} options - Display options + modal options (onClose, onRemake, editUrl callbacks)
   * @returns {HTMLElement} The modal element
   */
  function showMatchModal(matchData, options = {}) {
    const { onClose, onRemake, editUrl, ...matchOptions } = options;

    // Check if user is coach
    const userIsCoach = isCoach();

    // Create modal if it doesn't exist
    let modal = document.getElementById('solo-match-view-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'solo-match-view-modal';
      modal.className = 'fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black bg-opacity-50';
      modal.style.display = 'none';
      document.body.appendChild(modal);
    }

    const matchHTML = renderMatchCard(matchData, { ...matchOptions, showRemakeButton: !!onRemake });

    // Build footer with Edit and Remake buttons
    let footerHTML = '';
    if (userIsCoach && editUrl) {
      footerHTML = `
        <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <a href="${editUrl}" class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded font-semibold transition-colors min-h-[44px] flex items-center gap-2">
            <i class="fas fa-edit"></i>
            <span>Edit</span>
          </a>
          ${onRemake ? `
          <button id="remake-match-btn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px]">
            Remake Match
          </button>
          ` : ''}
          <button class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[44px]">
            Close
          </button>
        </div>
      `;
    } else if (onRemake) {
      footerHTML = `
        <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button id="remake-match-btn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px]">
            Remake Match
          </button>
          <button class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[44px]">
            Close
          </button>
        </div>
      `;
    } else {
      footerHTML = `
        <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[44px]">
            Close
          </button>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto relative p-6">
        <button class="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full text-2xl font-bold transition-colors z-10">&times;</button>
        <div class="mt-8">
          ${matchHTML}
        </div>
        ${footerHTML}
      </div>
    `;

    // Close button handlers (X button and footer Close button)
    const closeButtons = modal.querySelectorAll('button:not(#remake-match-btn)');
    closeButtons.forEach(btn => {
      btn.onclick = () => {
        modal.style.display = 'none';
        if (onClose) onClose();
      };
    });

    // Remake button handler (if exists)
    const remakeBtn = modal.querySelector('#remake-match-btn');
    if (remakeBtn && onRemake) {
      remakeBtn.onclick = () => {
        modal.style.display = 'none';
        if (onClose) onClose();
        onRemake();
      };
    }

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
    renderMatchCard,
    showMatchModal,
    parseScoreValue: parseScoreValueLocal,
    getScoreColor: getScoreColorLocal,
    calculateSetTotal,
    calculateSetPoints,
    formatMatchScore
  };
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoloMatchView;
}

