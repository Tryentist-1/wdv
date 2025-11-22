/**
 * Unified Scorecard List Component
 * 
 * Provides a consistent, compact 2-line grid layout for displaying scorecard lists
 * across all parts of the application. Replaces fragmented implementations in
 * results.html, archer_history.html, coach console, etc.
 * 
 * Usage:
 *   const listHTML = UnifiedScorecardList.render(data, options);
 *   const container = UnifiedScorecardList.create(data, options);
 */

const UnifiedScorecardList = (() => {

  /**
   * Render status text (no pill styling)
   */
  function renderStatusText(status) {
    if (status === 'VER' || status === 'VERIFIED') return 'VER';
    if (status === 'VOID') return 'VOID';
    if (status === 'LOCKED' || status === 'LOCK') return 'LOCK';
    if (status === 'PENDING' || status === 'PEND') return 'PEND';
    return 'COMP';
  }

  /**
   * Format event details line
   */
  function formatEventDetails(item) {
    const parts = [];
    
    // Date
    if (item.date || item.event_date || item.eventDate) {
      const date = new Date(item.date || item.event_date || item.eventDate);
      if (!isNaN(date.getTime())) {
        parts.push(date.toLocaleDateString('en-US', { 
          month: 'short', day: 'numeric', year: '2-digit' 
        }));
      }
    }
    
    // Round type
    if (item.round_type || item.roundType) {
      parts.push(item.round_type || item.roundType);
    } else {
      parts.push('R300');
    }
    
    // Division
    if (item.division) {
      const divisionNames = {
        'BVAR': 'Boys Varsity', 'GVAR': 'Girls Varsity', 
        'BJV': 'Boys JV', 'GJV': 'Girls JV'
      };
      parts.push(divisionNames[item.division] || item.division);
    }
    
    // Bale/Target
    if (item.bale_number || item.bale || item.baleNumber) {
      const bale = item.bale_number || item.bale || item.baleNumber;
      const target = item.target_assignment || item.target || item.targetAssignment || '';
      parts.push(`Bale ${bale}${target ? ' ' + target : ''}`);
    }
    
    return parts.join(' • ');
  }

  /**
   * Create the unified scorecard list container with header
   */
  function create(items = [], options = {}) {
    const {
      columns = ['Event', 'Status', 'Total', 'Avg', 'Xs', '10s'],
      showRank = false,
      onItemClick = null,
      className = 'scorecard-list-container'
    } = options;

    const container = document.createElement('div');
    container.className = className;

    // Create header
    const header = document.createElement('div');
    header.className = 'scorecard-list-header';
    
    if (showRank) {
      header.innerHTML = `<div>Rank</div>` + columns.map(col => `<div>${col}</div>`).join('');
    } else {
      header.innerHTML = columns.map(col => `<div>${col}</div>`).join('');
    }
    
    container.appendChild(header);

    // Create items
    items.forEach((item, index) => {
      const listItem = createItem(item, index, options);
      container.appendChild(listItem);
    });

    return container;
  }

  /**
   * Create individual scorecard list item
   */
  function createItem(item, index, options = {}) {
    const {
      showRank = false,
      onItemClick = null,
      getEventName = (item) => item.event_name || item.eventName || item.name || 'Unknown Event',
      getTotal = (item) => item.final_score || item.totalScore || item.total || 0,
      getAvg = (item) => {
        const total = getTotal(item);
        const ends = item.ends_completed || item.endsCompleted || 10;
        return ends > 0 ? (total / (ends * 3)).toFixed(1) : '0.0';
      },
      getXs = (item) => item.total_xs || item.xs || 0,
      getTens = (item) => item.total_tens || item.tens || 0,
      getStatus = (item) => item.card_status || item.cardStatus || item.status || 'COMP'
    } = options;

    const listItem = document.createElement('div');
    listItem.className = 'scorecard-list-item';
    
    if (onItemClick) {
      listItem.style.cursor = 'pointer';
      listItem.onclick = () => onItemClick(item, index);
    }

    const eventName = getEventName(item);
    const eventDetails = formatEventDetails(item);
    const statusText = renderStatusText(getStatus(item));
    const total = getTotal(item);
    const avg = getAvg(item);
    const xs = getXs(item);
    const tens = getTens(item);

    let innerHTML = '';

    if (showRank) {
      const rank = index + 1;
      const rankColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-orange-600' : 'text-gray-600';
      const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      
      innerHTML = `
        <div class="scorecard-stat-value ${rankColor}">${rankIcon}</div>
        <div class="scorecard-event-info">
          <div class="scorecard-event-name">${eventName}</div>
          <div class="scorecard-event-details">${eventDetails}</div>
        </div>
        <div class="scorecard-stat-value">${statusText}</div>
        <div class="scorecard-stat-value total">${total}</div>
        <div class="scorecard-stat-value">${avg}</div>
        <div class="scorecard-stat-value">${xs}</div>
        <div class="scorecard-stat-value">${tens}</div>
      `;
    } else {
      innerHTML = `
        <div class="scorecard-event-info">
          <div class="scorecard-event-name">${eventName}</div>
          <div class="scorecard-event-details">${eventDetails}</div>
        </div>
        <div class="scorecard-stat-value">${statusText}</div>
        <div class="scorecard-stat-value total">${total}</div>
        <div class="scorecard-stat-value">${avg}</div>
        <div class="scorecard-stat-value">${xs}</div>
        <div class="scorecard-stat-value">${tens}</div>
      `;
    }

    listItem.innerHTML = innerHTML;
    return listItem;
  }

  /**
   * Render as HTML string (for cases where you need to set innerHTML)
   */
  function render(items = [], options = {}) {
    const container = create(items, options);
    return container.outerHTML;
  }

  /**
   * Update existing container with new data
   */
  function update(container, items = [], options = {}) {
    // Remove existing items (keep header)
    const header = container.querySelector('.scorecard-list-header');
    container.innerHTML = '';
    if (header) {
      container.appendChild(header);
    }

    // Add new items
    items.forEach((item, index) => {
      const listItem = createItem(item, index, options);
      container.appendChild(listItem);
    });
  }

  // Public API
  return {
    create,
    render,
    update,
    createItem,
    renderStatusText,
    formatEventDetails
  };
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedScorecardList;
}
