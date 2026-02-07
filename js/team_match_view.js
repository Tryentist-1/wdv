/**
 * Reusable Team Match View Component
 * 
 * This module provides a reusable component for displaying team match scorecards in modals.
 * Designed for Olympic Team format (3 archers per team, cumulative scoring).
 * 
 * Usage:
 *   const matchHTML = TeamMatchView.renderMatchCard(matchData, options);
 *   const modalElement = TeamMatchView.showMatchModal(matchData, options);
 */

const TeamMatchView = (() => {
  
  /**
   * Parse score value to number (X=10, M=0, others as-is)
   */
  function parseScoreValueLocal(score) {
    if (typeof window !== 'undefined' && typeof window.parseScoreValue === 'function') {
      return window.parseScoreValue(score);
    }
    if (score === null || score === '' || score === undefined) return 0;
    const upper = String(score).toUpperCase();
    if (upper === 'X') return 10;
    if (upper === 'M') return 0;
    const num = parseInt(score, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Get CSS class for score value
   */
  function getScoreColorLocal(score) {
    if (typeof window !== 'undefined' && typeof window.getScoreColor === 'function') {
      return window.getScoreColor(score);
    }
    if (score === null || score === '' || score === undefined) return '';
    const upper = String(score).toUpperCase();
    if (upper === 'X' || upper === '10' || upper === '9') return 'bg-score-gold text-black';
    if (upper === '8' || upper === '7') return 'bg-score-red text-white';
    if (upper === '6' || upper === '5') return 'bg-score-blue text-white';
    if (upper === '4' || upper === '3') return 'bg-score-black text-white';
    if (upper === '2' || upper === '1') return 'bg-score-white text-black border border-gray-300';
    if (upper === 'M') return 'bg-white text-gray-500 border border-gray-300';
    return '';
  }

  /**
   * Calculate set total form array of scores
   */
  function calculateSetTotal(scores) {
    if (!Array.isArray(scores)) return 0;
    return scores.reduce((total, score) => total + parseScoreValueLocal(score), 0);
  }

  /**
   * Calculate set points (2 for winner, 1 for tie, 0 for loser)
   */
  function calculateSetPoints(set1Total, set2Total) {
    if (set1Total > set2Total) return { t1: 2, t2: 0 };
    if (set2Total > set1Total) return { t1: 0, t2: 2 };
    return { t1: 1, t2: 1 };
  }

  /**
   * Format match score
   */
  function formatMatchScore(setsWonT1, setsWonT2) {
    return `${setsWonT1}-${setsWonT2}`;
  }

  /**
   * Render a team match scorecard
   */
  function renderMatchCard(matchData, options = {}) {
    // Basic data normalization
    // Expect matchData to container teams array [ {name, archers:[], sets:[]}, {name, archers:[], sets:[]} ]
    // Or distinct t1/t2 properties
    
    // Fallback if data structure varies
    const team1 = matchData.teams ? matchData.teams[0] : (matchData.team1 || {});
    const team2 = matchData.teams ? matchData.teams[1] : (matchData.team2 || {});
    
    const t1Name = team1.team_name || team1.name || matchData.team1_name || 'Team 1';
    const t2Name = team2.team_name || team2.name || matchData.team2_name || 'Team 2';

    // Normalize sets
    // Assuming API returns sets array attached to team object, OR flat match sets
    // If flat sets matchData.sets[], we need to split them.
    // Let's try to handle a common format where teams have sets.
    
    // Construct simplified sets structure for rendering
    // We want 4 sets max for Team Round
    const sets = [];
    
    for (let i = 1; i <= 4; i++) {
        // Try to find set data in team objects
        // If team.sets is array of objects {set_number, arrows:[]} or similar
        const t1Set = (team1.sets || []).find(s => s.set_number === i) || { arrows: [] };
        const t2Set = (team2.sets || []).find(s => s.set_number === i) || { arrows: [] };
        
        // Arrows might be flat properties (arrow1..arrow6) or array
        let t1Arrows = t1Set.arrows || [];
        if (!t1Arrows.length && t1Set.arrow1 !== undefined) {
             t1Arrows = [t1Set.arrow1, t1Set.arrow2, t1Set.arrow3, t1Set.arrow4, t1Set.arrow5, t1Set.arrow6];
        }
        // Fill up to 6 arrows if missing
        while(t1Arrows.length < 6) t1Arrows.push('');
        
        let t2Arrows = t2Set.arrows || [];
        if (!t2Arrows.length && t2Set.arrow1 !== undefined) {
             t2Arrows = [t2Set.arrow1, t2Set.arrow2, t2Set.arrow3, t2Set.arrow4, t2Set.arrow5, t2Set.arrow6];
        }
        while(t2Arrows.length < 6) t2Arrows.push('');

        const t1Total = t1Set.set_total || calculateSetTotal(t1Arrows);
        const t2Total = t2Set.set_total || calculateSetTotal(t2Arrows);
        
        // Only count if data exists
        const hasData = t1Total > 0 || t2Total > 0 || t1Arrows.some(a=>a!=='') || t2Arrows.some(a=>a!=='');
        
        if (hasData || i === 1) { // Always show at least set 1
            const pts = calculateSetPoints(t1Total, t2Total);
            sets.push({
                setNum: i,
                t1Arrows,
                t2Arrows,
                t1Total,
                t2Total,
                t1Pts: pts.t1,
                t2Pts: pts.t2
            });
        }
    }

    // Determine Winner & Totals
    let t1Score = 0;
    let t2Score = 0;
    let t1TotalArrowScore = 0;
    let t2TotalArrowScore = 0;
    
    sets.forEach(s => {
        t1Score += s.t1Pts;
        t2Score += s.t2Pts;
        t1TotalArrowScore += s.t1Total;
        t2TotalArrowScore += s.t2Total;
    });

    const matchDate = matchData.date ? new Date(matchData.date).toLocaleDateString() : 'Unknown Date';
    const status = matchData.card_status || matchData.status || 'PENDING';
    
    const statusClass = status === 'VERIFIED' || status === 'VER' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : status === 'VOID' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      : status === 'COMPLETED' || status === 'COMP' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';

    let html = `
        <div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex justify-between items-start mb-2">
                <div>
                  <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Team Match</h2>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${matchData.event_name || 'Event'} • ${matchDate}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">${status}</span>
            </div>
            <div class="flex items-center gap-4 mt-3">
                <div class="flex-1 text-xl font-bold text-blue-600 dark:text-blue-400 text-center">${t1Name}</div>
                <div class="text-gray-400 font-bold">vs</div>
                <div class="flex-1 text-xl font-bold text-red-600 dark:text-red-400 text-center">${t2Name}</div>
            </div>
        </div>
        
        <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm bg-white dark:bg-gray-700">
                <thead class="bg-primary dark:bg-primary-dark text-white sticky top-0">
                    <tr>
                        <th rowspan="2" class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">Set</th>
                        <th colspan="6" class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">${t1Name}</th>
                        <th colspan="6" class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">${t2Name}</th>
                        <th colspan="2" class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">Total</th>
                        <th colspan="2" class="px-2 py-2 text-center font-bold">Pts</th>
                    </tr>
                    <tr>
                         <th colspan="6" class="px-1 py-1 text-center text-xs opacity-75 border-r border-gray-300 dark:border-gray-600">Arrows</th>
                         <th colspan="6" class="px-1 py-1 text-center text-xs opacity-75 border-r border-gray-300 dark:border-gray-600">Arrows</th>
                         <th class="px-1 py-1 text-center text-xs opacity-75 border-r border-gray-300 dark:border-gray-600">T1</th>
                         <th class="px-1 py-1 text-center text-xs opacity-75 border-r border-gray-300 dark:border-gray-600">T2</th>
                         <th class="px-1 py-1 text-center text-xs opacity-75 border-r border-gray-300 dark:border-gray-600">T1</th>
                         <th class="px-1 py-1 text-center text-xs opacity-75">T2</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sets.forEach((set, idx) => {
        const rowClass = idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700';
        html += `<tr class="border-b border-gray-200 dark:border-gray-600 ${rowClass}">
            <td class="px-2 py-2 text-center font-bold border-r border-gray-200 dark:border-gray-600">${set.setNum}</td>
            
            <!-- T1 Arrows -->
            ${set.t1Arrows.map(a => `<td class="px-1 py-1 text-center font-bold ${getScoreColorLocal(a)} w-8">${a}</td>`).join('')}
            <td class="border-r border-gray-200 dark:border-gray-600 w-0 p-0"></td>
            
            <!-- T2 Arrows -->
            ${set.t2Arrows.map(a => `<td class="px-1 py-1 text-center font-bold ${getScoreColorLocal(a)} w-8">${a}</td>`).join('')}
            <td class="border-r border-gray-200 dark:border-gray-600 w-0 p-0"></td>

            <td class="px-2 py-2 text-center font-bold bg-gray-100 dark:bg-gray-600 border-r border-gray-200 dark:border-gray-600">${set.t1Total}</td>
            <td class="px-2 py-2 text-center font-bold bg-gray-100 dark:bg-gray-600 border-r border-gray-200 dark:border-gray-600">${set.t2Total}</td>
            <td class="px-2 py-2 text-center font-bold">${set.t1Pts}</td>
            <td class="px-2 py-2 text-center font-bold">${set.t2Pts}</td>
        </tr>`;
    });
    
    html += `</tbody>
        <tfoot class="bg-gray-200 dark:bg-gray-600">
            <tr>
                <td colspan="15" class="px-3 py-2 text-right font-bold">Match Score:</td>
                <td class="px-2 py-2 text-center font-bold text-lg">${t1Score}</td>
                <td class="px-2 py-2 text-center font-bold text-lg">${t2Score}</td>
            </tr>
            <tr>
                <td colspan="17" class="px-3 py-2 text-center font-bold text-xl">
                    ${t1Score > t2Score ? `🏆 ${t1Name} Wins!` : t2Score > t1Score ? `🏆 ${t2Name} Wins!` : 'Tie / Shoot-off'}
                </td>
            </tr>
        </tfoot>
    </table></div>`;

    return html;
  }

  function showMatchModal(matchData, options = {}) {
      const { onClose, editUrl } = options;
      
      let modal = document.getElementById('team-match-view-modal');
      if (!modal) {
          modal = document.createElement('div');
          modal.id = 'team-match-view-modal';
          modal.className = 'fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black bg-opacity-50';
          modal.style.display = 'none';
          document.body.appendChild(modal);
      }
      
      const contentParams = {
          editUrl,
          onClose: () => {
              modal.style.display = 'none';
              if (onClose) onClose();
          }
      };
      
      const matchHTML = renderMatchCard(matchData);
      
      modal.innerHTML = `
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative p-6">
             <button class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-2xl" onclick="document.getElementById('team-match-view-modal').style.display='none'">&times;</button>
             <div class="mt-4">
                ${matchHTML}
             </div>
             <div class="mt-6 flex justify-end gap-3">
                <button class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600" onclick="document.getElementById('team-match-view-modal').style.display='none'">Close</button>
             </div>
        </div>
      `;
      
      modal.style.display = 'flex';
  }

  return {
      renderMatchCard,
      showMatchModal
  };

})();
